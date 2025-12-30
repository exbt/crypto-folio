const BASE_URL = "https://api.coingecko.com/api/v3";

export const getMarketData = async () => {
    try {
        const response = await fetch(`${BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false`);
        if (!response.ok) throw new Error("Limit");
        return await response.json();
    } catch (error) { return []; }
};

export const getCoinDetail = async (id) => {
    try {
        const response = await fetch(`${BASE_URL}/coins/${id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) { return null; }
};

export const getCoinMarketChart = async (coinId, symbol, interval = '1h') => {
    
    const limit = 200;

    if (symbol) {
        try {
            const binanceSymbol = `${symbol.toUpperCase()}USDT`;
            const response = await fetch(`/api-binance/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`);
            
            if (response.ok) {
                const data = await response.json();
                return { 
                    prices: data.map(c => ({
                        time: c[0] / 1000, 
                        open: parseFloat(c[1]),
                        high: parseFloat(c[2]),
                        low: parseFloat(c[3]),
                        close: parseFloat(c[4])
                    })), 
                    source: 'binance' 
                };
            }
        } catch (e) { }
    }

    if (symbol) {
        try {
            const gateSymbol = `${symbol.toUpperCase()}_USDT`;
            let gateInterval = interval;
            if (interval === '1w') gateInterval = '7d';
            if (interval === '1M') gateInterval = '30d';

            const response = await fetch(`/api-gate/api/v4/spot/candlesticks?currency_pair=${gateSymbol}&interval=${gateInterval}&limit=${limit}`);

            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data) && data.length > 0) {
                    const prices = data.map(item => ({
                        time: parseInt(item[0]), 
                        open: parseFloat(item[5]),  
                        high: parseFloat(item[3]),  
                        low: parseFloat(item[4]),   
                        close: parseFloat(item[2])  
                    }));
                    prices.sort((a, b) => a.time - b.time);
                    return { prices, source: 'gate' };
                }
            }
        } catch (e) { }
    }

    try {
        let days = '1';
        if (interval === '4h') days = '7';
        if (interval === '1d') days = '30';
        if (interval === '1w') days = '90';
        if (interval === '1M') days = '365';

        const response = await fetch(`${BASE_URL}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`);
        if (response.ok) {
            const data = await response.json();
            const prices = data.prices.map(p => ({
                time: p[0] / 1000,
                open: p[1],
                high: p[1],
                low: p[1],
                close: p[1]
            }));
            return { prices, source: 'coingecko' };
        }
    } catch (error) { }
    
    return { prices: [], source: 'none' };
};