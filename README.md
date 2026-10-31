# 🧙‍♀️ PotionPulse · Smart Inventory & Prophecy Engine
> **Track 1: "The Witch's Potion Pantry" · MSOT Halloween Hackathon 2026**  
> *Autonomous Reagent Stock Tracking, LightGBM & Baseline Prophecy Demand Forecasting, Robust Z-Score Anomaly Radar, and Midnight Curse Surge Engine.*

[![GitHub](https://img.shields.io/badge/GitHub-PotionPulse-purple?style=flat&logo=github)](https://github.com/AdityaChaudhary5412/PotionPulse.git)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20SQLite%2FPostgres-009688?style=flat&logo=fastapi)](http://localhost:8000/docs)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite%20%7C%20Tailwind-61DAFB?style=flat&logo=react)](http://localhost:5173)
[![Capacitor](https://img.shields.io/badge/Mobile-Android%20Capacitor%206-119EFF?style=flat&logo=capacitor)](android/)
[![Tests](https://img.shields.io/badge/Tests-34%20Passed%20(100%25)-success?style=flat&logo=pytest)](test_unseen_data_resilience.py)

---

## 🔮 1. Project Summary

Potion shops collapse when vital reagents run dry at midnight. **PotionPulse** is an end-to-end, real-time inventory tracking, time-series demand forecasting, and loss-prevention platform engineered for Madam Hexley’s potion emporium. 

It unifies:
1. **Real-time Inventory Tracking**: Accurate ledger movements, transactional sales, supplier restocks, and multi-format CSV batch uploads.
2. **Prophecy Forecasting Engine**: Multi-model time-series holdout tournament (**LightGBM Regressor**, **7-Day Moving Average**, **Exponential Smoothing**, **Seasonal Naive**), shipping the winning algorithm per ingredient with $95\%$ residual confidence bands.
3. **Automated Restocking Intelligence**: Mathematical replenishment formula computing **Days Until Stockout**, lead time requirements, and exact reorder targets with safety buffers ($z = 1.65$).
4. **Strange Happenings Anomaly Radar**: Real-time detection of consumption spikes using **Robust Z-Scores** (Median & MAD $\ge 3.5$), phantom missing stock discrepancies, and sudden drop-to-zero hazards.
5. **Midnight Curse Surge Engine**: Interactive event simulator amplifying demand on cursed reagents ($3.0\text{x}$ or custom multipliers) with instant before/after overlay charts and a 1-click global dispel switch.
6. **Cross-Platform Responsive Client**: Dark obsidian UI with universal status indicators, Recharts visual analytics, mobile bottom navigation, and native **Android APK** packaging via Capacitor.

---

## 🏛️ 2. Text Architecture Diagram

```text
+--------------------------------------------------------------------------------------------------------+
|                                      CLIENT INTERACTION TIER                                           |
|                                                                                                        |
|   +-------------------------------------+                +-----------------------------------------+   |
|   |         Web Browser Client          |                |         Android Native Mobile App       |   |
|   |    React 18 + Vite 5 + Tailwind     |                |      Capacitor 6 + Android WebView      |   |
|   |      (Desktop / Tablet View)        |                |     (Mobile BottomNav + Touch UI)       |   |
|   +-------------------------------------+                +-----------------------------------------+   |
+---------------------------------------------------|----------------------------------------------------+
                                                    | REST / JSON / CSV (Axios API Client)
                                                    v
+--------------------------------------------------------------------------------------------------------+
|                                     FASTAPI ENGINE (Python 3.11)                                       |
|                                                                                                        |
|   [CORS & Security Middleware] --> Tolerates capacitor://localhost, LAN IPs, and Public Web Origins   |
|                                                                                                        |
|   +------------------------+   +------------------------+   +--------------------------------------+   |
|   |   Inventory & Sales    |   |   Forecasting Engine   |   |        Anomaly & Risk Radar          |   |
|   |  - CRUD /ingredients   |   |  - LightGBM Regressor  |   |  - Robust Z-Score (Median/MAD >=3.5) |   |
|   |  - POST /sales         |   |  - 7-Day Moving Avg    |   |  - Missing Stock Balance Audit       |   |
|   |  - POST /stock adjust  |   |  - Exponential Smooth  |   |  - Drop-to-Zero Hazard Detection     |   |
|   |  - POST /upload (CSV)  |   |  - Seasonal Naive      |   |  - GET /alerts                       |   |
|   +------------------------+   +------------------------+   +--------------------------------------+   |
|                                                                                                        |
|   +------------------------------------------------------------------------------------------------+   |
|   |                               Restock & Event Surge Subsystem                                  |   |
|   |  - days_until_stockout(stock, forecast)                                                        |   |
|   |  - reorder_quantity = max(0, forecast_lead_time + review_period + safety_stock - current_stock)|   |
|   |  - Status classification: SAFE (>7d), LOW (3-7d), CRITICAL (<=2d)                              |   |
|   |  - Midnight Curse: Multipliers (1.5x - 6.0x) targeting ingredient subsets                      |   |
|   +------------------------------------------------------------------------------------------------+   |
+---------------------------------------------------|----------------------------------------------------+
                                                    | SQLAlchemy 2.0 ORM
                                                    v
+--------------------------------------------------------------------------------------------------------+
|                                          PERSISTENCE TIER                                              |
|                                                                                                        |
|   SQLite (`potion_pulse.db`) for local / testing  <--->  PostgreSQL on Render/Railway for production   |
|   [Tables: ingredients, movements, events, alerts]                                                     |
+--------------------------------------------------------------------------------------------------------+
```

---

## ⚡ 3. Setup Steps

### Prerequisites
- **Python**: 3.10+ (tested on 3.11 & 3.9)
- **Node.js**: v18+ or v20+
- **Android Studio & SDK** (Optional, for compiling Android APK)

---

### Step 1: Backend Setup
```bash
# 1. Clone repository
git clone https://github.com/AdityaChaudhary5412/PotionPulse.git
cd PotionPulse

# 2. Create and activate Python virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt pytest httpx

# 4. Start FastAPI server
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```
- API Root: `http://localhost:8000`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

---

### Step 2: Web Frontend Setup
```bash
# 1. In a new terminal, install Node dependencies
npm install

# 2. Configure environment variable (optional for localhost)
cp .env.example .env.local

# 3. Launch Vite development server
npm run dev
```
- Open `http://localhost:5173` in your browser.

---

### Step 3: Android Mobile App (Capacitor Debug APK)
```bash
# 1. Build production web bundle
npm run build

# 2. Sync web bundle and plugins to Android native project
npx cap sync android

# 3. Compile Debug APK directly via Gradle
cd android
./gradlew assembleDebug
```
- **Generated APK**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **Install on connected Android phone via ADB**:
  ```bash
  adb install -r android/app/build/outputs/apk/debug/app-debug.apk
  ```

---

## 📡 4. Complete API Endpoint List

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | System health check, database status, and active telemetry counts |
| `POST` | `/seed` | Idempotently populates 8 reagents, historical sales, and initial alerts |
| `GET` | `/ingredients` | Lists all pantry reagents with stock, units, and lead times |
| `POST` | `/ingredients` | Creates a new reagent in the catalog |
| `GET` | `/ingredients/{id}` | Fetches reagent details by ID |
| `PUT` | `/ingredients/{id}` | Updates reagent metadata or lead time |
| `DELETE`| `/ingredients/{id}` | Deletes reagent from ledger |
| `POST` | `/sales` | Dispenses/records a sale (`qty > 0`, updates stock, logs movement) |
| `POST` | `/ingredients/{id}/stock`| Adds supplier restock or inventory adjustment |
| `POST` | `/upload` | Ingests sales CSV; maps columns; returns accepted/rejected row audit |
| `POST` | `/predict` | Ingests sales CSV; outputs predictions CSV with fixed schema `ingredient,date,predicted_qty` |
| `GET` | `/restock` | Returns stockout days, status, daily burn, and reorder quantities (`?with_event=true/false`) |
| `GET` | `/summary` | Returns low items, critical items, alerts today, and nearest stockout days |
| `GET` | `/demand/{id}` | Returns historical sales, 7-day forecast, and 95% lo/hi confidence bands |
| `GET` | `/events` | Lists all active and scheduled surge events |
| `POST` | `/events` | Creates a demand surge event (multiplier, ingredient targets, dates) |
| `POST` | `/events/{id}/toggle` | 1-click toggle activating or deactivating a surge event |
| `DELETE`| `/events/{id}` | Deletes a surge event |
| `GET` | `/alerts` | Lists anomaly audit records sorted newest first (`?severity=`, `?type=`) |

---

## 📊 5. Validation Metrics Table (Baseline vs Model)

Using an empirical **7-day holdout validation** across 48 historical daily records, our hybrid forecasting tournament evaluates:
- **WAPE** (Weighted Absolute Percentage Error): $\frac{\sum |y - \hat{y}|}{\sum y}$
- **Bias**: $\frac{\sum (\hat{y} - y)}{\sum y}$
- **Residual Standard Deviation** ($\sigma$): Standard deviation of forecast errors, generating $95\%$ confidence intervals ($\pm 1.96\sigma$).

```text
========================================================================================================
                                 MODEL VALIDATION TABLE (HOLDOUT N=7 DAYS)
========================================================================================================
Ingredient           Forecasting Method             WAPE      Bias       MAE     ResStd (σ)  Shipped?
--------------------------------------------------------------------------------------------------------
Bat Wings            LightGBM Regressor             21.9%    -19.6%     4.45        4.83     🏆 WINNER
Bat Wings            Exponential Smoothing (α=0.3)  45.8%    -39.5%     9.32       10.62     
Bat Wings            7-Day Moving Average           52.3%    -48.6%    10.66       11.01     
Bat Wings            Seasonal Naive (t-7)           63.7%    -59.1%    12.99       13.38     
--------------------------------------------------------------------------------------------------------
Dragon Scale         Seasonal Naive (t-7)           29.1%    +23.8%     0.94        1.11     🏆 WINNER
Dragon Scale         LightGBM Regressor             43.0%    -15.6%     1.39        2.01     
Dragon Scale         Exponential Smoothing (α=0.3)  44.4%    +11.6%     1.44        1.87     
Dragon Scale         7-Day Moving Average           44.6%    +17.4%     1.45        1.74     
--------------------------------------------------------------------------------------------------------
Ghost Pepper         LightGBM Regressor             31.3%     -2.4%     3.52        4.67     🏆 WINNER
Ghost Pepper         Exponential Smoothing (α=0.3)  39.7%    -31.4%     4.46        6.02     
Ghost Pepper         7-Day Moving Average           46.2%    -39.5%     5.19        5.96     
Ghost Pepper         Seasonal Naive (t-7)           58.3%    -50.2%     6.56        6.74     
--------------------------------------------------------------------------------------------------------
Mandrake Root        LightGBM Regressor             32.6%    -32.0%     4.85        4.77     🏆 WINNER
Mandrake Root        Exponential Smoothing (α=0.3)  38.7%    -38.1%     5.77        5.00     
Mandrake Root        7-Day Moving Average           46.1%    -46.1%     6.87        5.67     
Mandrake Root        Seasonal Naive (t-7)           60.0%    -56.0%     8.94        8.18     
--------------------------------------------------------------------------------------------------------
Nightshade Essence   Exponential Smoothing (α=0.3)  33.3%     +6.9%     0.80        0.91     🏆 WINNER
Nightshade Essence   7-Day Moving Average           38.8%     +2.9%     0.94        1.14     
Nightshade Essence   LightGBM Regressor             49.0%    -19.1%     1.18        1.47     
Nightshade Essence   Seasonal Naive (t-7)           59.8%    -29.0%     1.44        1.80     
========================================================================================================
```

**Winning Strategy**:
- High-volume, volatile reagents (*Bat Wings*, *Ghost Pepper*, *Mandrake Root*) are won decisively by **LightGBM**, which leverages lag features (`lag_1`, `lag_7`, `lag_14`), rolling means, and day-of-week interactions.
- Stable, low-volume reagents (*Dragon Scale*, *Nightshade Essence*) are won by **Seasonal Naive** and **Exponential Smoothing**, preventing overfitting on sparse numbers.
- PotionPulse ships the winner per ingredient.

---

## 🚨 6. Anomaly Test Results (Injection Benchmark)

Our anomaly radar tests three distinct statistical detectors in [`backend/anomalies.py`](file:///Users/adityachaudhary/hallowen%20hackthon/backend/anomalies.py):
1. **Spike Detection**: Robust Z-Score via Median Absolute Deviation (MAD), threshold $Z \ge 3.5$.
2. **Missing Stock Discrepancy**: Expected balance $(Opening + Restocks - Sales)$ vs recorded stock ($Tolerance = 3.0$).
3. **Drop-to-Zero Hazard**: Detects precipitous plunges from positive inventory to empty.

### Benchmark Results ([`test_anomalies.py`](file:///Users/adityachaudhary/hallowen%20hackthon/test_anomalies.py)):
```text
================================================================================
                     ANOMALY INJECTION BENCHMARK REPORT
================================================================================
  Target Injected Anomalies : 5
  Caught Anomalies          : 5 / 5 (100.0%)
  False Alarms              : 0 (0.0%)
--------------------------------------------------------------------------------
  VERIFIED CAUGHT ANOMALIES:
    ✓ [HIGH] Bat Wings Spike: Bat Wings: sales 6.5x above normal (spike of 52.0 vs forecast 8.0)
    ✓ [HIGH] Ghost Pepper Spike: Ghost Pepper: sales 8.4x above normal (spike of 42.0 vs forecast 5.0)
    ✓ [HIGH] Dragon Scale Missing Stock: Dragon Scale: 25.0 units missing compared to ledger (expected 60.0, recorded 35.0)
    ✓ [HIGH] Eye Of Newt Missing Stock: Eye Of Newt: 20.0 units missing compared to ledger (expected 37.0, recorded 17.0)
    ✓ [HIGH] Phoenix Feather Drop-to-Zero: Phoenix Feather: stock plunged from 15.0 to zero; pantry depleted
================================================================================
```

---

## 🏷️ 7. The Universal Status Rule

To prevent cognitive overload, inventory health is classified by a single deterministic function defined once in [`backend/restock.py`](file:///Users/adityachaudhary/hallowen%20hackthon/backend/restock.py#L70) and mirrored in [`src/lib/constants.ts`](file:///Users/adityachaudhary/hallowen%20hackthon/src/lib/constants.ts#L10):

$$\text{status}(\text{days}) = \begin{cases} \text{critical} & \text{if } \text{days} \le 2.0 \\ \text{low} & \text{if } 2.0 < \text{days} \le 7.0 \\ \text{safe} & \text{if } \text{days} > 7.0 \end{cases}$$

| Status | Threshold | Color Token | Badge Styling | Icon | Meaning |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SAFE** | $> 7.0$ Days | `emerald` (`#10b981`) | `bg-emerald-950/60 text-emerald-300 border-emerald-800` | `CheckCircle2` | Stock satisfies demand horizon |
| **LOW** | $3.0 - 7.0$ Days *(2 to 3 treated as low)* | `amber` (`#f59e0b`) | `bg-amber-950/60 text-amber-300 border-amber-800` | `AlertTriangle` | Reorder required within review period |
| **CRITICAL** | $\le 2.0$ Days | `rose` (`#f43f5e`) | `bg-rose-950/80 text-rose-300 border-rose-800 animate-pulse` | `AlertOctagon` | Imminent stockout within 48 hours |

---

## 📚 8. Libraries, Pretrained Models, Public APIs & AI Tools Used

### Python Backend
- **FastAPI** (`0.128.8`) & **Starlette**: Async REST API, OpenAPI docs, dependency injection.
- **Uvicorn** (`0.39.0`): ASGI web server.
- **SQLAlchemy** (`2.0.55`): Relational ORM supporting SQLite and PostgreSQL.
- **LightGBM** (`4.6.0`): Gradient boosted decision tree regressor for time-series demand forecasting with categorical feature support.
- **Scikit-Learn** (`1.6.1`) & **SciPy** (`1.13.1`): Feature engineering, evaluation metrics, and statistical distributions.
- **Pandas** (`2.3.3`) & **NumPy** (`2.0.2`): Time-series indexing, rolling aggregations, robust Z-scores (Median & MAD).
- **Pytest** (`8.4.2`) & **HTTPX**: Comprehensive testing harness.

### Frontend Web & Mobile
- **React** (`18.3.1`) & **Vite** (`5.4.9`): Declarative UI library and fast bundler.
- **Tailwind CSS** (`3.4.14`): Modern dark-mode utility-first design system.
- **Recharts** (`2.13.0`): SVG composable chart canvas for area, line, confidence bands, and reference markers.
- **Lucide React** (`0.453.0`): Status and domain iconography.
- **Capacitor** (`6.1.2`): Native Android wrapper and runtime bridge.
- **Axios** (`1.7.7`): HTTP client with unified error formatting.

### AI & Assistant Tools
- **Google Antigravity & DeepMind Advanced Agentic Coding**: Guided paired programming, algorithm design, and automated verification.

---

## 🎙️ 9. 8-Minute Demo Script & Slide Deck

### Slide Deck Flow

```text
+----------+   +-------------+   +-------------+   +-------------------+
| Slide 1  |   |   Slide 2   |   |   Slide 3   |   |      Slide 4      |
|  Story   |-->|  Dashboard  |-->|  Inventory  |-->| Forecast & Metric |
+----------+   +-------------+   +-------------+   +-------------------+
     |
     v
+----------+   +-------------+   +-------------+   +-------------------+
| Slide 5  |   |   Slide 6   |   |   Slide 7   |   |      Slide 8      |
| Anomaly  |-->| Curse Mode  |-->| Architecture|-->|    Next Steps     |
+----------+   +-------------+   +-------------+   +-------------------+
```

---

### Slide 1: The Midnight Stockout Disaster (Minute 0:00 - 1:00)
- **Visual**: Madam Hexley’s cauldron sputtering green smoke under a full moon. Empty jars of *Bat Wings* and *Mandrake Root*.
- **Speaker**:  
  *"Judges, imagine it’s midnight on Halloween. A line of 30 witches stretches down the street wanting Invisibility Elixirs. Madam Hexley opens her pantry—and her Bat Wings are gone. Her Mandrake Root ran out two days ago. She has no idea she was robbed 15 units of Dragon Scales yesterday, and she just had to turn away \$4,000 in potion sales.  
  Potion shops fail because inventory is managed by guesswork. Welcome to **PotionPulse**: the autonomous inventory intelligence, machine learning forecasting, and theft-detection platform for potion pantries."*

---

### Slide 2: The Command Dashboard (Minute 1:00 - 2:00)
- **Visual**: Live Dashboard screen showing the **4 Stat Cards** and **Endangered Reagent Cards** sorted by fewest days until stockout.
- **On-Screen Action**: Point to the top stat cards (`Low-Stock: 3`, `Critical Items: 1`, `Alerts Today: 2`, `Nearest Stockout: 0.0d`).
- **Speaker**:  
  *"Here is Madam Hexley’s command center. Immediately at the top, she sees her vital statistics from `GET /summary`: low-stock items, critical items under 48 hours, active anomaly alerts, and her nearest stockout horizon.  
  Notice how the inventory cards are strictly prioritized: ingredients with the **fewest days until stockout** appear at the very top. Mandrake Root is depleted; Bat Wings has only 1.8 days left. Every card features a status badge—Safe in green, Low in amber, and Critical in glowing red—with real-time capacity progress bars and one-click Restock and Brew dispense dialogs."*

---

### Slide 3: The Inventory Ledger (Minute 2:00 - 3:00)
- **Visual**: Inventory Ledger data table with search bar, status filter pills, and column sorting.
- **On-Screen Action**: Type "wings" into the search bar, filter by "Critical", and click the "Days Left" column header to toggle ascending/descending sorting. Click "New Reagent".
- **Speaker**:  
  *"When managing hundreds of herbs, eyes, and essences, speed is critical. Our Inventory screen provides a responsive data table. We can filter instantly by status, search by ingredient or unit, and sort by days remaining, daily burn rate, or reorder target.  
  Let’s click 'New Reagent' to add *Basilisk Fang* with a 5-day lead time. The ledger updates with optimistic UI updates and toast confirmations, backed by transactional integrity."*

---

### Slide 4: Forecast Prophecy & Metrics Tournament (Minute 3:00 - 4:00)
- **Visual**: The Reagent Detail Page showing the Recharts consumption curve, 7-day forecast line, shaded 95% confidence band, and the vertical amber marker: *"Forecast Starts Here"*.
- **On-Screen Action**: Hover over the Recharts chart showing tooltips with exact units. Point out the sidebar with the exact Reorder Target formula: $\max(0, \text{lead time forecast} + \text{review} + \text{safety stock} - \text{current stock})$.
- **Speaker**:  
  *"Now let's view the Demand Prophecy. For Bat Wings, we don't just guess future demand—we ran a real time-based holdout tournament. As you can see in our benchmarks, **LightGBM won Bat Wings with a 21.9% WAPE**, crushing Seasonal Naive at 63.7%. For stable items like Dragon Scale, Seasonal Naive took the crown. PotionPulse automatically ships whichever model wins per reagent.  
  On the chart, notice the historical sales line, the dashed forecast prophecy, the shaded 95% confidence interval, and the vertical marker marking where historical data ends and the prophecy begins. Beside the chart, Madam Hexley gets her exact restock quantity—including a safety buffer calculated with $z = 1.65$."*

---

### Slide 5: Strange Happenings Anomaly Radar (Minute 4:00 - 5:00)
- **Visual**: The Alerts Screen displaying statistical spikes and theft logs in plain language, sorted newest first.
- **On-Screen Action**: Filter alerts by "High/Critical". Highlight the message: *"Bat Wings: sales 6.5x above normal (spike of 52.0 vs forecast 8.0)"* and *"Dragon Scale: 25.0 units missing compared to ledger"*. Click "Inspect" to navigate directly to the reagent curve.
- **Speaker**:  
  *"Inventory shrinkage and sudden spikes destroy profits. Our 'Strange Happenings' audit runs three autonomous detectors. First: a **Robust Z-Score** using Median Absolute Deviation ($Z \ge 3.5$) that catches sudden demand spikes while ignoring routine weekends. Second: a **Ledger Discrepancy Auditor** comparing expected stock balance to physical stock to catch phantom theft. Third: a **Drop-to-Zero Watchdog**.  
  In our benchmark, we injected 5 real-world anomalies. PotionPulse caught 5 out of 5—100% detection with **zero false alarms**—and writes plain-language explanations so anyone can understand what went wrong."*

---

### Slide 6: The Midnight Curse (Before vs After) (Minute 5:00 - 6:00)
- **Visual**: The Curse Mode Dialog selecting ingredients and multiplier; the glowing purple global banner appearing across all screens; and the Before/After overlay chart.
- **On-Screen Action**: Click the Curse Mode toggle in the navbar. Open the Curse Dialog, select the "Cursed Trio", pick $3.0\text{x}$ Multiplier, and click "Summon Curse". Show the global banner. In the detail chart, click "Overlay Both". Then click "Turn Off Curse" on the banner with one click.
- **Speaker**:  
  *"What happens during a surge event like Halloween? Let’s trigger **Curse Mode**. In this dialog, we select our cursed reagents—Bat Wings, Ghost Pepper, and Mandrake Root—and set a 3.0x multiplier.  
  Instantly, a global purple banner activates across every screen. Look at our numbers: Days Until Stockout for Bat Wings collapses from 6.0 days down to 1.8 days; status shifts from Low to Critical; and recommended reorder triples from +25 to +75.  
  On the detail chart, our 'Before vs After' overlay lets us see both curves simultaneously. And turning it off is just as easy: one click on 'Turn Off Curse' dispels the curse and resets numbers immediately."*

---

### Slide 7: Production Architecture & Mobile APK (Minute 6:00 - 7:00)
- **Visual**: Text architecture diagram and a demonstration of the mobile view with the Bottom Navigation Bar.
- **On-Screen Action**: Resize browser window to mobile width ($375\text{px}$). Show how the top navigation cleanly converts to a native mobile bottom navigation bar with live alert badges.
- **Speaker**:  
  *"Under the hood, PotionPulse is engineered for reliability. The backend is built with FastAPI and SQLAlchemy, with native support for both zero-config local SQLite and production PostgreSQL on Render or Railway.  
  Our prediction pipeline handles messy data: missing calendar days are filled with zeros, extreme typos are clipped, duplicate rows are purged, and sparse ingredients fall back to safe baselines in under 0.05 seconds.  
  On the frontend, we wrapped the entire app with **Capacitor 6** into a native Android APK. On small screens, the UI transforms into a native bottom navigation bar with touch-friendly controls and cleartext network security for mobile testing."*

---

### Slide 8: Next Steps & Roadmap (Minute 7:00 - 8:00)
- **Visual**: Summary roadmap slide highlighting Autonomous Supplier EDI, Multi-Boutique Coven Inventory, and Camera Barcode Scanning.
- **On-Screen Action**: Show the test suite passing 34/34 tests in the terminal.
- **Speaker**:  
  *"In conclusion, PotionPulse transforms the Witch’s Potion Pantry from midnight chaos into an automated, prophecy-driven enterprise.  
  Next on our roadmap:  
  1. Automated Goblin Caravan purchase order dispatch via supplier webhooks.  
  2. Mobile camera barcode scanning for real-time box check-ins.  
  3. Multi-pantry coven inventory transfers.  
  All 34 automated unit, integration, and failure mode tests are green, the code is open-source on GitHub, and the APK is ready to deploy. Thank you, and we welcome your questions!"*

---

## ❓ 10. 8 Likely Judge Questions & Crisp Answers

#### Q1: "Why did you build custom baselines alongside LightGBM instead of just using LightGBM for everything?"
> **Answer**: *"Machine learning models like LightGBM excel when there is rich history, lag features, and seasonal interaction. However, on new reagents with only 3 or 4 observations, gradient boosted trees easily overfit. By running an automated tournament that includes Seasonal Naive and Exponential Smoothing, PotionPulse guarantees that small, stable items (like Dragon Scale) receive simple, robust predictions, while volatile items get high-capacity ML."*

#### Q2: "How does your restock formula prevent over-ordering when lead times are long?"
> **Answer**: *"Our formula, $\text{reorder\_qty} = \max(0, \text{forecast over lead time} + \text{review period} + \text{safety stock} - \text{current stock})$, explicitly subtracts current on-hand inventory. The safety stock is scaled dynamically using $z \times \sigma \times \sqrt{L}$, where $\sigma$ is the residual standard deviation from our holdout validation. If stock is already sufficient to survive the lead time plus review window, the reorder quantity remains zero."*

#### Q3: "What happens if a user uploads a CSV with a brand-new ingredient that has zero historical sales?"
> **Answer**: *"The system gracefully falls back to a catalog default baseline (or the mean of observed non-zero sales if sparse data exists), logs an `X-Prediction-Fallback` header in the HTTP response to notify the client, and returns a valid, bounded prediction in the exact required schema (`ingredient,date,predicted_qty`) without crashing."*

#### Q4: "Why use Median Absolute Deviation (MAD) instead of standard standard deviation (Z-score) for anomaly detection?"
> **Answer**: *"Standard Z-scores use the mean and sample standard deviation, both of which are heavily distorted by the very spikes we are trying to detect. If someone sells 100 units instead of 5, the mean jumps and standard deviation inflates, masking the anomaly. Median and MAD are robust statistics with a 50% breakdown point, ensuring spikes stand out with unmodified sensitivity."*

#### Q5: "How does the mobile app handle cleartext HTTP traffic when testing against a local backend?"
> **Answer**: *"Android 9+ blocks cleartext HTTP by default. We implemented both `android:usesCleartextTraffic='true'` in `AndroidManifest.xml` and created a dedicated `network_security_config.xml` that permits cleartext for `localhost`, `10.0.2.2`, and local LAN subnets, while allowing standard HTTPS in production."*

#### Q6: "Can PotionPulse scale beyond SQLite in production?"
> **Answer**: *"Yes. In `backend/database.py`, the engine dynamically checks `DATABASE_URL`. If a PostgreSQL connection string is supplied (such as on Render or Railway), it seamlessly switches to connection pooling (`pool_size=10`, `max_overflow=20`, `pool_pre_ping=True`) without altering any business logic or ORM models."*

#### Q7: "How do you guarantee /predict stays under a few seconds with large CSV files?"
> **Answer**: *"The `/predict` pipeline is vectorized using Pandas and NumPy. Date expansion, missing day generation, and rolling means are executed in memory via Cartesian indexing without slow iterative database queries, clocking in at under $0.05$ seconds for multi-reagent files."*

#### Q8: "How does the Curse Mode impact downstream restocking?"
> **Answer**: *"Curse Mode is not just a UI visual: it injects an active multiplier into our database-backed event table. When active, every demand forecast, days-until-stockout countdown, and reorder recommendation immediately reflects the surge. Witches can visually toggle 'Overlay Both' on the detail chart to see exact before-and-after variance, and dispel it globally with a single click."*
