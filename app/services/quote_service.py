from typing import Dict, Union, List

import ccxt.async_support as ccxt

from app.database.market_cache import MarketCache
from app.services.exchange_pool import ExchangePool

class QuoteService:
    def __init__(self):
        self.market_cache = MarketCache()
        self.exchange_pool = ExchangePool()

    def __process_symbol(self, symbol: str, exchange_name: str) -> str:
        if exchange_name in ['okx', 'bitopro', 'coinbase']:
            symbol = symbol.replace('USDT', '/USDT')
            symbol = symbol.replace('USDC', '/USDC')
            return symbol
        return symbol
    
    async def get_exchange_by_name(self, exchange_name: str) -> ccxt.Exchange:
        return await self.exchange_pool.get_exchange(exchange_name)
    
    async def _fetch_symbols(self, exchange_name: str) -> List[str]:
        try:
            exchange = await self.get_exchange_by_name(exchange_name)
            
            try:
                tickers = await exchange.fetch_tickers()
                return list(tickers.keys())
            except Exception as ticker_error:
                print(f"fetch_tickers failed for {exchange_name}, falling back to load_markets: {ticker_error}")
                
                markets = await exchange.load_markets()
                return list(markets.keys())
        
        except Exception as e:
            print(f"Error fetching symbols from {exchange_name}: {e}")
            return []
    
    async def get_exchange_markets(self, exchange_name: str) -> dict:
        """
        Get the trading pairs for a specific exchange.
        Uses cache when available and valid (less than 30 days old).

        Args:
            exchange_name: Name of the exchange (e.g., 'binance', 'kraken')

        Returns:
            Dict: Exchange trading pairs
        """
        try:
            symbols_data = await self.market_cache.get_symbols(exchange_name, self._fetch_symbols)
            
            if "symbols" in symbols_data:
                return {
                    "markets": symbols_data["symbols"], 
                    "source": symbols_data.get("source", "unknown")
                }
            return symbols_data
        
        except Exception as e:
            print(e)
            return {}

    def _align_timeframe_boundaries(self, timestamp: int, timeframe: str) -> int:
        timeframe_map = {
            "1m": 60000,
            "5m": 300000,
            "15m": 900000,
            "30m": 1800000,
            "1h": 3600000,
            "4h": 14400000,
            "1d": 86400000,
            "1w": 604800000,
            "1M": 2592000000,
        }
        
        if timeframe not in timeframe_map:
            return timestamp
            
        interval_ms = timeframe_map[timeframe]

        if timeframe == "1w":
            week_start = 345600000
            return ((timestamp - week_start) // interval_ms) * interval_ms + week_start
        elif timeframe == "1M":
            import datetime
            dt = datetime.datetime.fromtimestamp(timestamp / 1000, tz=datetime.timezone.utc)
            month_start = datetime.datetime(dt.year, dt.month, 1, tzinfo=datetime.timezone.utc)
            return int(month_start.timestamp() * 1000)
        else:
            return (timestamp // interval_ms) * interval_ms

    async def get_price_history(
        self, exchange_name: str, symbol: str, timeframe: str, since: int, end: int
    ) -> Dict[str, Union[str, list]]:
        timeframe_map = {
            "1m": 60000,
            "5m": 300000,
            "15m": 900000,
            "30m": 1800000,
            "1h": 3600000,
            "4h": 14400000,
            "1d": 86400000,
            "1w": 604800000,
            "1M": 2592000000,
        }

        try:
            exchange = await self.get_exchange_by_name(exchange_name)
            symbol = self.__process_symbol(symbol, exchange.id)
            
            if timeframe not in timeframe_map:
                return {"error": f"Unsupported timeframe: {timeframe}"}
            
            interval_ms = timeframe_map[timeframe]
            
            aligned_since = self._align_timeframe_boundaries(since, timeframe)
            aligned_end = self._align_timeframe_boundaries(end, timeframe)
            
            if aligned_end < end:
                aligned_end += interval_ms
            
            periods = max(1, (aligned_end - aligned_since) // interval_ms)
            
            chunks_count = (periods // 1000) + (1 if periods % 1000 else 0)
            result = []

            # print(f"Fetching {timeframe} data: since={aligned_since}, end={aligned_end}, periods={periods}, chunks={chunks_count}")

            for i in range(chunks_count):
                current_since = aligned_since + (i * 1000 * interval_ms)
                limit = min(1000, periods - (i * 1000))

                try:
                    ohlcv = await exchange.fetch_ohlcv(
                        symbol, timeframe, current_since, limit=limit
                    )

                    if not ohlcv:
                        # print(f"No OHLCV data returned for chunk {i+1}")
                        break

                    # print(f"Chunk {i+1}: Got {len(ohlcv)} candles")

                    chunk_data = []
                    for candle in ohlcv:
                        aligned_timestamp = self._align_timeframe_boundaries(candle[0], timeframe)
                        chunk_data.append({
                            "timestamp": aligned_timestamp,
                            "open": candle[1],
                            "high": candle[2],
                            "low": candle[3],
                            "close": candle[4],
                            "volume": candle[5],
                        })
                    
                    result.extend(chunk_data)

                except Exception as chunk_error:
                    print(f"Error fetching chunk {i+1}: {chunk_error}")
                    continue

            result.sort(key=lambda x: x['timestamp'])
            
            unique_result = {}
            for candle in result:
                unique_result[candle['timestamp']] = candle
            
            final_result = list(unique_result.values())
            final_result.sort(key=lambda x: x['timestamp'])

            # print(f"Final result: {len(final_result)} unique candles")
            
            filtered_result = [
                candle for candle in final_result 
                if since <= candle['timestamp'] <= end
            ]

            return {"data": filtered_result}

        except Exception as e:
            print(f"Error in get_price_history: {e}")
            return {}

    async def get_current_price(self, exchange_name: str, symbol: str) -> dict:
        """
        Get the current price for a symbol from an exchange.

        Args:
            exchange: ccxt Exchange instance
            symbol: Trading pair symbol (e.g. 'BTC/USDT')

        Returns:
            Dict: Current price
        """
        try:
            exchange = await self.get_exchange_by_name(exchange_name)
            symbol = self.__process_symbol(symbol, exchange.id)
            ticker = await exchange.fetch_ticker(symbol)
            price = ticker.get("last", 0)
            return {"price": price}
        
        except Exception as e:
            print(e)
            return {}
        
    async def close(self):
        """
        Close all exchange connections in the pool.
        """
        await self.exchange_pool.close()