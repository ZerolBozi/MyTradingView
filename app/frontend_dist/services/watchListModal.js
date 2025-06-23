import layoutManager from './layoutManager.js'
import { watchList } from './watchList.js'
import { API_BASE_URL } from '../config.js'

// 創建觀察清單模態窗口的HTML元素
function createWatchlistModal() {
    // 檢查是否已存在模態窗口
    if (document.getElementById('watchlistModal')) {
        return;
    }

    // 新增自定義樣式
    const customStyles = document.createElement('style');
    customStyles.textContent = `
        * {
            font-family: 'Roboto', sans-serif;
        }
            
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');

        body, .modal-title, .watchlist-name, .symbol-name, .symbol-exchange, .empty-list p {
            font-family: 'Roboto', sans-serif;
        }

        .modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(21, 25, 32, 0.7);
            z-index: 9999;
            display: none;
        }
        
        .watch-modal {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: #1e222d;
            border-radius: 6px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
            width: 480px;
            max-width: 90%;
            z-index: 10000;
            display: none;
            overflow: hidden;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid #2a2e39;
            position: relative;
        }
        
        .modal-title {
            margin: 0;
            color: #e0e3eb;
            font-size: 18px;
            font-weight: 500;
            letter-spacing: 0.3px;
            text-align: center;
            flex: 1;
        }
        
        .modal-back {
            position: absolute;
            left: 16px;
            background: none;
            border: none;
            color: #787b86;
            cursor: pointer;
            font-size: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: 4px;
            padding: 0;
        }
        
        .modal-back:hover {
            background-color: rgba(250, 250, 250, 0.1);
            color: #e0e3eb;
        }
        
        .modal-close {
            position: absolute;
            right: 16px;
            background: none;
            border: none;
            color: #787b86;
            cursor: pointer;
            font-size: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: 4px;
            padding: 0;
        }
        
        .modal-close:hover {
            background-color: rgba(250, 250, 250, 0.1);
            color: #e0e3eb;
        }
        
        .modal-body {
            padding: 0;
            max-height: 500px;
            overflow-y: auto;
        }
        
        .watchlist-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 20px;
            border-bottom: 1px solid #2a2e39;
            cursor: pointer;
            transition: background-color 0.15s ease;
        }
        
        .watchlist-item:hover {
            background-color: #2a2e39;
        }
        
        .watchlist-name {
            flex-grow: 1;
            color: #e0e3eb;
            font-size: 16px;
            font-weight: 400;
        }
        
        .watchlist-actions {
            display: flex;
            gap: 8px;
        }
        
        .watchlist-btn {
            background: rgba(250, 250, 250, 0.05);
            border: none;
            border-radius: 4px;
            color: #a3a6af;
            cursor: pointer;
            padding: 6px;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .watchlist-btn:hover {
            background-color: rgba(250, 250, 250, 0.1);
            color: #e0e3eb;
        }
        
        .watchlist-btn.edit:hover {
            color: #2962ff;
        }
        
        .watchlist-btn.delete:hover {
            color: #ff4a68;
        }
        
        .modal-footer {
            padding: 16px 20px;
            border-top: 1px solid #2a2e39;
        }
        
        .add-list-btn, .add-symbol-btn {
            width: 100%;
            background-color: #2962ff;
            border: none;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            padding: 10px 0;
            font-size: 15px;
            font-weight: 500;
            transition: background-color 0.15s ease;
        }
        
        .add-list-btn:hover, .add-symbol-btn:hover {
            background-color: #1e53e5;
        }
        
        /* 空清單提示樣式 */
        .empty-list {
            padding: 50px 20px;
            text-align: center;
            color: #787b86;
        }
        
        .empty-list p {
            margin: 8px 0;
            font-size: 15px;
        }
        
        /* 商品項目列表樣式 */
        .symbol-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 20px;
            border-bottom: 1px solid #2a2e39;
            cursor: pointer;
            transition: background-color 0.15s ease;
        }
        
        .symbol-item:hover {
            background-color: #2a2e39;
        }
        
        .symbol-info {
            display: flex;
            flex-direction: column;
        }
        
        .symbol-name {
            color: #e0e3eb;
            font-size: 16px;
            font-weight: 500;
        }
        
        .symbol-exchange {
            font-size: 13px;
            font-weight: 400;
            color: #787b86;
            letter-spacing: 0.2px;
            margin-top: 3px;
        }
        
        .symbol-remove {
            background: rgba(250, 250, 250, 0.05);
            border: none;
            border-radius: 4px;
            color: #a3a6af;
            cursor: pointer;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.15s ease;
        }
        
        .symbol-remove:hover {
            background-color: rgba(255, 74, 104, 0.1);
            color: #ff4a68;
        }
        
        /* 輸入框和表單樣式 */
        .form-container {
            padding: 30px;
        }
        
        .form-group {
            margin-bottom: 24px;
        }
        
        .form-label {
            display: block;
            margin-bottom: 8px;
            color: #e0e3eb;
            font-size: 15px;
            font-weight: 500;
        }
        
        .form-input {
            width: 100%;
            padding: 12px;
            background-color: rgba(250, 250, 250, 0.05);
            border: 1px solid #2a2e39;
            border-radius: 4px;
            color: #e0e3eb;
            font-size: 15px;
            transition: border-color 0.15s ease;
            box-sizing: border-box;
        }
        
        .form-input:focus {
            outline: none;
            border-color: #2962ff;
            box-shadow: 0 0 0 1px rgba(41, 98, 255, 0.3);
        }
        
        .form-input::placeholder {
            color: #5d6069;
        }
        
        .form-buttons {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 24px;
        }
        
        .btn-cancel {
            background-color: transparent;
            border: 1px solid #2a2e39;
            border-radius: 4px;
            color: #e0e3eb;
            cursor: pointer;
            padding: 10px 16px;
            font-size: 15px;
            font-weight: 500;
            transition: all 0.15s ease;
        }
        
        .btn-cancel:hover {
            background-color: rgba(250, 250, 250, 0.05);
        }
        
        .btn-save {
            background-color: #2962ff;
            border: none;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            padding: 10px 16px;
            font-size: 15px;
            font-weight: 500;
            transition: background-color 0.15s ease;
        }
        
        .btn-save:hover {
            background-color: #1e53e5;
        }
        
        /* 商品搜尋頁面樣式 */
        .market-search-container {
            padding: 20px;
        }
        
        .search-input-container {
            position: relative;
            margin-bottom: 20px;
        }
        
        .search-input {
            width: 100%;
            padding: 12px 12px 12px 40px;
            background-color: rgba(250, 250, 250, 0.05);
            border: 1px solid #2a2e39;
            border-radius: 4px;
            color: #e0e3eb;
            font-size: 15px;
            box-sizing: border-box;
        }
        
        .search-input:focus {
            outline: none;
            border-color: #2962ff;
        }
        
        .search-icon {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: #787b86;
        }
        
        .exchange-selector {
            width: 100%;
            margin-bottom: 20px;
            background-color: rgba(250, 250, 250, 0.05);
            border: 1px solid #2a2e39;
            border-radius: 4px;
            color: #e0e3eb;
            font-size: 15px;
            padding: 12px;
        }
        
        .exchange-selector option {
            background-color: #1e222d;
            color: #e0e3eb;
        }
        
        .market-list {
            max-height: 350px;
            overflow-y: auto;
        }
        
        .market-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 15px;
            border-bottom: 1px solid #2a2e39;
            cursor: pointer;
        }
        
        .market-item:hover {
            background-color: #2a2e39;
        }
        
        .market-item-info {
            display: flex;
            flex-direction: column;
        }
        
        .market-symbol {
            color: #e0e3eb;
            font-size: 16px;
            font-weight: 500;
        }
        
        .market-name {
            color: #787b86;
            font-size: 13px;
            margin-top: 2px;
        }
        
        .market-add-btn {
            background-color: rgba(41, 98, 255, 0.1);
            border: none;
            border-radius: 4px;
            color: #2962ff;
            cursor: pointer;
            padding: 6px 12px;
            font-size: 14px;
            transition: all 0.15s ease;
        }
        
        .market-add-btn:hover {
            background-color: rgba(41, 98, 255, 0.2);
        }
        
        .exchange-label {
            display: inline-block;
            padding: 2px 6px;
            background-color: rgba(250, 250, 250, 0.1);
            border-radius: 3px;
            font-size: 12px;
            color: #a3a6af;
            margin-left: 8px;
        }
    `;
    document.head.appendChild(customStyles);

    // 創建背景遮罩
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = 'modalBackdrop';

    // 創建觀察清單模態窗口
    const modal = document.createElement('div');
    modal.className = 'watch-modal';
    modal.id = 'watchlistModal';
    modal.innerHTML = `
        <div class="modal-header">
            <h3 class="modal-title">觀察清單</h3>
            <button class="modal-close" id="closeWatchlistBtn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="currentColor"/>
                </svg>
            </button>
        </div>
        <div class="modal-body" id="watchlistContent">
            <!-- 這裡會動態加載觀察清單 -->
        </div>
        <div class="modal-footer">
            <button class="add-list-btn" id="addWatchlistBtn">新增觀察清單</button>
        </div>
    `;

    // 創建新增觀察清單模態窗口
    const addModal = document.createElement('div');
    addModal.className = 'watch-modal';
    addModal.id = 'addWatchlistModal';
    addModal.style.display = 'none';
    addModal.innerHTML = `
        <div class="modal-header">
            <h3 class="modal-title">新增觀察清單</h3>
            <button class="modal-close" id="closeAddModalBtn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="currentColor"/>
                </svg>
            </button>
        </div>
        <div class="form-container">
            <div class="form-group">
                <label class="form-label" for="watchlistName">清單名稱</label>
                <input type="text" class="form-input" id="watchlistName" placeholder="請輸入清單名稱">
            </div>
            <div class="form-group">
                <label class="form-label" for="watchlistDesc">描述 (選填)</label>
                <input type="text" class="form-input" id="watchlistDesc" placeholder="請輸入清單描述">
            </div>
            <div class="form-buttons">
                <button class="btn-cancel" id="cancelAddBtn">取消</button>
                <button class="btn-save" id="saveWatchlistBtn">儲存</button>
            </div>
        </div>
    `;

    // 創建新增商品模態窗口
    const marketModal = document.createElement('div');
    marketModal.className = 'watch-modal';
    marketModal.id = 'marketModal';
    marketModal.style.display = 'none';
    marketModal.innerHTML = `
    <div class="modal-header">
        <button class="modal-back" id="backFromMarketBtn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/>
            </svg>
        </button>
        <h3 class="modal-title">新增商品</h3>
        <button class="modal-close" id="closeMarketBtn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="currentColor"/>
            </svg>
        </button>
    </div>
    <div class="market-search-container">
        <div class="form-group">
            <label class="form-label" for="exchangeInput">交易所</label>
            <input type="text" class="form-input" id="exchangeInput" placeholder="請輸入交易所名稱 (例如: binance)">
        </div>
        
        <div class="search-input-container">
            <span class="search-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
                </svg>
            </span>
            <input type="text" class="search-input" id="marketSearch" placeholder="搜尋商品...">
        </div>
        
        <button class="btn-save" id="searchMarketsBtn" style="width:100%; margin-top:10px; margin-bottom:20px;">搜尋商品</button>
        
        <div class="market-list" id="marketList">
            <div class="empty-list">
                <p>請輸入交易所名稱並搜尋商品</p>
            </div>
        </div>
    </div>
`;

    // 將模態窗口和背景遮罩新增到DOM
    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
    document.body.appendChild(addModal);
    document.body.appendChild(marketModal);
}

