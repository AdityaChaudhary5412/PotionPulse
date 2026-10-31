import re
import pandas as pd
import numpy as np
from typing import Union, List, Optional, Tuple, Dict
from pathlib import Path

# Expanded alias mappings to tolerate renamed or reordered CSV/Excel columns
COLUMN_ALIASES = {
    "date": [
        "date", "timestamp", "ts", "datetime", "time", "tx_date", "day",
        "transaction_date", "transaction_time", "tx_time", "trans_date",
        "sale_date", "period", "record_date", "sales_date", "entry_date"
    ],
    "ingredient": [
        "ingredient", "item", "name", "reagent", "product", "ingredient_name",
        "item_name", "reagent_name", "sku", "potion", "material", "reagent_item",
        "item_title", "ingredient_title", "inventory_item"
    ],
    "qty": [
        "qty", "quantity", "amount", "sales", "volume", "units", "units_sold",
        "change_amount", "sold_volume", "count", "dispensed", "quantity_sold",
        "qty_sold", "val", "sale_qty", "sales_volume", "dispensed_qty"
    ],
    "type": [
        "type", "tx_type", "transaction_type", "movement_type", "action",
        "direction", "category", "movement", "trans_type", "record_type",
        "movement_action", "tx_action"
    ]
}

# Standard fallback daily burn rates for potion reagents
SAFE_DEFAULT_BURN_RATES: Dict[str, float] = {
    "Bat Wings": 8.0,
    "Dragon Scale": 3.0,
    "Eye Of Newt": 3.0,
    "Ghost Pepper": 5.0,
    "Mandrake Root": 6.0,
    "Nightshade Essence": 2.5,
    "Phoenix Feather": 1.0,
    "Spider Silk": 4.0
}


def resolve_column(df_columns: List[str], target_key: str) -> Optional[str]:
    """
    Finds matching column name in DataFrame regardless of case, underscores,
    spaces, parentheses (e.g., 'Quantity (units)'), or common domain synonyms.
    Uses precise token matching to prevent false substring collisions
    (e.g. 'action' substring inside 'transaction_timestamp').
    """
    # 1. Exact normalized match
    normalized = {
        re.sub(r"[^a-zA-Z0-9]+", "_", str(col).lower().strip()).strip("_"): col
        for col in df_columns
    }
    target_aliases = COLUMN_ALIASES.get(target_key, [target_key])
    for alias in target_aliases:
        alias_clean = re.sub(r"[^a-zA-Z0-9]+", "_", alias.lower().strip()).strip("_")
        if alias_clean in normalized:
            return normalized[alias_clean]

    # 2. Token-level subset matching (prevents false substring collisions)
    for col in df_columns:
        col_tokens = set(re.split(r"[^a-zA-Z0-9]+", str(col).lower()))
        for alias in target_aliases:
            alias_tokens = set(re.split(r"[^a-zA-Z0-9]+", alias.lower()))
            if alias_tokens and alias_tokens.issubset(col_tokens):
                return col

    return None


def parse_flexible_dates(series: pd.Series) -> pd.Series:
    """
    Parses diverse real-world date formats into datetime.date objects:
    - ISO 8601: '2026-10-31', '2026-10-31T14:30:00Z'
    - US slash format: '10/31/2026'
    - UK/European format: '31/10/2026'
    - Dot format: '2026.10.31', '31.10.2026'
    - Textual: 'Oct 31, 2026', '31 Oct 2026'
    - Timestamps
    """
    try:
        parsed = pd.to_datetime(series, utc=True, errors="coerce")
    except Exception:
        parsed = pd.Series([pd.NaT] * len(series), index=series.index)

    # For dates where day is first (e.g. 31/10/2026)
    if parsed.isna().any():
        try:
            dayfirst_parsed = pd.to_datetime(series, dayfirst=True, utc=True, errors="coerce")
            parsed = parsed.fillna(dayfirst_parsed)
        except Exception:
            pass

    # For mixed / textual dates
    if parsed.isna().any():
        try:
            mixed_parsed = pd.to_datetime(series, format="mixed", utc=True, errors="coerce")
            parsed = parsed.fillna(mixed_parsed)
        except Exception:
            pass

    # Return clean python datetime.date objects
    return parsed.apply(lambda x: x.date() if pd.notna(x) and hasattr(x, "date") else None)


def sanitize_quantities(
    series: pd.Series, 
    max_reasonable: float = 10000.0
) -> pd.Series:
    """
    Cleans raw numeric inputs:
    - Strips commas, quotes, currency symbols, and units
    - Casts to float, filling NaNs with 0.0
    - Clips extreme outliers (e.g. typos like 999999999) to a maximum boundary
    """
    cleaned_str = (
        series.astype(str)
        .str.replace(r"[^\d\.\-\+]", "", regex=True)
        .str.strip()
    )
    numeric = pd.to_numeric(cleaned_str, errors="coerce").fillna(0.0)

    # Extreme value clipping to protect prediction models from arithmetic overflow & severe skew
    clipped = numeric.clip(lower=-max_reasonable, upper=max_reasonable)
    return clipped


def compute_prediction_for_ingredient(
    ingredient: str,
    recent_series: pd.Series,
    min_required_history: int = 7
) -> Tuple[float, str, bool]:
    """
    Calculates the next-day forecast for an ingredient:
    - If at least min_required_history days exist: uses 7-day moving average.
    - If too little history (< 7 days): falls back to safe baseline (mean of observed non-zero days
      or safe catalog default) and marks fallback=True.
    
    Returns:
        (predicted_qty, explanation, is_fallback)
    """
    valid_records = recent_series.dropna()
    positive_records = valid_records[valid_records > 0]

    # If we have at least 7 days of daily records in the span:
    if len(valid_records) >= min_required_history:
        moving_avg = float(valid_records.tail(min_required_history).mean())
        predicted = round(max(0.1, moving_avg), 2)
        return (predicted, f"7-day moving average based on {len(valid_records)} days history", False)

    # Safe baseline fallback for sparse history (< 7 days total) or brand-new ingredient
    if len(positive_records) > 0:
        safe_val = round(float(positive_records.mean()), 2)
        reason = f"Safe baseline: mean of {len(positive_records)} observed sales (history < {min_required_history} days)"
    else:
        # Default catalog baseline for brand new ingredient with no prior sales
        safe_val = SAFE_DEFAULT_BURN_RATES.get(ingredient.title(), 2.0)
        reason = f"Safe default baseline: brand new reagent with 0 historical sales"

    return (round(max(0.1, safe_val), 2), reason, True)


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
    df = df[~df["clean_ingredient"].str.lower().isin(["nan", "none", "null", ""])]

    # Parse dates cleanly using flexible date parser (already returns date objects)
    df["clean_date"] = parse_flexible_dates(df[date_col])
    df = df.dropna(subset=["clean_date"])

    # Clean numeric quantities
    df["clean_qty"] = sanitize_quantities(df[qty_col])

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
