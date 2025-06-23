import { API_BASE_URL } from '../config.js'

export const chartStorage = {
    getLastestChart: async () => {
        console.log('[getLastestChart]: Method call')
        try {
            const response = await fetch(
                `${API_BASE_URL}/charts/latest`
            )
            const data = await response.json()

            if (data.success) {
                return data.data
            }
            return null
        } catch (error) {
            console.error('[getLastestChart]: Error', error)
            return null
        }
    },

    getAllCharts: async () => {
        console.log('[getAllCharts]: Method call')
        try {
            const response = await fetch(
                `${API_BASE_URL}/charts/list`
            )
            const data = await response.json()

            if (data.success) {
                return data.data
            }
            return { status: 'error', message: 'Failed to load charts' }
        } catch (error) {
            console.error('[getAllCharts]: Error', error)
            return { status: 'error', message: error.toString() }
        }
    },

    saveChart: async (chartData) => {
        console.log('[saveChart]: Method call', chartData)
        try {
            const response = await fetch(`${API_BASE_URL}/charts/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(chartData)
            })
            const data = await response.json()
            return data.success ?
                { status: 'ok' } :
                { status: 'error', message: data.message }
        } catch (error) {
            console.error('[saveChart]: Error', error)
            return { status: 'error', message: error.toString() }
        }
    },

    getChartContent: async (chartId) => {
        console.log('[getChartContent]: Method call', chartId)
        try {
            const response = await fetch(
                `${API_BASE_URL}/charts/load/${chartId}`
            )
            const data = await response.json()

            if (data.success) {
                return data.data?.content
            }
            return null
        } catch (error) {
            console.error('[getChartContent]: Error', error)
            return null
        }
    },

    removeChart: async (chartId) => {
        console.log('[removeChart]: Method call', chartId)
        try {
            const response = await fetch(
                `${API_BASE_URL}/charts/delete/${chartId}`, {
                method: 'DELETE'
            })
            const data = await response.json()
            return data.success ?
                { status: 'ok' } :
                { status: 'error', message: data.message }
        } catch (error) {
            console.error('[removeChart]: Error', error)
            return { status: 'error', message: error.toString() }
        }
    }
}