// 顯示觀察清單模態窗口
function showWatchlistModal() {
    const modal = document.getElementById('watchlistModal');
    const backdrop = document.getElementById('modalBackdrop');
    if (modal && backdrop) {
        backdrop.style.display = 'block';
        modal.style.display = 'block';
    }
}

// 隱藏所有模態窗口
function hideAllModals() {
    const backdrop = document.getElementById('modalBackdrop');
    const watchlistModal = document.getElementById('watchlistModal');
    const addModal = document.getElementById('addWatchlistModal');
    const marketModal = document.getElementById('marketModal');

    if (backdrop) backdrop.style.display = 'none';
    if (watchlistModal) watchlistModal.style.display = 'none';
    if (addModal) addModal.style.display = 'none';
    if (marketModal) marketModal.style.display = 'none';
}

// 顯示新增觀察清單模態窗口
function showAddWatchlistModal() {
    const modal = document.getElementById('watchlistModal');
    const addModal = document.getElementById('addWatchlistModal');
    const backdrop = document.getElementById('modalBackdrop');

    if (modal) modal.style.display = 'none';
    if (addModal) addModal.style.display = 'block';
    if (backdrop) backdrop.style.display = 'block';
}

// 顯示新增商品模態窗口
function showMarketModal(listId) {
    const modal = document.getElementById('watchlistModal');
    const marketModal = document.getElementById('marketModal');
    const backdrop = document.getElementById('modalBackdrop');

    if (marketModal) {
        marketModal.setAttribute('data-list-id', listId);
        marketModal.style.display = 'block';
    }
    if (modal) modal.style.display = 'none';
    if (backdrop) backdrop.style.display = 'block';

    // 重置選項和搜索框
    const exchangeInput = document.getElementById('exchangeInput');
    const marketSearch = document.getElementById('marketSearch');
    const marketList = document.getElementById('marketList');

    if (exchangeInput) exchangeInput.value = '';
    if (marketSearch) marketSearch.value = '';
    if (marketList) {
        marketList.innerHTML = `
            <div class="empty-list">
                <p>請選擇交易所並搜尋商品</p>
            </div>
        `;
    }
}

