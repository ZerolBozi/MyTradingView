import os
import sys
import orjson
from typing import Optional, Any

from robyn import Robyn, Request, Response, WebSocket, ALLOW_CORS, serve_html
from robyn.argument_parser import Config
from robyn.types import JSONResponse, PathParams

from app.config import settings
from app.services.service_manager import ServiceManager

class BaseResponse(JSONResponse):
    success: bool
    message: str

class BaseDataResponse(JSONResponse):
    success: bool
    data: Optional[Any] = None

config = Config()
config.disable_openapi = True
config.log_level = "ERROR"
config.fast = True

app = Robyn(
    file_object=__file__,
    config=config
)

ALLOW_CORS(app, origins=["*"])

base_dir = os.path.dirname(os.path.abspath(sys.argv[0]))
if "__compiled__" in globals():
    frontend_dir = os.path.join(base_dir, "frontend_dist")
else:
    frontend_dir = os.path.join(base_dir, "app", "frontend_dist")

app.serve_directory(route="/static", directory_path=frontend_dir)

websocket = WebSocket(app, "/quotes")
websocket_service = None

@app.startup_handler
async def startup():
    global websocket_service

    try:
        await ServiceManager.initialize_services()
        websocket_service = ServiceManager.get_websocket_service()
        print("Services initialized successfully.")

    except Exception as e:
        print(f"Error during startup: {e}")
        raise

@app.shutdown_handler
async def shutdown():
    try:
        await ServiceManager.close_services()
        print("Services shut down successfully.")

    except Exception as e:
        print(f"Error during shutdown: {e}")
        raise

@app.get("/")
async def root():
    return serve_html(os.path.join(frontend_dir, "index.html"))

@app.get(f"{settings.API_PREFIX}/markets/:exchange")
async def get_markets(path_params: PathParams) -> BaseDataResponse | Response:
    exchange = path_params["exchange"].lower()
    exchange_name = exchange.lower()
    exchange_service = ServiceManager.get_quote_service()
    markets = await exchange_service.get_exchange_markets(exchange_name)

    if not markets:
        return Response(
            status_code=500,
            headers={},
            description=f"No markets found for exchange '{exchange_name}'"
        )
    
    return BaseDataResponse(
        success=True,
        data=markets
    )

@app.get(f"{settings.API_PREFIX}/charts/latest")
async def get_latest_chart() -> BaseDataResponse | Response:
    chart_storage_db = ServiceManager.get_chart_storage_db()
    chart = await chart_storage_db.get_latest_chart()
    
    return BaseDataResponse(
        success=True,
        data=chart
    )

@app.post(f"{settings.API_PREFIX}/charts/save")
async def save_chart(request: Request) -> BaseResponse | Response:
    body = request.json()

    if not body or not all(key in body for key in ["name", "content", "symbol", "resolution"]):
        return Response(
            status_code=400,
            headers={},
            description="Invalid request body. 'name', 'content', 'symbol', and 'resolution' are required."
        )

    chart_storage_db = ServiceManager.get_chart_storage_db()
    success = await chart_storage_db.save_chart(
        name=body['name'],
        content=body['content'],
        symbol=body['symbol'],
        resolution=body['resolution'],
    )

    if not success:
        return Response(
            status_code=500,
            headers={},
            description="Failed to save chart"
        )
    
    return BaseResponse(
        success=True,
        message="Chart saved successfully"
    )

@app.get(f"{settings.API_PREFIX}/charts/load/:chart_id")
async def load_chart(path_params: PathParams) -> BaseDataResponse | Response:
    chart_id = path_params["chart_id"]
    chart_storage_db = ServiceManager.get_chart_storage_db()
    chart = await chart_storage_db.get_chart(chart_id)

    if not chart:
        return Response(
            status_code=404,
            headers={},
            description=f"Chart with ID '{chart_id}' not found."
        )
    
    return BaseDataResponse(
        success=True,
        data=chart
    )

