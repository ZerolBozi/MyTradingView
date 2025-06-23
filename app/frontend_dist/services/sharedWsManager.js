import { URL } from '../config.js';

const wsMap = new Map(); // key: "exchange:symbol", value: { ws, listeners, reconnectAttempts }

function debounce(fn, delay = 50) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

function connectWS(key, exchange, symbol) {
    const entry = wsMap.get(key);
    if (!entry) return;

    const ws = new WebSocket(`${URL}/quotes`);
    entry.ws = ws;
    entry.reconnectAttempts++;

    ws.onopen = () => {
        ws.send(JSON.stringify({ action: 'subscribe', full_name: `${exchange.toUpperCase()}:${symbol}` }));
    };

    ws.onmessage = debounce((event) => {
        const data = JSON.parse(event.data);
        entry.listeners.forEach(cb => cb(data));
    }, 50);

    ws.onerror = (err) => console.error(`[WS][${key}] error`, err);

    ws.onclose = () => {
        console.warn(`[WS][${key}] closed. Reconnecting...`);
        if (entry.reconnectAttempts < 5) {
            setTimeout(() => connectWS(key, exchange, symbol), 1000 * entry.reconnectAttempts);
        } else {
            console.error(`[WS][${key}] too many reconnects, removing.`);
            wsMap.delete(key);
        }
    };
}

export function subscribeSymbol({ exchange, symbol, onData }) {
    const key = `${exchange}:${symbol}`;

    if (!wsMap.has(key)) {
        wsMap.set(key, { ws: null, listeners: new Set(), reconnectAttempts: 0 });
        connectWS(key, exchange, symbol);
    }

    const entry = wsMap.get(key);
    entry.listeners.add(onData);

    return () => {
        entry.listeners.delete(onData);
        if (entry.listeners.size === 0) {
            const ws = entry.ws;
            if (ws?.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ action: 'unsubscribe', full_name: `${exchange.toUpperCase()}:${symbol}` }));
            }
            ws?.close();
            wsMap.delete(key);
        }
    };
}

export function getActiveWSSubscriptions() {
    return Array.from(wsMap.keys());
}