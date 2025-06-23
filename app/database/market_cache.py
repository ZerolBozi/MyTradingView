import json
from datetime import datetime
from typing import Dict, Optional, Any, List, Callable

from app.database.base import SQLiteBase

class MarketCache:
    """
    Cache for trading pairs from different exchanges.
    Data is stored in SQLite with a 30-day expiration period.
    """
    def __init__(self):
        """Initialize the market cache with SQLiteBase."""
        self.sqlite_base = SQLiteBase("markets_cache")
        
    async def init_schema(self, db):
        """
        Initialize the schema for the markets_cache table.
        This should be called during application startup.
        """
        async with db.cursor() as cursor:
            # Create markets_cache table (simplified to store only symbols)
            await cursor.execute("""
            CREATE TABLE IF NOT EXISTS markets_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                exchange TEXT NOT NULL,
                symbols TEXT NOT NULL,
                last_updated INTEGER NOT NULL,
                UNIQUE(exchange)
            )
            """)
            
            # Create index on exchange for faster lookups
            await cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_market_exchange ON markets_cache (exchange)
            """)
            
            await db.commit()
    
    async def get_symbols(self, exchange_name: str, fetch_symbols_func: Callable, max_age_days: int = 30) -> Dict[str, Any]:
        """
        Get trading symbols for a specific exchange, either from cache or from the exchange API.
        
        Args:
            exchange_name: Name of the exchange
            fetch_symbols_func: Function to fetch symbols if cache is invalid (async function that returns list of symbols)
            max_age_days: Maximum age of cached data in days
            
        Returns:
            Dict containing list of symbols
        """
        try:
            # Check if we have valid cached data
            cached_symbols = await self._get_from_cache(exchange_name, max_age_days)
            if cached_symbols:
                return {"symbols": cached_symbols, "source": "cache"}
            
            # If no valid cache, fetch using the provided function
            symbols = await fetch_symbols_func(exchange_name)
            if symbols:
                # Save to cache
                await self._save_to_cache(exchange_name, symbols)
                return {"symbols": symbols, "source": "exchange"}
            
            return {}
        except Exception as e:
            print(f"Error getting symbols for {exchange_name}: {e}")
            return {}
    
    async def get_usdt_pairs(self, exchange_name: str, fetch_symbols_func: Callable, max_age_days: int = 30) -> Dict:
        """
        Get all USDT trading pairs for a specific exchange.
        
        Args:
            exchange_name: Name of the exchange
            fetch_symbols_func: Function to fetch symbols if cache is invalid
            max_age_days: Maximum age of cached data in days
            
        Returns:
            Dict containing USDT trading pairs
        """
        try:
            # Get all symbols (either from cache or fresh)
            symbols_data = await self.get_symbols(exchange_name, fetch_symbols_func, max_age_days)
            
            if "error" in symbols_data:
                return symbols_data
            
            all_symbols = symbols_data["symbols"]
            
            # Filter out USDT pairs
            usdt_pairs = [symbol for symbol in all_symbols if symbol.endswith('/USDT')]
            
            return {"pairs": usdt_pairs, "source": symbols_data["source"]}
        except Exception as e:
            return {"error": str(e)}
    
    async def check_pair_exists(self, exchange_name: str, symbol: str, fetch_symbols_func: Callable, max_age_days: int = 30) -> bool:
        """
        Check if a specific trading pair exists on an exchange.
        
        Args:
            exchange_name: Name of the exchange
            symbol: Trading pair symbol (e.g. 'BTC/USDT')
            fetch_symbols_func: Function to fetch symbols if cache is invalid
            max_age_days: Maximum age of cached data in days
            
        Returns:
            True if the pair exists, False otherwise
        """
        try:
            # Get all symbols (either from cache or fresh)
            symbols_data = await self.get_symbols(exchange_name, fetch_symbols_func, max_age_days)
            
            if "error" in symbols_data:
                return False
            
            all_symbols = symbols_data["symbols"]
            
            # Check if the symbol exists
            return symbol in all_symbols
        except Exception as e:
            print(f"Error checking if pair exists: {e}")
            return False
    
    async def search_pairs(self, exchange_name: str, search_text: str, fetch_symbols_func: Callable, max_age_days: int = 30) -> Dict:
        """
        Search for trading pairs containing the search text.
        
        Args:
            exchange_name: Name of the exchange
            search_text: Text to search for in symbol names
            fetch_symbols_func: Function to fetch symbols if cache is invalid
            max_age_days: Maximum age of cached data in days
            
        Returns:
            Dict containing matching trading pairs
        """
        try:
            # Get all symbols (either from cache or fresh)
            symbols_data = await self.get_symbols(exchange_name, fetch_symbols_func, max_age_days)
            
            if "error" in symbols_data:
                return symbols_data
            
            all_symbols = symbols_data["symbols"]
            
            # Filter by search text
            search_text = search_text.upper()
            matching_pairs = [symbol for symbol in all_symbols if search_text in symbol.upper()]
            
            return {"pairs": matching_pairs, "source": symbols_data["source"]}
        except Exception as e:
            return {"error": str(e)}
    
    async def clear_cache(self, exchange_name: Optional[str] = None) -> bool:
        """
        Clear the cache for a specific exchange or all exchanges.
        
        Args:
            exchange_name: Name of the exchange to clear cache for, or None to clear all
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if exchange_name:
                # Clear cache for specific exchange
                return await self.sqlite_base.delete_many({"exchange": exchange_name}) > 0
            else:
                # Clear all cache
                return await self.sqlite_base.delete_many({}) > 0
        except Exception as e:
            print(f"Error clearing cache: {e}")
            return False
    
    async def _get_from_cache(self, exchange_name: str, max_age_days: int) -> Optional[List[str]]:
        """
        Get symbols from cache if it exists and is not expired.
        
        Args:
            exchange_name: Name of the exchange
            max_age_days: Maximum age of cached data in days
            
        Returns:
            List of symbols or None if not found or expired
        """
        try:
            # Calculate expiration timestamp
            now = int(datetime.now().timestamp())
            max_age_seconds = max_age_days * 24 * 60 * 60
            min_timestamp = now - max_age_seconds
            
            # Query cache
            cache_entry = await self.sqlite_base.find_one({
                "exchange": exchange_name,
                "last_updated": {"$gte": min_timestamp}
            })
            
            if not cache_entry:
                return None
                
            # Parse the cached symbols
            return json.loads(cache_entry["symbols"])
        except Exception as e:
            print(f"Error getting from cache: {e}")
            return None
    
    async def _save_to_cache(self, exchange_name: str, symbols: List[str]) -> bool:
        """
        Save symbols to cache.
        
        Args:
            exchange_name: Name of the exchange
            symbols: List of trading pair symbols to cache
            
        Returns:
            True if successful, False otherwise
        """
        try:
            now = int(datetime.now().timestamp())
            
            # Convert symbols list to JSON string
            symbols_json = json.dumps(symbols)
            
            # Insert or update cache entry
            success = await self.sqlite_base.update_one(
                {"exchange": exchange_name},
                {"$set": {
                    "symbols": symbols_json,
                    "last_updated": now
                }},
                upsert=True
            )
            
            return success
        except Exception as e:
            print(f"Error saving to cache: {e}")
            return False