@app.get(f"{settings.API_PREFIX}/charts/list")
async def list_charts() -> BaseDataResponse:
    chart_storage_db = ServiceManager.get_chart_storage_db()
    charts = await chart_storage_db.get_all_charts()

    return BaseDataResponse(
        success=True,
        data=charts
    )

@app.delete(f"{settings.API_PREFIX}/charts/delete/:chart_id")
async def delete_chart(path_params: PathParams) -> BaseResponse | Response:
    chart_id = path_params["chart_id"]
    chart_storage_db = ServiceManager.get_chart_storage_db()
    success = await chart_storage_db.delete_chart(chart_id)

    if not success:
        return Response(
            status_code=404,
            headers={},
            description=f"Chart with ID '{chart_id}' not found."
        )
    
    return BaseResponse(
        success=True,
        message="Chart deleted successfully"
    )

@app.get(f"{settings.API_PREFIX}/charts/watchlists")
async def get_watchlists() -> BaseDataResponse | Response:
    watch_list = ServiceManager.get_watch_list_db()
    watchlists_with_items = await watch_list.get_all_watch_lists_with_items()
    
    return BaseDataResponse(
        success=True,
        data=watchlists_with_items
    )

@app.get(f"{settings.API_PREFIX}/charts/watchlists/:watchlist_id")
async def get_watchlist(path_params: PathParams) -> BaseDataResponse | Response:
    watchlist_id = path_params["watchlist_id"]
    watch_list = ServiceManager.get_watch_list_db()
    watchlist = await watch_list.get_watch_list_items_by_id(watchlist_id)

    if not watchlist:
        return Response(
            status_code=404,
            headers={},
            description=f"Watchlist with ID '{watchlist_id}' not found."
        )
    
    return BaseDataResponse(
        success=True,
        data=watchlist
    )

@app.post(f"{settings.API_PREFIX}/charts/watchlists/create")
async def create_watchlist(request: Request) -> BaseResponse | Response:
    body = request.json()

    if not body or not body.get("name"):
        return Response(
            status_code=400,
            headers={},
            description="Invalid request body. 'name' is required."
        )

    watch_list = ServiceManager.get_watch_list_db()
    success = await watch_list.create_watch_list(body["name"], body.get("description", ""))

    if not success:
        return Response(
            status_code=500,
            headers={},
            description="Failed to create watchlist"
        )
    
    return BaseResponse(
        success=True,
        message="Watchlist created successfully"
    )

@app.put(f"{settings.API_PREFIX}/charts/watchlists/update")
async def update_watchlist(request: Request) -> BaseResponse | Response:
    body = request.json()

    if not body or not body.get("watchlist_id"):
        return Response(
            status_code=400,
            headers={},
            description="Invalid request body. 'watchlist_id' and 'name' are required."
        )

    watch_list = ServiceManager.get_watch_list_db()
    success = await watch_list.update_watch_list(
        watchlist_id=body["watchlist_id"],
        name=body.get("name", ""),
        description=body.get("description", "")
    )

    if not success:
        return Response(
            status_code=500,
            headers={},
            description="Failed to update watchlist"
        )
    
    return BaseResponse(
        success=True,
        message="Watchlist updated successfully"
    )

@app.delete(f"{settings.API_PREFIX}/charts/watchlists/delete/:watchlist_id")
async def delete_watchlist(path_params: PathParams) -> BaseResponse | Response:
    watchlist_id = path_params["watchlist_id"]
    watch_list = ServiceManager.get_watch_list_db()
    success = await watch_list.delete_watch_list(watchlist_id)

    if not success:
        return Response(
            status_code=404,
            headers={},
            description=f"Watchlist with ID '{watchlist_id}' not found."
        )
    
    return BaseResponse(
        success=True,
        message="Watchlist deleted successfully"
    )