// 返回到觀察清單主視圖
function backToWatchlists() {
    const addModal = document.getElementById('addWatchlistModal');
    const marketModal = document.getElementById('marketModal');
    const watchlistModal = document.getElementById('watchlistModal');

    if (addModal) addModal.style.display = 'none';
    if (marketModal) marketModal.style.display = 'none';
    if (watchlistModal) watchlistModal.style.display = 'block';
}

// 加載交易所商品數據
async function loadMarkets(exchange) {
    try {
        const response = await fetch(`${API_BASE_URL}/markets/${exchange}`);
        const data = await response.json();

        if (data.success && data.data) {
            return data.data.markets;
        }

        return [];
    } catch (error) {
        console.error('[loadMarkets]: Error loading markets', error);
        return [];
    }
}

// 初始化觀察清單模態窗口的事件
async function initWatchlistModal(tvWidget) {
    // 獲取各模態窗口的按鈕元素
    const closeWatchlistBtn = document.getElementById('closeWatchlistBtn');
    const addWatchlistBtn = document.getElementById('addWatchlistBtn');
    const closeAddModalBtn = document.getElementById('closeAddModalBtn');
    const cancelAddBtn = document.getElementById('cancelAddBtn');
    const saveWatchlistBtn = document.getElementById('saveWatchlistBtn');
    const backFromMarketBtn = document.getElementById('backFromMarketBtn');
    const closeMarketBtn = document.getElementById('closeMarketBtn');
    const exchangeInput = document.getElementById('exchangeInput');
    const marketSearch = document.getElementById('marketSearch');
    const searchMarketsBtn = document.getElementById('searchMarketsBtn');
    const backdrop = document.getElementById('modalBackdrop');

    // 關閉觀察清單模態窗口
    if (closeWatchlistBtn) {
        closeWatchlistBtn.addEventListener('click', hideAllModals);
    }

    // 點擊背景遮罩關閉所有模態窗口
    if (backdrop) {
        backdrop.addEventListener('click', hideAllModals);
    }

    // 打開新增觀察清單模態窗口
    if (addWatchlistBtn) {
        addWatchlistBtn.addEventListener('click', showAddWatchlistModal);
    }

    // 關閉新增觀察清單模態窗口
    if (closeAddModalBtn) {
        closeAddModalBtn.addEventListener('click', backToWatchlists);
    }

    // 取消新增觀察清單
    if (cancelAddBtn) {
        cancelAddBtn.addEventListener('click', backToWatchlists);
    }

    // 關閉商品模態窗口
    if (closeMarketBtn) {
        closeMarketBtn.addEventListener('click', hideAllModals);
    }

    // 返回觀察清單
    if (backFromMarketBtn) {
        backFromMarketBtn.addEventListener('click', () => {
            const marketModal = document.getElementById('marketModal');
            const listId = marketModal.getAttribute('data-list-id');
            backToWatchlists();
            // 重新載入清單項目
            openWatchlistItems(listId, tvWidget);
        });
    }

    if (searchMarketsBtn) {
        searchMarketsBtn.addEventListener('click', async () => {
            const exchange = exchangeInput.value.trim().toLowerCase();
            if (!exchange) {
                alert('請輸入交易所名稱');
                return;
            }

            const marketList = document.getElementById('marketList');
            if (marketList) {
                marketList.innerHTML = `
                    <div class="empty-list">
                        <p>正在加載數據...</p>
                    </div>
                `;

                const markets = await loadMarkets(exchange);

                if (markets.length === 0) {
                    marketList.innerHTML = `
                        <div class="empty-list">
                            <p>無法獲取商品數據或交易所不存在</p>
                        </div>
                    `;
                    return;
                }

                const searchText = marketSearch.value.trim();
                filterAndDisplayMarkets(markets, searchText, exchange);
            }
        });
    }

    // 搜索框輸入事件
    if (marketSearch) {
        marketSearch.addEventListener('input', async () => {
            const exchange = exchangeInput.value.trim().toLowerCase();
            const searchText = marketSearch.value.trim();

            if (!exchange) {
                return;
            }

            // 只有當已有市場數據時才過濾
            const marketList = document.getElementById('marketList');
            if (marketList.querySelector('.market-item')) {
                const markets = await loadMarkets(exchange);
                filterAndDisplayMarkets(markets, searchText, exchange);
            }
        });
    }

    // 過濾並顯示商品
    function filterAndDisplayMarkets(markets, searchText, exchange) {
        const marketList = document.getElementById('marketList');
        if (!marketList) return;

        const filteredMarkets = markets.filter(market => {
            if (!searchText) return true;

            const parts = market.split('/');
            if (parts.length !== 2) return false;

            const symbol = market.replace('/', '').toLowerCase();
            const [baseCurrency, quoteCurrency] = parts;

            return symbol.includes(searchText.toLowerCase()) ||
                baseCurrency.includes(searchText.toLowerCase()) ||
                quoteCurrency.includes(searchText.toLowerCase());
        });

        if (filteredMarkets.length === 0) {
            marketList.innerHTML = `
                <div class="empty-list">
                    <p>沒有找到匹配的商品</p>
                </div>
            `;
            return;
        }

        let html = '';
        filteredMarkets.forEach(market => {
            const symbol = market.replace('/', '').toUpperCase();
            const fullName = exchange.toUpperCase() + ":" + symbol

            html += `
                <div class="market-item">
                    <div class="market-item-info">
                        <div class="market-symbol">${symbol}</div>
                        <div class="market-name">${fullName}</div>
                    </div>
                    <button class="market-add-btn" 
                            data-symbol="${symbol}" 
                            data-full-name="${fullName}" 
                            data-exchange="${exchange.toUpperCase()}">
                        新增
                    </button>
                </div>
            `;
        });

        marketList.innerHTML = html;

        // 新增商品點擊事件
        const addButtons = marketList.querySelectorAll('.market-add-btn');
        addButtons.forEach(btn => {
            btn.addEventListener('click', async () => {
                const marketModal = document.getElementById('marketModal');
                const listId = marketModal.getAttribute('data-list-id');
                const symbol = btn.getAttribute('data-symbol');
                const fullName = btn.getAttribute('data-full-name');
                const exchange = btn.getAttribute('data-exchange');

                try {
                    const itemData = {
                        symbol: symbol,
                        full_name: fullName,
                        description: `${symbol} (${exchange})`,
                        exchange: exchange
                    };

                    const result = await watchList.addItemToWatchList(listId, itemData);

                    if (result.success) {
                        alert('新增成功');
                    } else {
                        alert('新增失敗: ' + (result.message || '商品可能已存在'));
                    }
                } catch (error) {
                    console.error('[addItemToWatchList]: Error', error);
                    alert('新增失敗: ' + error.message);
                }
            });
        });
    }

    // 搜索商品
    if (marketSearch) {
        marketSearch.addEventListener('input', async () => {
            const exchange = exchangeInput.value;
            const searchText = marketSearch.value.trim();

            if (!exchange) {
                return;
            }

            // 如果已有市場數據，直接過濾
            const marketList = document.getElementById('marketList');
            if (marketList.querySelector('.market-item')) {
                const markets = await loadMarkets(exchange);
                filterAndDisplayMarkets(markets, searchText, exchange);
            }
        });
    }

    // 保存觀察清單
    if (saveWatchlistBtn) {
        saveWatchlistBtn.addEventListener('click', async () => {
            const nameInput = document.getElementById('watchlistName');
            const descInput = document.getElementById('watchlistDesc');

            if (!nameInput || !nameInput.value.trim()) {
                alert('請輸入清單名稱');
                return;
            }

            try {
                const result = await watchList.createWatchList(
                    nameInput.value.trim(),
                    descInput ? descInput.value.trim() : ""
                );

                if (result.success) {
                    // 重新加載觀察清單
                    await loadWatchlists(tvWidget);

                    // 清空表單
                    if (nameInput) nameInput.value = '';
                    if (descInput) descInput.value = '';

                    // 返回觀察清單模態窗口
                    backToWatchlists();
                } else {
                    alert('創建失敗: ' + (result.message || '未知錯誤'));
                }
            } catch (error) {
                console.error('[createWatchList]: Error', error);
                alert('創建失敗: ' + error.message);
            }
        });
    }

    // 加載觀察清單
    await loadWatchlists(tvWidget);
}

