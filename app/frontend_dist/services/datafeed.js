import { API_BASE_URL } from '../config.js';
import { subscribeSymbol } from './sharedWsManager.js';

const lastBarsCache = new Map();
const subscribers = new Map();

function calculatePriceScale(price) {
    if (!price || isNaN(price)) return 100;
    if (price >= 1000) return 100;
    if (price >= 100) return 1000;
    if (price >= 10) return 10000;
    if (price >= 1) return 100000;
    if (price >= 0.1) return 1000000;
    if (price >= 0.01) return 10000000;
    if (price >= 0.001) return 100000000;
    return 1000000000;
}

class BarBuilder {
    constructor(resolution) {
        this.resolution = resolution;
        this.ms = this.getMs(resolution);
        this.reset();
    }
    getMs(res) {
        const map = { '1S': 1000, '10S': 10000, '30S': 30000, '1': 60000, '5': 300000, '15': 900000, '30': 1800000, '60': 3600000, '240': 14400000, '1D': 86400000, '1W': 604800000, '1M': 2592000000 };
        return map[res] || 60000;
    }
    getBarTime(ts) {
        if (this.resolution === '1W') return Math.floor((ts - 345600000) / this.ms) * this.ms + 345600000;
        if (this.resolution === '1M') return new Date(Date.UTC(new Date(ts).getUTCFullYear(), new Date(ts).getUTCMonth(), 1)).getTime();
        return Math.floor(ts / this.ms) * this.ms;
    }
    async initHist(symbolInfo) {
        const now = Date.now(), bt = this.getBarTime(now), pt = bt - this.ms;
        const { exchange, symbol } = parseSymbol(symbolInfo);
        const url = `${API_BASE_URL}/quotes/history?exchange=${exchange}&symbol=${symbol}&timeframe=${mapRes(this.resolution)}&since=${pt}&end=${now}`;
        try {
            const d = await (await fetch(url)).json();
            d.data?.forEach(b => this.hist.set(b.timestamp, b));
            const cp = d.data.find(b => b.timestamp >= bt);
            if (cp) this.cur = { time: bt, open: cp.open, high: cp.high, low: cp.low, close: cp.close, volume: cp.volume || 0 };
            this.last = bt;
        } catch (e) { console.error('[initHist]', e); }
    }
    handle(ts, price, vol, cb) {
        const bt = this.getBarTime(ts);
        if (bt !== this.last) {
            if (this.cur) cb({ ...this.cur });
            this.last = bt; this.accVol = vol || 0;
            this.cur = { time: bt, open: price, high: price, low: price, close: price, volume: this.accVol };
        } else {
            this.accVol += vol || 0;
            if (this.cur) {
                this.cur.high = Math.max(this.cur.high, price);
                this.cur.low = Math.min(this.cur.low, price);
                this.cur.close = price;
                this.cur.volume = this.accVol;
            }
        }
        cb(this.cur);
    }
    reset() { this.cur = null; this.last = null; this.accVol = 0; this.hist = new Map(); }
}

function parseSymbol(s) {
    let [ex, sym] = s.includes(':') ? s.split(':') : ['binance', s];
    return { exchange: ex.toLowerCase(), symbol: sym.replace('/', '') };
}

function mapRes(r) {
    const m = { '1S': '1s', '10S': '10s', '30S': '30s', '1': '1m', '5': '5m', '15': '15m', '30': '30m', '60': '1h', '240': '4h', '1D': '1d', '1W': '1w', '1M': '1M', 'ticker': 'tick' };
    return m[r] || '1m';
}

const getLatestPrice = async (ex, sym) => {
    try {
        const r = await fetch(`${API_BASE_URL}/quotes/price?exchange=${ex}&symbol=${sym}`);
        const j = await r.json();
        return j.success ? j.data : null;
    } catch (e) {
        console.error('[getLatestPrice]', e);
        return null;
    }
};

export default {
    onReady: cb => cb({
        supported_resolutions: ['1S', '10S', '30S', '1', '5', '15', '30', '60', '240', '1D', '1W', '1M', 'ticker'],
        supports_search: true, supports_group_request: false, supports_marks: true, supports_timescale_marks: true
    }),

    resolveSymbol: async (symbolName, onResolved, onError) => {
        const { exchange, symbol } = parseSymbol(symbolName);
        const latestPrice = await getLatestPrice(exchange, symbol);

        onResolved({
            name: symbolName, description: symbol, type: 'crypto', session: '24x7', timezone: 'Etc/UTC',
            exchange: exchange.toUpperCase(), minmov: 1, pricescale: calculatePriceScale(latestPrice), has_intraday: true,
            has_seconds: true, has_ticks: true, has_daily: true, has_weekly_and_monthly: true,
            supported_resolutions: ['1S', '10S', '30S', '1', '5', '15', '30', '60', '240', '1D', '1W', '1M', 'ticker'],
            volume_precision: 8, data_status: 'streaming', intraday_multipliers: ['1S', '10S', '30S', '1', '5', '15', '30', '60', '240']
        });
    },

    getBars: async (symbolInfo, resolution, { from, to, firstDataRequest }, onHistory, onError) => {
        try {
            const { exchange, symbol } = parseSymbol(symbolInfo.name);
            const url = `${API_BASE_URL}/quotes/history?exchange=${exchange}&symbol=${symbol}&timeframe=${mapRes(resolution)}&since=${from * 1000}&end=${to * 1000}`;
            const d = await (await fetch(url)).json();
            const bars = d.data?.map(b => ({ time: b.timestamp, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume || 0 })) || [];
            if (firstDataRequest && bars.length) lastBarsCache.set(symbolInfo.name, { ...bars.at(-1) });
            onHistory(bars, { noData: !bars.length });
        } catch (e) { console.error('[getBars]', e); onError(e); }
    },

    subscribeBars: async (symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback) => {
        const { exchange, symbol } = parseSymbol(symbolInfo.name);
        const barBuilder = new BarBuilder(resolution);
        await barBuilder.initHist(symbolInfo.name);
        const unsub = subscribeSymbol({
            exchange,
            symbol,
            onData: d => barBuilder.handle(d.timestamp, d.price, d.quantity || 0, onRealtimeCallback)
        });
        subscribers.set(subscriberUID, { unsub, barBuilder });
    },

    unsubscribeBars: (subscriberUID) => {
        const sub = subscribers.get(subscriberUID);
        if (sub) { sub.unsub(); sub.barBuilder.reset(); subscribers.delete(subscriberUID); }
    }
};