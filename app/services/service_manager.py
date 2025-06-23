from typing import Optional

from app.database.connection import DB
from app.database.watch_list import WatchListDB
from app.database.chart_storage import ChartStorageDB
from app.services.quote_service import QuoteService
from app.services.websocket_service import WebSocketService

class ServiceManager:
    _watch_list_db: Optional[WatchListDB] = None
    _chart_storage_db: Optional[ChartStorageDB] = None

    _quote_service: Optional[QuoteService] = None
    _websocket_service: Optional[WebSocketService] = None

    @classmethod
    def get_watch_list_db(cls) -> WatchListDB:
        """
        Get the WatchListDB instance.
        
        Returns:
            WatchListDB instance
        """
        if cls._watch_list_db is None:
            cls._watch_list_db = WatchListDB()
        return cls._watch_list_db

    @classmethod
    def get_chart_storage_db(cls) -> ChartStorageDB:
        """
        Get the ChartStorageDB instance.
        
        Returns:
            ChartStorageDB instance
        """
        if cls._chart_storage_db is None:
            cls._chart_storage_db = ChartStorageDB()
        return cls._chart_storage_db
    
    @classmethod
    def get_quote_service(cls) -> QuoteService:
        """
        Get the QuoteService instance.
        
        Returns:
            QuoteService instance
        """
        if cls._quote_service is None:
            cls._quote_service = QuoteService()
        return cls._quote_service
    
    @classmethod
    def get_websocket_service(cls) -> WebSocketService:
        """
        Get the WebSocketService instance.
        
        Returns:
            WebSocketService instance
        """
        if cls._websocket_service is None:
            cls._websocket_service = WebSocketService()
        return cls._websocket_service
    
    @classmethod
    async def initialize_services(cls):
        """
        Initialize all services and establish database connections.
        Should be called during application startup.
        """
        # Ensure DB connection is established
        await DB.connect()
        print("Connected to database")
        
        # Initialize chart storage
        cls.get_watch_list_db()
        cls.get_chart_storage_db()
        
        # Initialize services
        cls.get_quote_service()
        cls.get_websocket_service()
        
    @classmethod
    async def close_services(cls):
        """
        Gracefully shut down all services and close database connections.
        Should be called during application shutdown.
        """
        # Close WebSocket service if initialized
        if cls._websocket_service is not None:
            await cls._websocket_service.close()
            cls._websocket_service = None
        
        # Close quote service if necessary
        if cls._quote_service is not None:
            await cls._quote_service.close()
            cls._quote_service = None
        
        # Reset chart storage
        cls._chart_storage_db = None
        cls._watch_list_db = None
        
        # Close database connection
        await DB.close()