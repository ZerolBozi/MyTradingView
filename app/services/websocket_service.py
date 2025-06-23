import orjson
import asyncio
from typing import Optional

import ccxt.pro as ccxtpro
from robyn import WebSocket

class WebSocketService:
    def __init__(self):
        self.active_connections: dict = {}
        self.subscriptions: dict = {}  # {ws_id: set(["BINANCE:BTCUSDT", ...])}
        self.symbol_subscribers: dict = {}  # {"BINANCE:BTCUSDT": set([ws_id, ...])}
        self.subscriptions_tasks: dict = {}  # {full_name: asyncio.Task}
        self.exchanges: dict = {}

    async def test(ws: WebSocket):
        print("WebSocketService is running", ws.id)

    def __get_exchange(self, exchange_name: str) -> Optional[ccxtpro.Exchange]:
        exchange_name = exchange_name.lower()

        if exchange_name in self.exchanges:
            return self.exchanges[exchange_name]

        if hasattr(ccxtpro, exchange_name):
            try:
                exchange = getattr(ccxtpro, exchange_name)()
                self.exchanges[exchange_name] = exchange
                return exchange
            except Exception as e:
                print(f"{exchange_name}: {str(e)}")
                return None
        else:
            print(f"Unsupported exchange: {exchange_name}")
            return None

    def __process_full_name(self, full_name: str) -> tuple:
        parts = full_name.split(":")
        if len(parts) != 2:
            raise ValueError(f"Invalid full name format: {full_name}")
        exchange, symbol = parts
        return exchange, symbol

    async def process_action(self, ws: WebSocket, msg: dict):
        action = msg.get("action")
        if action == "subscribe":
            full_name = msg.get("full_name")
            if full_name:
                await self.subscribe(ws, full_name)
        elif action == "unsubscribe":
            full_name = msg.get("full_name")
            if full_name:
                await self.unsubscribe(ws, full_name)
        else:
            print(f"Unknown action: {action}")

    async def subscribe(self, ws: WebSocket, full_name: str):
        self.active_connections[ws.id] = ws
        self.subscriptions.setdefault(ws.id, set()).add(full_name)
        self.symbol_subscribers.setdefault(full_name, set()).add(ws.id)

        if full_name not in self.subscriptions_tasks:
            task = asyncio.create_task(self.quotes_loop(full_name))
            self.subscriptions_tasks[full_name] = task

    async def unsubscribe(self, ws: WebSocket, full_name: str):
        self.subscriptions.get(ws.id, set()).discard(full_name)
        if not self.subscriptions.get(ws.id):
            self.subscriptions.pop(ws.id, None)

        self.symbol_subscribers.get(full_name, set()).discard(ws.id)
        if not self.symbol_subscribers.get(full_name):
            self.symbol_subscribers.pop(full_name, None)
            task = self.subscriptions_tasks.pop(full_name, None)
            if task:
                task.cancel()

    async def quotes_loop(self, full_name: str):
        exchange_name, symbol = self.__process_full_name(full_name)
        exchange = self.__get_exchange(exchange_name)

        if not exchange:
            print(f"Unsupported exchange: {exchange_name}")
            return

        try:
            while True:
                if full_name not in self.symbol_subscribers:
                    print(f"No subscribers for {full_name}, stopping loop")
                    break

                trades = await exchange.watch_trades(symbol)

                if not trades:
                    print(f"No trades data for {full_name}, retrying...")
                    await asyncio.sleep(0.1)
                    continue

                latest_trade = trades[-1]
                price = float(latest_trade.get('price', 0))
                quantity = float(latest_trade.get('amount', 0))

                if price <= 0 or quantity <= 0:
                    print(f"Invalid trade data for {full_name}: price={price}, quantity={quantity}")
                    await asyncio.sleep(0.1)
                    continue

                message = {
                    "exchange": exchange_name,
                    "symbol": symbol,
                    "price": price,
                    "quantity": quantity,
                    "timestamp": latest_trade.get('timestamp'),
                    "trade_id": latest_trade.get('id'),
                    "side": latest_trade.get('side'),
                    "raw_timestamp": latest_trade.get('timestamp')
                }

                subscribers = self.symbol_subscribers.get(full_name, set())
                inactive_ws_ids = set()

                for ws_id in list(subscribers):
                    ws = self.active_connections.get(ws_id)
                    if not ws:
                        print(f"WebSocket {ws_id} not found in active connections")
                        inactive_ws_ids.add(ws_id)
                        continue

                    try:
                        await ws.async_send_to(ws_id, orjson.dumps(message).decode("utf-8"))
                    except Exception as e:
                        print(f"Error sending message to {ws_id}: {str(e)}")
                        inactive_ws_ids.add(ws_id)

                for ws_id in inactive_ws_ids:
                    await self.close(ws_id)

        except asyncio.CancelledError:
            print(f"quotes_loop task for {full_name} was cancelled")

    async def close(self, ws_id: str):
        subscribed_symbols = self.subscriptions.pop(ws_id, set())
        for symbol in subscribed_symbols:
            self.symbol_subscribers.get(symbol, set()).discard(ws_id)
            if not self.symbol_subscribers.get(symbol):
                self.symbol_subscribers.pop(symbol, None)
                # cancel associated task
                task = self.subscriptions_tasks.pop(symbol, None)
                if task:
                    task.cancel()

        self.active_connections.pop(ws_id, None)
        print(f"Cleaned up for ws_id {ws_id}")
