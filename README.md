# 🧙‍♀️ PotionPulse · The Witch's Smart Inventory & Demand Engine
> **Track 1: "The Witch's Potion Pantry" · MSOT Halloween Night Hackathon 2026**  
> *Autonomous Reagent Stock Tracking, Prophecy ML Forecasting, Z-Score Anomaly Radar, and Midnight Curse Multiplier.*

---

## 🔮 1. Executive Summary

Potion shops fail when shelves run dry at midnight. **PotionPulse** is an end-to-end smart inventory, demand forecasting, and loss-prevention platform built for Madam Hexley. It runs seamlessly on both **Web** and **Android (via Capacitor)** against a unified high-performance **FastAPI + SQLite** backend.

### Key Capabilities
- **Real-Time Stock Tracking**: Add new reagents, execute quick sales (`-1`), record restocks (`+10`), and preserve tamper-evident audit trails.
- **Prophecy Demand Engine**: 7-day weighted moving average calculations forecasting **Days Until Stockout** and **Automated Reorder Recommendations** (maintaining a 14-day safety stock buffer).
- **Strange Happenings Anomaly Radar**: Real-time statistical Z-score detector ($Z \ge 2.5$) flagging unexpected consumption spikes and inventory theft.
- **Midnight Curse Multiplier**: Simulates seasonal Halloween surge spikes, tripling demand ($+300\%$) for cursed ingredients (*Bat Wings*, *Mandrake Root*, *Ghost Pepper*).
- **Crystal Ball Visual Analytics**: Interactive Recharts telemetry comparing live inventory levels with predicted depletion curves.

---

## 🛠️ 2. Architecture & Tech Stack

| Tier | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend API** | FastAPI (Python 3.10+) | High-throughput async REST endpoints with automatic OpenAPI docs |
| **Database** | SQLite + SQLAlchemy ORM | Zero-config relational storage for inventory, transactions, & anomalies |
| **ML & Statistics** | NumPy, Pandas, SciPy Z-Score | Rolling moving average forecast & Gaussian consumption spike detection |
| **Frontend Web** | React 18, Vite, Tailwind CSS | Dark Gothic Magic Academy theme (`#0B0F19`, `#9333EA`, `#10B981`) |
| **Data Telemetry** | Recharts | Crystal Ball bar and area curves for stockout predictions |
| **Mobile APK** | Capacitor 6 | Native cross-platform Android wrapper sharing 100% codebase |

---

## 🚀 3. Quickstart & Installation

### Option A: One-Click Automated Launch
```bash
./start.sh
```
This automatically initializes the Python virtualenv, installs dependencies, runs the pytest suite, and boots the backend (`:8000`) and React dashboard (`:3000`).

### Option B: Manual Setup

#### 1. Backend Server
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt pytest httpx
python3 -m uvicorn backend.main:app --reload --port 8000
```
- API Root: `http://localhost:8000`
- Swagger Docs: `http://localhost:8000/docs`

#### 2. React Web Dashboard
```bash
npm install
npm run dev
```
- Open `http://localhost:3000` in your browser.

#### 3. Android Mobile APK Build (Capacitor)
```bash
npm run build
npx cap add android
npx cap open android
```

---

## 🧪 4. Automated Test Suite

Verify prediction math, inventory updates, curse tripling, and anomaly detection:
```bash
pytest test_prediction_engine.py -v
```

---

## 🎬 5. Judge Demo Walkthrough (2-Minute Pitch)

1. **Dashboard Overview**:
   - Open `http://localhost:3000`. Show the dark obsidian theme, item counts, and endangered stock badges.
2. **Reseed Realistic History**:
   - Click the **"Reseed"** button in the header. Point out that 8 core reagents are instantly populated with 14 days of realistic Gaussian consumption logs.
3. **Quick Sale & Stockout Updates**:
   - Click **"Sale (-1)"** on *Bat Wings*. Watch the live stock drop, the progress bar shrink, and the stockout days recalculate instantly.
4. **The Midnight Curse Spike**:
   - Click **"Trigger Full Moon Festival (+300% Spike)"** in the top banner.
   - Point out that *Bat Wings*, *Mandrake Root*, and *Ghost Pepper* instantly enter a **3x Cursed Spike** state, their daily burn triples, and their stockout predictions accelerate.
5. **Crystal Ball Telemetry**:
   - Click the **"Crystal Ball Prophecy"** tab. Show judges the live Recharts comparison between current stock and recommended restock orders.
6. **Strange Happenings Radar**:
   - Click **"Strange Happenings"** tab. Show statistical anomaly logs flagged by the Z-score engine.

