import datafeed from './datafeed.js'
import { chartStorage } from './chartStorage.js'
import watchlistModal from './watchlistModal.js'
import layoutManager from './layoutManager.js'

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]")
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search)
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "))
}

export function initTvWidget(containerId = "tv_chart_container", options = {}) {
    const defaultOptions = {
        symbol: "BINANCE:BTCUSDT",
        interval: "1D",
        theme: "dark"
    };

    const widgetOptions = { ...defaultOptions, ...options };

    var widget = new TradingView.widget({
        container_id: containerId,
        library_path: "static/charting_library/",
        datafeed: datafeed,
        autosize: true,
        fullscreen: false, // 改為false，讓多圖表可以正確顯示
        symbol: widgetOptions.symbol,
        interval: widgetOptions.interval,
        timezone: "Asia/Taipei",
        locale: getParameterByName('lang') || "zh_TW",
        theme: widgetOptions.theme,
        width: '100%',
        height: '100%',
        client_id: `local_${containerId}`, // 為每個圖表設置唯一ID
        user_id: `local_${containerId}`,
        save_load_adapter: chartStorage,
        enabled_features: [
            "study_templates",
            "use_localstorage_for_settings",
            "show_price_scale_labels",
            'header_in_fullscreen_mode',
            'side_toolbar_in_fullscreen_mode',
        ],
        disabled_features: [
            'header_fullscreen_button', // 在多圖表模式下禁用全屏按鈕
        ],
        enable_publishing: false,
        favorites: {
            intervals: ["1", "5", "15", "30", "60", "240", "1D", "1W", "1M"],
            chartTypes: ["Candles"]
        },
        custom_shortcuts: [
            {
                keys: ['ctrl', '1'],
                action: 'switch_to_single_layout'
            },
            {
                keys: ['ctrl', '2'],
                action: 'switch_to_dual_horizontal_layout'
            },
            {
                keys: ['ctrl', '3'],
                action: 'switch_to_dual_vertical_layout'
            },
            {
                keys: ['ctrl', '4'],
                action: 'switch_to_quad_layout'
            },
            {
                keys: ['shift', 'w'],
                action: 'open_watchlist'
            }
        ]
    })

    widget.onChartReady(() => {
        setupTradingViewKeyboardEvents(widget, containerId);
    });

    return widget
}