// 加載所有觀察清單
async function loadWatchlists(tvWidget) {
    const watchlistContent = document.getElementById('watchlistContent');
    if (!watchlistContent) return;

    try {
        const watchlists = await watchList.getWatchList() || [];

        if (!watchlists || watchlists.length === 0) {
            watchlistContent.innerHTML = `
                <div class="empty-list">
                    <p>尚無觀察清單</p>
                    <p>點擊下方按鈕創建一個新的觀察清單</p>
                </div>
            `;
            return;
        }

        let html = '';
        watchlists.forEach(list => {
            html += `
                <div class="watchlist-item" data-id="${list.id}">
                    <div class="watchlist-name">${list.name}</div>
                    <div class="watchlist-actions">
                        <button class="watchlist-btn edit edit-list" data-id="${list.id}" title="編輯">
                            <svg width="16" height="16" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                            </svg>
                        </button>
                        <button class="watchlist-btn delete delete-list" data-id="${list.id}" title="刪除">
                            <svg width="16" height="16" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        });

        watchlistContent.innerHTML = html;

        // 新增觀察清單項目點擊事件
        const items = watchlistContent.querySelectorAll('.watchlist-item');
        items.forEach(item => {
            // 點擊觀察清單項目
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.watchlist-btn')) {
                    const listId = item.getAttribute('data-id');
                    openWatchlistItems(listId, tvWidget);
                }
            });

            // 編輯觀察清單
            const editBtn = item.querySelector('.edit-list');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const listId = editBtn.getAttribute('data-id');
                    editWatchlist(listId, tvWidget);
                });
            }

            // 刪除觀察清單
            const deleteBtn = item.querySelector('.delete-list');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const listId = deleteBtn.getAttribute('data-id');
                    deleteWatchlist(listId, tvWidget);
                });
            }
        });
    } catch (error) {
        console.error('[loadWatchlists]: Error loading watchlists', error);
        watchlistContent.innerHTML = `
            <div class="empty-list">
                <p>載入失敗</p>
                <p>請稍後再試</p>
            </div>
        `;
    }
}

// 打開觀察清單的項目
async function openWatchlistItems(listId, tvWidget) {
    if (!listId) return;

    try {
        const watchlists = await watchList.getWatchList() || [];
        const selectedList = watchlists.find(list => list.id == listId);

        if (!selectedList) {
            console.error('[openWatchlistItems]: Watchlist not found', listId);
            return;
        }

        const modal = document.getElementById('watchlistModal');
        const watchlistContent = document.getElementById('watchlistContent');
        const footer = modal.querySelector('.modal-footer');
        const header = modal.querySelector('.modal-header');

        // 更新標題
        const title = header.querySelector('.modal-title');
        title.textContent = selectedList.name;

        // 新增返回按鈕 (如果不存在)
        if (!header.querySelector('.modal-back')) {
            const backButton = document.createElement('button');
            backButton.className = 'modal-back';
            backButton.id = 'backToListsBtn';
            backButton.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/>
                </svg>
            `;
            backButton.title = '返回觀察清單';
            header.insertBefore(backButton, title);

            // 新增返回按鈕事件
            backButton.addEventListener('click', async () => {
                // 移除返回按鈕
                backButton.remove();

                // 恢復標題
                title.textContent = '觀察清單';

                // 恢復新增觀察清單按鈕
                if (footer) {
                    footer.innerHTML = `<button class="add-list-btn" id="addWatchlistBtn">新增觀察清單</button>`;

                    // 重新綁定新增觀察清單按鈕事件
                    const addBtn = document.getElementById('addWatchlistBtn');
                    if (addBtn) {
                        addBtn.addEventListener('click', showAddWatchlistModal);
                    }
                }

                // 重新加載觀察清單
                await loadWatchlists(tvWidget);
            });
        }

        // 更改底部按鈕為新增商品
        if (footer) {
            footer.innerHTML = `<button class="add-symbol-btn" id="addSymbolToListBtn" data-list-id="${listId}">新增商品</button>`;

            // 新增商品按鈕事件
            const addSymbolBtn = document.getElementById('addSymbolToListBtn');
            if (addSymbolBtn) {
                addSymbolBtn.addEventListener('click', () => {
                    showMarketModal(listId);
                });
            }
        }

        // 檢查是否有項目
        if (!selectedList.items || selectedList.items.length === 0) {
            watchlistContent.innerHTML = `
                <div class="empty-list">
                    <p>此觀察清單尚無項目</p>
                    <p>您可以點擊底部按鈕新增商品</p>
                </div>
            `;
        } else {
            let html = '';
            selectedList.items.forEach(item => {
                const symbolDisplay = item.symbol;
                const fullSymbol = item.exchange ? `${item.exchange.toUpperCase()}:${item.symbol}` : item.symbol;

                html += `
                    <div class="symbol-item" data-symbol="${fullSymbol}">
                        <div class="symbol-info">
                            <div class="symbol-name">${symbolDisplay}</div>
                            <div class="symbol-exchange">${item.exchange ? item.exchange.toUpperCase() : ''}</div>
                        </div>
                        <button class="symbol-remove" data-symbol="${item.symbol}" data-exchange="${item.exchange}" title="從清單中移除">
                            <svg width="16" height="16" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                            </svg>
                        </button>
                    </div>
                `;
            });

            watchlistContent.innerHTML = html;

            // 新增項目點擊事件
            const items = watchlistContent.querySelectorAll('.symbol-item');
            items.forEach(item => {
                item.addEventListener('click', (e) => {
                    if (!e.target.closest('.symbol-remove')) {
                        const symbol = item.getAttribute('data-symbol');
                        if (symbol) {
                            const targetChart = document.activeElement.closest('[id^="chart-"]');
                            if (targetChart && layoutManager.getWidget(targetChart.id)) {
                                layoutManager.setActiveChartId(targetChart.id);
                            }

                            const chartId = layoutManager.getActiveChartId();
                            layoutManager.updateChartSymbol(chartId, symbol);
                            hideAllModals();
                        }
                    }
                });

                // 移除項目按鈕事件
                const removeBtn = item.querySelector('.symbol-remove');
                if (removeBtn) {
                    removeBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const fullName = removeBtn.getAttribute('data-full-name');

                        if (confirm(`確定要從觀察清單中移除 ${fullName} 嗎?`)) {
                            try {
                                await watchList.removeItemFromWatchList(listId, fullName);
                                item.remove();

                                // 如果移除後沒有項目了，顯示空清單提示
                                const remainingItems = watchlistContent.querySelectorAll('.symbol-item');
                                if (remainingItems.length === 0) {
                                    watchlistContent.innerHTML = `
                                        <div class="empty-list">
                                            <p>此觀察清單尚無項目</p>
                                            <p>您可以點擊底部按鈕新增商品</p>
                                        </div>
                                    `;
                                }
                            } catch (error) {
                                console.error('[removeItemFromWatchList]: Error', error);
                                alert('移除失敗: ' + error.message);
                            }
                        }
                    });
                }
            });
        }
    } catch (error) {
        console.error('[openWatchlistItems]: Error', error);
    }
}

