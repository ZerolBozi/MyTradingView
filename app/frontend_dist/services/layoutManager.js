import { initTvWidget, setupHeaderButtons } from './multipleWidget.js';
import { chartStorage } from './chartStorage.js';

class LayoutManager {
    constructor() {
        this.currentLayout = 'single';
        this.widgets = new Map();
        this.containers = new Map();
        this.layoutContainer = null;
        this.isInitialized = false;
        this.mainWidget = null;
        this.activeChartId = 'chart-1';
    }

    setActiveChartId(chartId) {
        console.log(`[LayoutManager]: Setting active chart ID to ${chartId}`);
        if (this.widgets.has(chartId)) {
            this.activeChartId = chartId;
            console.log(`[LayoutManager]: Active chart set to ${chartId}`);
        }
    }

    getActiveChartId() {
        return this.activeChartId || 'chart-1';
    }

    init() {
        if (this.isInitialized) return;

        this.layoutContainer = document.getElementById('tv_chart_container');
        if (!this.layoutContainer) {
            console.error('Layout container not found');
            return;
        }

        this.setupSingleLayout();
        this.isInitialized = true;
        console.log('[LayoutManager]: Initialized with single layout');
    }

    async setupSingleLayout() {
        this.clearLayout();
        this.currentLayout = 'single';

        const container = this.createChartContainer('chart-1', '100%', '100%');
        this.layoutContainer.appendChild(container);

        const widget = this.initializeChart('chart-1', {
            symbol: "BINANCE:BTCUSDT",
            interval: "1D"
        }, true);

        this.containers.set('chart-1', container);
        this.widgets.set('chart-1', widget);
        this.mainWidget = widget;
        this.setActiveChartId('chart-1');

        await this.loadLatestChartForMainWidget(widget);

        console.log('[LayoutManager]: Single layout setup complete');
    }

    async setupDualHorizontalLayout() {
        this.clearLayout();
        this.currentLayout = 'dual-horizontal';

        const mainContainer = document.createElement('div');
        mainContainer.style.cssText = `display: flex; width: 100%; height: 100%; flex-direction: row; gap: 2px;`;

        const container1 = this.createChartContainer('chart-1', '50%', '100%');
        const container2 = this.createChartContainer('chart-2', '50%', '100%');

        mainContainer.appendChild(container1);
        mainContainer.appendChild(container2);
        this.layoutContainer.appendChild(mainContainer);

        const widget1 = this.initializeChart('chart-1', { symbol: "BINANCE:BTCUSDT", interval: "1D" }, true);
        const widget2 = this.initializeChart('chart-2', { symbol: "BINANCE:ETHUSDT", interval: "1D" }, false);

        this.containers.set('chart-1', container1);
        this.containers.set('chart-2', container2);
        this.widgets.set('chart-1', widget1);
        this.widgets.set('chart-2', widget2);
        this.mainWidget = widget1;
        this.setActiveChartId('chart-1');

        await this.loadLatestChartForMainWidget(widget1)
        await this.loadLatestChartForMainWidget(widget2);

        console.log('[LayoutManager]: Dual horizontal layout setup complete');
    }

    async setupDualVerticalLayout() {
        this.clearLayout();
        this.currentLayout = 'dual-vertical';

        const mainContainer = document.createElement('div');
        mainContainer.style.cssText = `display: flex; width: 100%; height: 100%; flex-direction: column; gap: 2px;`;

        const container1 = this.createChartContainer('chart-1', '100%', '50%');
        const container2 = this.createChartContainer('chart-2', '100%', '50%');

        mainContainer.appendChild(container1);
        mainContainer.appendChild(container2);
        this.layoutContainer.appendChild(mainContainer);

        const widget1 = this.initializeChart('chart-1', { symbol: "BINANCE:BTCUSDT", interval: "1D" }, true);
        const widget2 = this.initializeChart('chart-2', { symbol: "BINANCE:ETHUSDT", interval: "1h" }, false);

        this.containers.set('chart-1', container1);
        this.containers.set('chart-2', container2);
        this.widgets.set('chart-1', widget1);
        this.widgets.set('chart-2', widget2);
        this.mainWidget = widget1;
        this.setActiveChartId('chart-1');

        await this.loadLatestChartForMainWidget(widget1);
        await this.loadLatestChartForMainWidget(widget2);

        console.log('[LayoutManager]: Dual vertical layout setup complete');
    }