function setupTradingViewKeyboardEvents(widget, containerId) {
    try {
        if (widget.chart && widget.chart().createStudy) {
            const shortcuts = [
                {
                    keys: 'Ctrl+1',
                    handler: async () => {
                        console.log('[TradingView Shortcut]: Switching to single layout');
                        await layoutManager.switchLayout('single');
                    }
                },
                {
                    keys: 'Ctrl+2',
                    handler: async () => {
                        console.log('[TradingView Shortcut]: Switching to dual horizontal layout');
                        await layoutManager.switchLayout('dual-horizontal');
                    }
                },
                {
                    keys: 'Ctrl+3',
                    handler: async () => {
                        console.log('[TradingView Shortcut]: Switching to dual vertical layout');
                        await layoutManager.switchLayout('dual-vertical');
                    }
                },
                {
                    keys: 'Ctrl+4',
                    handler: async () => {
                        console.log('[TradingView Shortcut]: Switching to quad layout');
                        await layoutManager.switchLayout('quad');
                    }
                },
                {
                    keys: 'Shift+W',
                    handler: () => {
                        console.log('[TradingView Shortcut]: Opening watchlist');
                        layoutManager.setActiveChartId(containerId);
                        watchlistModal.openWatchlistModal();
                    }
                }
            ];

            shortcuts.forEach(shortcut => {
                try {
                    if (widget.subscribe && typeof widget.subscribe === 'function') {
                        widget.subscribe('keyboard_shortcut', shortcut.keys, shortcut.handler);
                    }
                } catch (error) {
                    console.warn(`[setupTradingViewKeyboardEvents]: Could not register shortcut ${shortcut.keys}:`, error);
                }
            });
        }

        const container = document.getElementById(containerId);
        if (container) {
            container.setAttribute('tabindex', '0');

            container.addEventListener('keydown', async (e) => {
                if (e.target.closest(`#${containerId}`)) {
                    try {
                        if (e.ctrlKey && e.key === '1') {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('[Container Shortcut]: Switching to single layout');
                            await layoutManager.switchLayout('single');
                            return;
                        }
                        if (e.ctrlKey && e.key === '2') {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('[Container Shortcut]: Switching to dual horizontal layout');
                            await layoutManager.switchLayout('dual-horizontal');
                            return;
                        }
                        if (e.ctrlKey && e.key === '3') {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('[Container Shortcut]: Switching to dual vertical layout');
                            await layoutManager.switchLayout('dual-vertical');
                            return;
                        }
                        if (e.ctrlKey && e.key === '4') {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('[Container Shortcut]: Switching to quad layout');
                            await layoutManager.switchLayout('quad');
                            return;
                        }
                        if (e.shiftKey && e.key.toLowerCase() === 'w') {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('[Container Shortcut]: Opening watchlist');
                            layoutManager.setActiveChartId(containerId);
                            watchlistModal.openWatchlistModal();
                            return;
                        }
                    } catch (error) {
                        console.error('[Container Shortcut]: Error in keyboard shortcut handler:', error);
                    }
                }
            }, true);

            console.log(`[setupTradingViewKeyboardEvents]: Container keyboard events setup for ${containerId}`);
        }

        setTimeout(() => {
            try {
                const iframe = container?.querySelector('iframe');
                if (iframe && iframe.contentDocument) {
                    iframe.contentDocument.addEventListener('keydown', async (e) => {
                        try {
                            if (e.ctrlKey && ['1', '2', '3', '4'].includes(e.key)) {
                                e.preventDefault();
                                e.stopPropagation();

                                const layoutMap = {
                                    '1': 'single',
                                    '2': 'dual-horizontal',
                                    '3': 'dual-vertical',
                                    '4': 'quad'
                                };

                                console.log(`[Iframe Shortcut]: Switching to ${layoutMap[e.key]} layout`);
                                await layoutManager.switchLayout(layoutMap[e.key]);
                            }

                            if (e.shiftKey && e.key.toLowerCase() === 'w') {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('[Iframe Shortcut]: Opening watchlist');
                                layoutManager.setActiveChartId(containerId);
                                watchlistModal.openWatchlistModal();
                            }
                        } catch (error) {
                            console.error('[Iframe Shortcut]: Error in keyboard shortcut handler:', error);
                        }
                    }, true);

                    console.log(`[setupTradingViewKeyboardEvents]: Iframe keyboard events setup for ${containerId}`);
                }
            } catch (error) {
                console.warn('[setupTradingViewKeyboardEvents]: Could not access iframe content:', error);
            }
        }, 1000);

    } catch (error) {
        console.error('[setupTradingViewKeyboardEvents]: Error setting up keyboard events:', error);
    }
}

export function initOnReady() {
    layoutManager.init();

    setupKeyboardShortcuts();

    setTimeout(() => {
        const mainWidget = layoutManager.getMainWidget();

        if (!mainWidget) {
            console.error('[initOnReady]: Main widget not found');
            return;
        }

        try {
            watchlistModal.initWatchlistModalWithStyles(mainWidget);
            console.log('[initOnReady]: Watchlist modal initialized');
        } catch (error) {
            console.error('[initOnReady]: Error initializing watchlist modal:', error);
        }

        mainWidget.onChartReady(async function () {
            try {
                mainWidget.chart().applyOverrides({
                    'paneProperties.horzGridProperties.color': 'rgba(42, 46, 57, 0.00)',
                    'paneProperties.vertGridProperties.color': 'rgba(42, 46, 57, 0.00)'
                });

                const latestChart = await chartStorage.getLastestChart();

                console.log('[onChartReady]: Latest chart:', latestChart?.content);
                if (latestChart && latestChart.content) {
                    console.log('[onChartReady]: Loading latest chart template:', latestChart.name || 'Unnamed');
                    mainWidget.loadChartFromServer(latestChart);
                } else {
                    console.log('[onChartReady]: No recent template to load');
                }
            } catch (error) {
                console.error('[onChartReady]: Error loading latest chart template:', error);
            }
        });
    }, 100);
}