// 編輯觀察清單
async function editWatchlist(listId, tvWidget) {
    if (!listId) return;

    try {
        const watchlists = await watchList.getWatchList() || [];
        const selectedList = watchlists.find(list => list.id == listId);

        if (!selectedList) {
            console.error('[editWatchlist]: Watchlist not found', listId);
            return;
        }

        const newName = prompt('請輸入新的清單名稱:', selectedList.name);
        if (newName && newName.trim() !== '') {
            const result = await watchList.updateWatchList(listId, { name: newName.trim() });

            if (result.success) {
                // 更新成功，重新加載清單
                await loadWatchlists(tvWidget);
            } else {
                alert('更新失敗: ' + (result.message || '未知錯誤'));
            }
        }
    } catch (error) {
        console.error('[editWatchlist]: Error', error);
        alert('更新失敗: ' + error.message);
    }
}

// 刪除觀察清單
async function deleteWatchlist(listId, tvWidget) {
    if (!listId) return;

    try {
        const watchlists = await watchList.getWatchList() || [];
        const selectedList = watchlists.find(list => list.id == listId);

        if (!selectedList) {
            console.error('[deleteWatchlist]: Watchlist not found', listId);
            return;
        }

        if (confirm(`確定要刪除觀察清單 "${selectedList.name}" 嗎?`)) {
            const result = await watchList.deleteWatchList(listId);

            if (result.success) {
                // 刪除成功，重新加載清單
                await loadWatchlists(tvWidget);
            } else {
                alert('刪除失敗: ' + (result.message || '未知錯誤'));
            }
        }
    } catch (error) {
        console.error('[deleteWatchlist]: Error', error);
        alert('刪除失敗: ' + error.message);
    }
}

// 創建並初始化觀察清單模態窗口
function initWatchlistModalWithStyles(tvWidget) {
    createWatchlistModal();
    initWatchlistModal(tvWidget);
}

// 打開觀察清單模態窗口
function openWatchlistModal() {
    showWatchlistModal();
}

export default {
    initWatchlistModalWithStyles,
    openWatchlistModal
};