    async setupQuadLayout() {
        this.clearLayout();
        this.currentLayout = 'quad';

        const mainContainer = document.createElement('div');
        mainContainer.style.cssText = `display: flex; width: 100%; height: 100%; flex-direction: column; gap: 2px;`;

        const topRow = document.createElement('div');
        topRow.style.cssText = `display: flex; width: 100%; height: 50%; flex-direction: row; gap: 2px;`;

        const bottomRow = document.createElement('div');
        bottomRow.style.cssText = `display: flex; width: 100%; height: 50%; flex-direction: row; gap: 2px;`;

        const container1 = this.createChartContainer('chart-1', '50%', '100%');
        const container2 = this.createChartContainer('chart-2', '50%', '100%');
        const container3 = this.createChartContainer('chart-3', '50%', '100%');
        const container4 = this.createChartContainer('chart-4', '50%', '100%');

        topRow.appendChild(container1);
        topRow.appendChild(container2);
        bottomRow.appendChild(container3);
        bottomRow.appendChild(container4);

        mainContainer.appendChild(topRow);
        mainContainer.appendChild(bottomRow);
        this.layoutContainer.appendChild(mainContainer);

        const widget1 = this.initializeChart('chart-1', { symbol: "BINANCE:BTCUSDT", interval: "1D" }, true);
        const widget2 = this.initializeChart('chart-2', { symbol: "BINANCE:BTCUSDT", interval: "1D" }, false);
        const widget3 = this.initializeChart('chart-3', { symbol: "BINANCE:BTCUSDT", interval: "1D" }, false);
        const widget4 = this.initializeChart('chart-4', { symbol: "BINANCE:BTCUSDT", interval: "1D" }, false);

        this.containers.set('chart-1', container1);
        this.containers.set('chart-2', container2);
        this.containers.set('chart-3', container3);
        this.containers.set('chart-4', container4);

        this.widgets.set('chart-1', widget1);
        this.widgets.set('chart-2', widget2);
        this.widgets.set('chart-3', widget3);
        this.widgets.set('chart-4', widget4);

        this.mainWidget = widget1;
        this.setActiveChartId('chart-1');

        await this.loadLatestChartForMainWidget(widget1);
        await this.loadLatestChartForMainWidget(widget2);
        await this.loadLatestChartForMainWidget(widget3);
        await this.loadLatestChartForMainWidget(widget4);

        console.log('[LayoutManager]: Quad layout setup complete');
    }

    async loadLatestChartForMainWidget(widget) {
        if (!widget) {
            console.warn('[LayoutManager]: Widget is null, cannot load latest chart');
            return;
        }

        try {
            console.log('[LayoutManager]: Attempting to load latest chart for main widget');

            widget.onChartReady(async () => {
                try {
                    const latestChart = await chartStorage.getLastestChart();

                    if (latestChart && latestChart.content) {
                        console.log('[LayoutManager]: Loading latest chart template:', latestChart.name || 'Unnamed');
                        widget.loadChartFromServer(latestChart);
                    } else {
                        console.log('[LayoutManager]: No recent template to load for main widget');
                    }
                } catch (error) {
                    console.error('[LayoutManager]: Error loading latest chart template:', error);
                }
            });
        } catch (error) {
            console.error('[LayoutManager]: Error setting up latest chart loading:', error);
        }
    }

    createChartContainer(id, width, height) {
        const container = document.createElement('div');
        container.id = id;
        container.style.cssText = `width: ${width}; height: ${height}; position: relative; background-color: #131722; border-radius: 4px; overflow: hidden; flex-shrink: 0;`;
        return container;
    }

