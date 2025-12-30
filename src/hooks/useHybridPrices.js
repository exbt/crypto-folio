import { useEffect, useState, useRef } from 'react';

const useHybridPrices = () => {
    const [prices, setPrices] = useState({});
    const binanceWs = useRef(null);

    useEffect(() => {
        const connectBinance = () => {
            if (binanceWs.current) return;
            const ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');
            binanceWs.current = ws;

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const updates = {};
                    data.forEach(t => {
                        if (t.s.endsWith('USDT')) {
                            const symbol = t.s.replace('USDT', '').toLowerCase();
                            updates[symbol] = {
                                price: parseFloat(t.c),
                                change: parseFloat(t.P),
                                source: 'binance'
                            };
                        }
                    });
                    setPrices(prev => ({ ...prev, ...updates }));
                } catch (e) {}
            };
        };

        const fetchAllGateTickers = async () => {
            try {
                const response = await fetch('/api-gate/api/v4/spot/tickers');
                
                if (response.ok) {
                    const data = await response.json();
                    const updates = {};

                    data.forEach(item => {
                        if (item.currency_pair.endsWith('_USDT')) {
                            const symbol = item.currency_pair.replace('_USDT', '').toLowerCase();
                            updates[symbol] = {
                                price: parseFloat(item.last),
                                change: parseFloat(item.change_percentage),
                                source: 'gate'
                            };
                        }
                    });

                    setPrices(prev => {
                        const newState = { ...prev };
                        Object.keys(updates).forEach(key => {
                            if (!newState[key] || newState[key].source !== 'binance') {
                                newState[key] = updates[key];
                            }
                        });
                        return newState;
                    });
                }
            } catch (error) { }
        };

        connectBinance();
        fetchAllGateTickers();

        const intervalId = setInterval(fetchAllGateTickers, 2500);

        return () => {
            if (binanceWs.current) { binanceWs.current.close(); binanceWs.current = null; }
            clearInterval(intervalId);
        };
    }, []);

    return prices;
};

export default useHybridPrices;