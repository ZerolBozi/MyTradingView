# My TradingView

A **Robyn-based** custom trading chart service using TradingView Advanced Chart.  
This project provides real-time market data to the frontend via WebSocket and uses SQLite for persistent storage.

## Features

- **Robyn backend** for high-performance asynchronous WebSocket and HTTP handling
- **Real-time WebSocket** streaming of market data
- **TradingView Advanced Chart** integration on the frontend
- HTML/JavaScript-based lightweight frontend (served from `app/frontend_dist`)
- **SQLite** database for storing chart-related data
- Optional: Build the backend into a standalone `.exe` using Nuitka

## Requirements

- Python 3.10+
- uv (Python package installer and virtual environment management tool)
- SQLite

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ZerolBozi/MyTradingView.git
cd MyTradingView
```

2. Create and activate a virtual environment using uv:
```bash
# Create environment
uv venv

# Activate environment
.venv\Scripts\activate     # For Windows
# OR
source .venv/bin/activate  # For Unix/MacOS
```

3. Install dependencies using the pyproject.toml file:
```bash
uv pip install .
```

## Running the Project

To start the server using Python:
```bash
python run.py
```

Once running, open your browser and navigate to:
```
http://localhost:8001
```

## Build to Executable (Optional)

To build the server into a standalone .exe using Nuitka:
```bash
python build.py
```

The executable will be located in the dist/ folder as run.exe

## 📁 Project Structure
```
MyTradingView/
├── run.py                        # Entry point to start the Robyn server
├── build.py                      # Script to build standalone executable via Nuitka
└── app/
    ├── __init__.py
    ├── main.py                   # Robyn app & routing
    ├── config.py                 # Global config

    ├── services/                 # Business logic and async services
    │   ├── __init__.py
    │   ├── dominance_service.py  # ⚠️ NOT IMPLEMENTED YET
    │   ├── exchange_pool.py
    │   ├── quote_service.py
    │   ├── service_manager.py
    │   └── websocket_service.py

    ├── database/                 # DB access layer
    │   ├── __init__.py
    │   ├── base.py
    │   ├── chart_storage.py
    │   ├── connection.py
    │   ├── market_cache.py
    │   └── watch_list.py

    └── frontend_dist/            # Static frontend (TradingView integration)
        ├── index.html            # Entry point for frontend
        ├── config.js
        ├── charting_library/     # ⚠️ PUT YOUR CHARTING LIBRARY TO HERE
        └── services/             # Frontend JS modules
            ├── chartStorage.js
            ├── datafeed.js
            ├── layoutManager.js
            ├── multipleWidget.js
            ├── sharedWsManager.js
            ├── watchList.js
            └── watchListModal.js
```