    initializeChart(containerId, options = {}, isMainWidget = false) {
        const defaultOptions = { symbol: "BINANCE:BTCUSDT", interval: "1D", theme: "dark" };
        const chartOptions = { ...defaultOptions, ...options };

        try {
            const widget = initTvWidget(containerId, chartOptions);

            widget.onChartReady(() => {
                console.log(`[LayoutManager]: Chart ${containerId} is ready`);
                this.applyChartCustomizations(widget);

                setupHeaderButtons(widget, containerId, isMainWidget);

                console.log(`[LayoutManager]: Header buttons setup for ${isMainWidget ? 'main' : 'secondary'} widget ${containerId}`);
            });

            return widget;
        } catch (error) {
            console.error(`[LayoutManager]: Error initializing chart ${containerId}:`, error);
            return null;
        }
    }

    applyChartCustomizations(widget) {
        try {
            widget.chart().applyOverrides({
                'paneProperties.horzGridProperties.color': 'rgba(42, 46, 57, 0.00)',
                'paneProperties.vertGridProperties.color': 'rgba(42, 46, 57, 0.00)'
            });
        } catch (error) {
            console.error('[LayoutManager]: Error applying chart customizations:', error);
        }
    }

    clearLayout() {
        this.widgets.forEach((widget, id) => {
            try {
                if (widget && typeof widget.remove === 'function') {
                    widget.remove();
                }
            } catch (error) {
                console.error(`[LayoutManager]: Error removing widget ${id}:`, error);
            }
        });

        if (this.layoutContainer) {
            this.layoutContainer.innerHTML = '';
        }

        this.widgets.clear();
        this.containers.clear();
        this.mainWidget = null;

        console.log('[LayoutManager]: Layout cleared');
    }

    switchLayout(layoutType) {
        console.log(`[LayoutManager]: Switching to ${layoutType} layout`);
        switch (layoutType) {
            case 'single': this.setupSingleLayout(); break;
            case 'dual-horizontal': this.setupDualHorizontalLayout(); break;
            case 'dual-vertical': this.setupDualVerticalLayout(); break;
            case 'quad': this.setupQuadLayout(); break;
            default:
                console.warn(`[LayoutManager]: Unknown layout type: ${layoutType}`);
        }
    }

    getCurrentLayout() { return this.currentLayout; }
    getWidget(chartId) { return this.widgets.get(chartId); }
    getMainWidget() { return this.mainWidget; }
    getAllWidgets() { return Array.from(this.widgets.values()); }

    updateChartSymbol(chartId, symbol) {
        const widget = this.widgets.get(chartId);
        if (widget) {
            try {
                widget.chart().setSymbol(symbol);
                console.log(`[LayoutManager]: Updated chart ${chartId} symbol to ${symbol}`);
            } catch (error) {
                console.error(`[LayoutManager]: Error updating chart ${chartId} symbol:`, error);
            }
        }
    }

    updateChartInterval(chartId, interval) {
        const widget = this.widgets.get(chartId);
        if (widget) {
            try {
                widget.chart().setResolution(interval);
                console.log(`[LayoutManager]: Updated chart ${chartId} interval to ${interval}`);
            } catch (error) {
                console.error(`[LayoutManager]: Error updating chart ${chartId} interval:`, error);
            }
        }
    }

    saveLayoutConfig() {
        const config = { layout: this.currentLayout, charts: {} };
        this.widgets.forEach((widget, chartId) => {
            try {
                config.charts[chartId] = {
                    symbol: widget.chart().symbol(),
                    interval: widget.chart().resolution()
                };
            } catch (error) {
                console.error(`[LayoutManager]: Error saving config for chart ${chartId}:`, error);
            }
        });
        return config;
    }

    loadLayoutConfig(config) {
        if (!config || !config.layout) {
            console.warn('[LayoutManager]: Invalid layout config');
            return;
        }

        this.switchLayout(config.layout);
        setTimeout(() => {
            if (config.charts) {
                Object.entries(config.charts).forEach(([chartId, chartConfig]) => {
                    if (chartConfig.symbol) {
                        this.updateChartSymbol(chartId, chartConfig.symbol);
                    }
                    if (chartConfig.interval) {
                        this.updateChartInterval(chartId, chartConfig.interval);
                    }
                });
            }
        }, 1000);
    }

    destroy() {
        this.clearLayout();
        this.isInitialized = false;
        console.log('[LayoutManager]: Destroyed');
    }
}

export const layoutManager = new LayoutManager();
export default layoutManager;