export function setupHeaderButtons(widget, containerId, isMainWidget = true) {
    if (!widget) {
        console.error('[setupHeaderButtons]: Widget is null or undefined');
        return;
    }

    widget.headerReady().then(function () {
        console.log(`[setupHeaderButtons]: Header is ready for ${isMainWidget ? 'main' : 'secondary'} widget, setting up buttons`);

        function createHeaderButton(text, title, clickHandler, options = {}) {
            try {
                var button = widget.createButton(options);
                button.setAttribute('title', title);
                button.textContent = text;
                button.addEventListener('click', clickHandler);
                console.log(`[setupHeaderButtons]: Created button: ${text}`);
                return button;
            } catch (error) {
                console.error(`[setupHeaderButtons]: Error creating button ${text}:`, error);
                return null;
            }
        }

        createHeaderButton(
            '🌓',
            '切換主題 (Toggle Theme)',
            function () {
                try {
                    const currentTheme = widget.getTheme();
                    console.log('[themeButton]: Current theme:', currentTheme);
                    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
                    const newBackgroundColor = newTheme === 'light' ? '#FFFFFF' : '#131722';
                    console.log('[themeButton]: New theme:', newTheme, 'New background color:', newBackgroundColor);

                    layoutManager.getAllWidgets().forEach(w => {
                        if (w && typeof w.changeTheme === 'function') {
                            w.changeTheme(newTheme).then(() => {
                                w.chart().applyOverrides({
                                    'paneProperties.background': newBackgroundColor,
                                    'paneProperties.horzGridProperties.color': 'rgba(42, 46, 57, 0.00)',
                                    'paneProperties.vertGridProperties.color': 'rgba(42, 46, 57, 0.00)'
                                });
                            }).catch(error => {
                                console.error('[themeButton]: Error changing theme:', error);
                            });
                        }
                    });

                    this.textContent = newTheme === 'light' ? '🌙' : '☀️';
                } catch (error) {
                    console.error('[themeButton]: Error in theme toggle:', error);
                }
            },
            { align: 'right' }
        );

        createHeaderButton(
            '📂開啟清單',
            '觀察清單 (Shift + W)',
            function () {
                layoutManager.setActiveChartId(containerId);
                console.log('[watchlistButton]: Opening watchlist modal for chart:', containerId);
                try {
                    watchlistModal.openWatchlistModal();
                } catch (error) {
                    console.error('[watchlistButton]: Error opening watchlist modal:', error);
                }
            },
            { align: 'left' }
        );

        if (isMainWidget) {
            createHeaderButton(
                '📊佈局',
                '切換圖表佈局',
                async function () {
                    try {
                        await showLayoutModal();
                    } catch (error) {
                        console.error('[layoutButton]: Error showing layout modal:', error);
                    }
                },
                { align: 'left' }
            );
        }

        console.log(`[setupHeaderButtons]: All header buttons setup completed for ${isMainWidget ? 'main' : 'secondary'} widget`);
    }).catch(error => {
        console.error('[setupHeaderButtons]: Error in headerReady:', error);
    });
}

