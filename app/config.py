import os

class Settings:
    """Application settings."""
    APP_NAME: str = "My TradingView App"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = "A TradingView application for real-time market data."

    # API Settings
    API_VERSION: str = "v1"
    
    # Database Settings
    DB_DIR: str = os.path.join(os.getcwd(), "data")
    os.makedirs(DB_DIR, exist_ok=True)

    @property
    def API_PREFIX(self) -> str:
        return f"/api/{self.API_VERSION}"

settings = Settings()