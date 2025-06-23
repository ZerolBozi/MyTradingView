import { API_BASE_URL } from '../config.js'

export const watchList = {
    getWatchList: async () => {
        console.log('[getWatchList]: Method call')
        try {
            const response = await fetch(
                `${API_BASE_URL}/charts/watchlists`
            )
            const data = await response.json()

            if (data.success) {
                return data.data
            }
            return null
        } catch (error) {
            console.error('[getWatchList]: Error', error)
            return null
        }
    },

    createWatchList: async (name, description = "") => {
        console.log('[createWatchList]: Method call', { name, description })
        try {
            const response = await fetch(
                `${API_BASE_URL}/charts/watchlists/create`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, description })
                }
            )
            const data = await response.json()
            return data
        } catch (error) {
            console.error('[createWatchList]: Error', error)
            return { status: 'error', message: error.message }
        }
    },

    updateWatchList: async (id, updates = {}) => {
        console.log('[updateWatchList]: Method call', { id, updates })
        try {
            const payload = {
                watchlist_id: id,
                ...updates
            }

            const response = await fetch(
                `${API_BASE_URL}/charts/watchlists/update`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                }
            )

            const data = await response.json()
            return data
        } catch (error) {
            console.error('[updateWatchList]: Error', error)
            return { status: 'error', message: error.message }
        }
    },

    deleteWatchList: async (id) => {
        console.log('[deleteWatchList]: Method call', { id })
        try {
            const response = await fetch(
                `${API_BASE_URL}/charts/watchlists/delete/${id}`,
                {
                    method: 'DELETE'
                }
            )
            const data = await response.json()
            return data
        } catch (error) {
            console.error('[deleteWatchList]: Error', error)
            return { status: 'error', message: error.message }
        }
    },

    addItemToWatchList: async (listId, itemData) => {
        console.log('[addItemToWatchList]: Method call', { listId, itemData })
        try {
            const response = await fetch(
                `${API_BASE_URL}/charts/watchlists/${listId}/add`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(itemData)
                }
            )
            const data = await response.json()
            return data
        } catch (error) {
            console.error('[addItemToWatchList]: Error', error)
            return { status: 'error', message: error.message }
        }
    },

    removeItemFromWatchList: async (listId, fullName) => {
        console.log('[removeItemFromWatchList]: Method call', { fullName })
        try {
            const response = await fetch(
                `${API_BASE_URL}/charts/watchlists/${listId}/remove/${encodeURIComponent(symbol)}`,
                {
                    method: 'DELETE'
                }
            )
            const data = await response.json()
            return data
        } catch (error) {
            console.error('[removeItemFromWatchList]: Error', error)
            return { status: 'error', message: error.message }
        }
    }
}