function setupKeyboardShortcuts() {
    if (window.keyboardShortcutsSetup) {
        return;
    }

    document.addEventListener('keydown', async (e) => {
        try {
            if (e.shiftKey && e.key.toLowerCase() === 'w') {
                e.preventDefault();
                watchlistModal.openWatchlistModal();
            }

            if (e.ctrlKey && e.key === '1') {
                e.preventDefault();
                await layoutManager.switchLayout('single');
            }
            if (e.ctrlKey && e.key === '2') {
                e.preventDefault();
                await layoutManager.switchLayout('dual-horizontal');
            }
            if (e.ctrlKey && e.key === '3') {
                e.preventDefault();
                await layoutManager.switchLayout('dual-vertical');
            }
            if (e.ctrlKey && e.key === '4') {
                e.preventDefault();
                await layoutManager.switchLayout('quad');
            }
        } catch (error) {
            console.error('[setupKeyboardShortcuts]: Error in keyboard shortcut handler:', error);
        }
    });

    window.keyboardShortcutsSetup = true;
    console.log('[setupKeyboardShortcuts]: Keyboard shortcuts setup completed');
}

async function showLayoutModal() {
    const existingModal = document.querySelector('[data-layout-modal]');
    if (existingModal) {
        return;
    }

    const modal = document.createElement('div');
    modal.setAttribute('data-layout-modal', 'true');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background-color: #2a2d3a;
        border-radius: 8px;
        padding: 20px;
        min-width: 300px;
        color: white;
    `;

    const title = document.createElement('h3');
    title.textContent = '選擇圖表佈局';
    title.style.cssText = `
        margin: 0 0 20px 0;
        color: #ffffff;
        text-align: center;
    `;

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 10px;
    `;

    const layouts = [
        { id: 'single', name: '📱 單圖表', desc: '顯示一個圖表 (Ctrl+1)' },
        { id: 'dual-horizontal', name: '📊 雙圖表 (水平)', desc: '並排顯示兩個圖表 (Ctrl+2)' },
        { id: 'dual-vertical', name: '📈 雙圖表 (垂直)', desc: '上下顯示兩個圖表 (Ctrl+3)' },
        { id: 'quad', name: '📋 四圖表 (2x2)', desc: '2x2 網格顯示四個圖表 (Ctrl+4)' }
    ];

    layouts.forEach(layout => {
        const button = document.createElement('button');
        button.style.cssText = `
            padding: 12px 16px;
            background-color: ${layoutManager.getCurrentLayout() === layout.id ? '#1976d2' : '#404040'};
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            text-align: left;
            transition: background-color 0.2s;
        `;

        button.innerHTML = `
            <div style="font-weight: bold;">${layout.name}</div>
            <div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">${layout.desc}</div>
        `;

        button.addEventListener('mouseenter', () => {
            if (layoutManager.getCurrentLayout() !== layout.id) {
                button.style.backgroundColor = '#505050';
            }
        });

        button.addEventListener('mouseleave', () => {
            if (layoutManager.getCurrentLayout() !== layout.id) {
                button.style.backgroundColor = '#404040';
            }
        });

        button.addEventListener('click', async () => {
            try {
                button.style.opacity = '0.6';
                button.style.cursor = 'wait';

                await layoutManager.switchLayout(layout.id);

                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }
            } catch (error) {
                console.error('[showLayoutModal]: Error switching layout:', error);

                button.style.opacity = '1';
                button.style.cursor = 'pointer';
            }
        });

        buttonContainer.appendChild(button);
    });

    const closeButton = document.createElement('button');
    closeButton.textContent = '取消';
    closeButton.style.cssText = `
        margin-top: 15px;
        padding: 8px 16px;
        background-color: #666;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        width: 100%;
    `;
    closeButton.addEventListener('click', () => {
        if (document.body.contains(modal)) {
            document.body.removeChild(modal);
        }
    });

    modalContent.appendChild(title);
    modalContent.appendChild(buttonContainer);
    modalContent.appendChild(closeButton);
    modal.appendChild(modalContent);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        }
    });

    const handleEscKey = (e) => {
        if (e.key === 'Escape') {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
            document.removeEventListener('keydown', handleEscKey);
        }
    };
    document.addEventListener('keydown', handleEscKey);

    document.body.appendChild(modal);
}

export default {
    initOnReady,
    initTvWidget,
    setupHeaderButtons
}