@app.post(f"{settings.API_PREFIX}/charts/watchlists/:watchlist_id/add")
async def add_to_watchlist(path_params: PathParams, request: Request) -> BaseResponse | Response:
    watchlist_id = path_params["watchlist_id"]
    body = request.json()

    if not body or not all(key in body for key in ["symbol", "full_name", "exchange"]):
        return Response(
            status_code=400,
            headers={},
            description="Invalid request body. 'symbol' is required."
        )

    watch_list = ServiceManager.get_watch_list_db()
    success = await watch_list.add_item_to_watch_list(
        list_id=watchlist_id,
        symbol=body["symbol"],
        full_name=body['full_name'],
        exchange=body['exchange'],
        description=body.get('description', ''),
    )

    if not success:
        return Response(
            status_code=500,
            headers={},
            description="Failed to add symbol to watchlist"
        )
    
    return BaseResponse(
        success=True,
        message="Symbol added to watchlist successfully"
    )

@app.delete(f"{settings.API_PREFIX}/charts/watchlists/:watchlist_id/remove/:full_name")
async def remove_from_watchlist(path_params: PathParams) -> BaseResponse | Response:
    watchlist_id = path_params["watchlist_id"]
    full_name = path_params["full_name"]
    
    watch_list = ServiceManager.get_watch_list_db()
    success = await watch_list.remove_item_from_watch_list(
        list_id=watchlist_id,
        full_name=full_name
    )

    if not success:
        return Response(
            status_code=404,
            headers={},
            description=f"Item with full name '{full_name}' not found in watchlist '{watchlist_id}'."
        )
    
    return BaseResponse(
        success=True,
        message="Item removed from watchlist successfully"
    )

@app.get(f"{settings.API_PREFIX}/quotes/price")
async def get_current_price(request: Request) -> BaseDataResponse | Response:
    if all(key not in request.query_params for key in ["exchange", "symbol"]):
        return Response(
            status_code=400,
            headers={},
            description="Missing 'exchange' or 'symbol' query parameters."
        )
    
    exchange_name = request.query_params.get("exchange", "binance")
    symbol = request.query_params.get("symbol", "BTCUSDT")

    quote_service = ServiceManager.get_quote_service()
    price_data = await quote_service.get_current_price(exchange_name, symbol)

    if not price_data:
        return Response(
            status_code=404,
            headers={},
            description=f"Price data for {symbol} on {exchange_name} not found."
        )
    
    return BaseDataResponse(
        success=True,
        data=price_data
    )

@app.get(f"{settings.API_PREFIX}/quotes/history")
async def get_price_history(request: Request) -> BaseDataResponse | Response:
    if all(key not in request.query_params for key in ["exchange", "symbol", "timeframe", "since", "end"]):
        return Response(
            status_code=400,
            headers={},
            description="Missing 'exchange', 'symbol', 'timeframe', 'since', or 'end' query parameters."
        )

    exchange_name = request.query_params.get("exchange", "binance")
    symbol = request.query_params.get("symbol", "BTCUSDT")
    timeframe = request.query_params.get("timeframe", "1d")
    since = int(request.query_params.get("since", "0"))
    end = int(request.query_params.get("end", "0"))

    quote_service = ServiceManager.get_quote_service()
    history_data = await quote_service.get_price_history(exchange_name, symbol, timeframe, since, end)

    if not history_data:
        return Response(
            status_code=500,
            headers={},
            description="Failed to fetch price history. Please check the parameters and try again."
        )
    
    return BaseDataResponse(
        success=True,
        data=history_data["data"]
    )

@websocket.on("connect")
async def quotes_connect(ws):
    global websocket_service
    websocket_service = ServiceManager.get_websocket_service()
    print(f"WebSocket connection established: {ws.id}")
    return f"Connected to WebSocket with ID: {ws.id}"

@websocket.on("message")
async def quotes_message(ws, msg):
    global websocket_service
    try:
        data = orjson.loads(msg)
        await websocket_service.process_action(ws, data)
    except orjson.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
    except Exception as e:
        print(f"Error processing message: {e}")
    return ""

@websocket.on("close")
async def quotes_close(ws):
    global websocket_service
    try:
        await websocket_service.close(ws.id)
        print(f"WebSocket connection closed: {ws.id}")
    except Exception as e:
        print(f"Error during WebSocket cleanup: {e}")
    return "Goodbye from WebSocket"