import pandas as pd
import numpy as np
from typing import Union, List
from pathlib import Path

# Flexible alias mappings to tolerate renamed or reordered CSV/Excel columns
COLUMN_ALIASES = {
    "date": ["date", "timestamp", "ts", "datetime", "time", "tx_date", "day"],
    "ingredient": ["ingredient", "item", "name", "reagent", "product", "ingredient_name", "item_name"],
    "qty": ["qty", "quantity", "amount", "sales", "volume", "units", "units_sold", "change_amount"],
    "type": ["type", "tx_type", "transaction_type", "movement_type", "action"]
}

def resolve_column(df_columns: List[str], target_key: str) -> str:
    """Finds matching column name in DataFrame regardless of case, underscores, or common aliases."""
    normalized = {col.lower().strip().replace(" ", "_"): col for col in df_columns}
    for alias in COLUMN_ALIASES[target_key]:
        if alias in normalized:
            return normalized[alias]
    return None

def load_and_clean(path: Union[str, Path]) -> pd.DataFrame:
    """
    Loads raw potion shop movement data from CSV or Excel and cleans it:
    1. Tolerates renamed or reordered columns via dynamic alias resolution.
    2. Strips whitespace and standardizes ingredient names.
    3. Parses diverse date/timestamp formats into YYYY-MM-DD.
    4. Filters to sales movements and converts negative delta values to positive sales.
    5. Deduplicates identical records.
    6. Fills all missing calendar days for every ingredient with 0 qty.
    
    Returns:
        pd.DataFrame with columns: ['date', 'ingredient', 'qty'] sorted by date and ingredient.
    """
    path_obj = Path(path)
    if not path_obj.exists():
        raise FileNotFoundError(f"File not found at: {path}")

    # 1. Load data
    if path_obj.suffix.lower() in [".xlsx", ".xls"]:
        df = pd.read_excel(path_obj)
    else:
        df = pd.read_csv(path_obj)

    # 2. Resolve dynamic column mappings
    date_col = resolve_column(df.columns, "date")
    item_col = resolve_column(df.columns, "ingredient")
    qty_col = resolve_column(df.columns, "qty")
    type_col = resolve_column(df.columns, "type")

    if not date_col or not item_col or not qty_col:
        raise ValueError(
            f"Unable to resolve required columns. Found: {list(df.columns)}. "
            f"Needs matches for: date ({COLUMN_ALIASES['date']}), "
            f"ingredient ({COLUMN_ALIASES['ingredient']}), "
            f"qty ({COLUMN_ALIASES['qty']})"
        )

    # 3. Clean and standardize types
    df = df.copy()
    
    # Clean ingredient names (strip spaces, title case)
    df["clean_ingredient"] = df[item_col].astype(str).str.strip().str.title()
    df = df[df["clean_ingredient"].str.lower() != "nan"]

    # Parse dates cleanly
    df["clean_date"] = pd.to_datetime(df[date_col], errors="coerce").dt.date
    df = df.dropna(subset=["clean_date"])

    # Clean numeric quantities (take absolute value for sales; handle string commas/signs)
    df["clean_qty"] = pd.to_numeric(
        df[qty_col].astype(str).str.replace(",", "").str.strip(), 
        errors="coerce"
    ).fillna(0.0)

    # Filter to sales only if a type column exists
    if type_col:
        df["clean_type"] = df[type_col].astype(str).str.strip().str.lower()
        # Accept 'sale', 'sales', 'out', 'dispense', or negative deltas
        is_sale = df["clean_type"].str.contains("sale|dispense|out|consume") | (df["clean_qty"] < 0)
        df = df[is_sale]
    
    # Sales quantities should be positive numbers representing consumed volume
    df["clean_qty"] = df["clean_qty"].abs()

    # 4. Remove duplicate identical transaction logs
    df = df.drop_duplicates(subset=["clean_date", "clean_ingredient", "clean_qty"])

    # 5. Aggregate daily totals per ingredient
    daily_sales = (
        df.groupby(["clean_date", "clean_ingredient"], as_index=False)["clean_qty"]
        .sum()
    )

    if daily_sales.empty:
        return pd.DataFrame(columns=["date", "ingredient", "qty"])

    # 6. Fill missing calendar days with 0 (Full Cartesian Product)
    min_date = daily_sales["clean_date"].min()
    max_date = daily_sales["clean_date"].max()
    all_dates = pd.date_range(min_date, max_date, freq="D").date
    all_ingredients = daily_sales["clean_ingredient"].unique()

    full_grid = pd.MultiIndex.from_product(
        [all_dates, all_ingredients], 
        names=["date", "ingredient"]
    ).to_frame().reset_index(drop=True)

    # Merge and fill missing dates with 0.0
    merged = pd.merge(
        full_grid, 
        daily_sales.rename(columns={"clean_date": "date", "clean_ingredient": "ingredient", "clean_qty": "qty"}),
        on=["date", "ingredient"], 
        how="left"
    )
    merged["qty"] = merged["qty"].fillna(0.0)

    # Return tidy, clean DataFrame
    clean_df = merged.sort_values(by=["date", "ingredient"]).reset_index(drop=True)
    return clean_df[["date", "ingredient", "qty"]]


# Quick sanity test demonstration
if __name__ == "__main__":
    import tempfile
    
    # Create sample messy CSV representing realistic hackathon sales records
    sample_csv_content = """Tx_Date,Item_Name,Quantity,Movement_Type,Notes
2026-10-25 14:20:00, Bat Wings , -3, Sale, Customer potion
2026-10-25 18:30:00,Bat Wings,-2,sale,Brewed elixir
2026-10-25 18:30:00,Bat Wings,-2,sale,Brewed elixir (DUPLICATE)
2026-10-25 11:00:00,Mandrake Root,-5,sale,Standard purchase
2026-10-27 09:15:00, Bat Wings, -8, sale, Midnight prep
2026-10-28 23:55:00,Ghost Pepper,-4,sale,Spicy ward
"""
    with tempfile.NamedTemporaryFile("w+", suffix=".csv", delete=False) as tmp:
        tmp.write(sample_csv_content)
        tmp_path = tmp.name

    result = load_and_clean(tmp_path)
    print("Cleaned Daily Sales DataFrame (Missing days filled with 0):")
    print(result.to_string(index=False))

