import { useEffect, useState, useRef } from 'react';

const GATE_PAIRS = [
    "CRO_USDT", 
    "KAS_USDT", 
    "TON_USDT", 
    "BONE_USDT",
    "BRISE_USDT" 
];

const useHybridPrices = () => {
    const [prices, setPrices] = useState({});
    const binanceWsRef = useRef(null);
    const gateWsRef = useRef(null);

    useEffect(() => {
        const connectBinance = () => {
            const ws = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');
            binanceWsRef.current = ws;

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                const newPrices = {};
                
                data.forEach(ticker => {
                    if (ticker.s.endsWith('USDT')) {
                        const symbol = ticker.s.replace('USDT', '').toLowerCase(); 
                        newPrices[symbol] = {
                            price: parseFloat(ticker.c),
                            change: parseFloat(ticker.P)
                        };
                    }
                });
                
                setPrices(prev => ({ ...prev, ...newPrices }));
            };
        };

        const connectGate = () => {
            const ws = new WebSocket('wss://api.gateio.ws/ws/v4/');
            gateWsRef.current = ws;

            ws.onopen = () => {
                const subscribeMsg = {
                    "time": Date.now(),
                    "channel": "spot.tickers",
                    "event": "subscribe",
                    "payload": GATE_PAIRS 
                };
                ws.send(JSON.stringify(subscribeMsg));
            };

            ws.onmessage = (event) => {
                const response = JSON.parse(event.data);
                
                if (response.event === 'update' && response.result) {
                    const data = response.result;
                    
                    const symbol = data.currency_pair.replace('_USDT', '').toLowerCase();
                    
                    setPrices(prev => ({
                        ...prev,
                        [symbol]: {
                            price: parseFloat(data.last),
                            change: parseFloat(data.change_percentage) 
                        }
                    }));
                }
            };
        };

        connectBinance();
        connectGate();

        return () => {
            if (binanceWsRef.current) binanceWsRef.current.close();
            if (gateWsRef.current) gateWsRef.current.close();
        };
    }, []);

    return prices;
};

export default useHybridPrices;