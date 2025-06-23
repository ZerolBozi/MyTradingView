import time
import asyncio
from typing import Dict, Any

import ccxt.async_support as ccxt

class ExchangePool:
    """
    A connection pool for CCXT exchange instances.
    Reuses exchange connections to improve performance.
    """
    def __init__(self, max_idle_time: int = 300):
        """
        Initialize the exchange pool.
        
        Args:
            max_idle_time: Maximum idle time in seconds before an exchange connection is closed
        """
        self.exchanges: Dict[str, Dict[str, Any]] = {}
        self.max_idle_time = max_idle_time
        self.lock = asyncio.Lock()
        self.cleanup_task = None
    
    async def get_exchange(self, exchange_name: str) -> ccxt.Exchange:
        """
        Get an exchange instance from the pool or create a new one.
        
        Args:
            exchange_name: Name of the exchange
            
        Returns:
            Exchange instance
        
        Raises:
            ValueError: If the exchange is not supported
        """
        async with self.lock:
            current_time = time.time()
            
            if exchange_name in self.exchanges:
                exchange_data = self.exchanges[exchange_name]
                exchange_data['last_used'] = current_time
                return exchange_data['instance']
                
            try:
                exchange_class = getattr(ccxt, exchange_name)
                exchange = exchange_class()
                
                self.exchanges[exchange_name] = {
                    'instance': exchange,
                    'last_used': current_time
                }
                
                # Start the cleanup task if it's not running
                if self.cleanup_task is None or self.cleanup_task.done():
                    self.cleanup_task = asyncio.create_task(self._cleanup_idle_exchanges())
                
                return exchange
            except AttributeError:
                raise ValueError(f"Unsupported exchange: {exchange_name}")
    
    async def _cleanup_idle_exchanges(self):
        """Periodically clean up idle exchange connections"""
        while True:
            await asyncio.sleep(60)  # Check every minute
            
            try:
                async with self.lock:
                    current_time = time.time()
                    exchanges_to_remove = []
                    
                    for exchange_name, exchange_data in self.exchanges.items():
                        if current_time - exchange_data['last_used'] > self.max_idle_time:
                            exchanges_to_remove.append(exchange_name)
                    
                    for exchange_name in exchanges_to_remove:
                        try:
                            await self.exchanges[exchange_name]['instance'].close()
                        except Exception as e:
                            print(f"Error closing exchange {exchange_name}: {e}")
                        
                        del self.exchanges[exchange_name]
                
                # If no more exchanges, stop the cleanup task
                if not self.exchanges:
                    return
                    
            except Exception as e:
                print(f"Error in cleanup task: {e}")
    
    async def close(self):
        """Close all exchange connections in the pool"""
        if self.cleanup_task and not self.cleanup_task.done():
            self.cleanup_task.cancel()
            
        async with self.lock:
            for exchange_name, exchange_data in self.exchanges.items():
                try:
                    await exchange_data['instance'].close()
                except Exception as e:
                    print(f"Error closing exchange {exchange_name}: {e}")
            
            self.exchanges.clear()