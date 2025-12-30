import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCoinDetail, getCoinMarketChart } from '../services/api';
import { AiOutlineArrowLeft } from 'react-icons/ai';
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';
import { useCrypto } from '../context/CryptoContext';
import toast from 'react-hot-toast';
import useHybridPrices from '../hooks/useHybridPrices';

const usePriceFlash = (currentPrice) => {
    const [colorClass, setColorClass] = useState('text-white');
    const prevPriceRef = useRef(currentPrice);
    useEffect(() => {
        if (!prevPriceRef.current || prevPriceRef.current === 0) { prevPriceRef.current = currentPrice; return; }
        if (currentPrice > prevPriceRef.current) setColorClass('text-green-400 scale-110 transition-transform duration-200'); 
        else if (currentPrice < prevPriceRef.current) setColorClass('text-red-400 scale-110 transition-transform duration-200'); 
        prevPriceRef.current = currentPrice;
        const timer = setTimeout(() => setColorClass('text-white scale-100'), 600); 
        return () => clearTimeout(timer);
    }, [currentPrice]);
    return colorClass;
};

const CoinDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, buyCoin, sellCoin, assets, balance } = useCrypto();
    
    const [coin, setCoin] = useState(null);
    const [loading, setLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(true);
    
    const [tradeType, setTradeType] = useState('buy');
    const [amount, setAmount] = useState('');
    const [chartSource, setChartSource] = useState(null);
    const [turboPrice, setTurboPrice] = useState(null);
    
    const [interval, setInterval] = useState('1h');
    const intervals = ['1h', '4h', '1d', '1w', '1M'];

    const chartContainerRef = useRef(null);
    const chartInstanceRef = useRef(null);
    const globalPrices = useHybridPrices();

    useEffect(() => {
        const fetchData = async () => {
            if(!coin) setLoading(true);
            setChartLoading(true);
            
            try {
                let currentCoin = coin;
                if (!currentCoin) {
                    currentCoin = await getCoinDetail(id);
                    setCoin(currentCoin);
                    setLoading(false); 
                }

                const chartData = await getCoinMarketChart(id, currentCoin.symbol, interval);
                setChartSource(chartData.source);
                
                if (currentCoin.symbol && chartData.source !== 'binance') {
                    const symbolUpper = currentCoin.symbol.toUpperCase();
                    const ws = new WebSocket('wss://api.gateio.ws/ws/v4/');
                    ws.onopen = () => {
                        ws.send(JSON.stringify({
                            "time": Math.floor(Date.now() / 1000),
                            "channel": "spot.tickers",
                            "event": "subscribe",
                            "payload": [`${symbolUpper}_USDT`]
                        }));
                    };
                    ws.onmessage = (evt) => {
                        try {
                            const res = JSON.parse(evt.data);
                            if (res.event === 'update' && res.result) {
                                setTurboPrice({
                                    price: parseFloat(res.result.last),
                                    change: parseFloat(res.result.change_percentage),
                                    source: 'gate_turbo'
                                });
                            }
                        } catch(e) {}
                    };
                }

                if (chartContainerRef.current && chartData.prices && chartData.prices.length > 0) {
                    if (chartInstanceRef.current) {
                        chartInstanceRef.current.remove();
                        chartInstanceRef.current = null;
                    }
                    chartContainerRef.current.innerHTML = '';

                    const chart = createChart(chartContainerRef.current, {
                        layout: { 
                            background: { type: ColorType.Solid, color: '#0f172a' }, 
                            textColor: '#cbd5e1' 
                        },
                        grid: { 
                            vertLines: { color: '#1e293b' }, 
                            horzLines: { color: '#1e293b' } 
                        },
                        width: chartContainerRef.current.clientWidth,
                        height: 350,
                        timeScale: {
                            timeVisible: true,
                            secondsVisible: false,
                            rightOffset: 5,
                            barSpacing: 10,
                        },
                        crosshair: { mode: 1 }
                    });

                    chartInstanceRef.current = chart;

                    const candlestickSeries = chart.addSeries(CandlestickSeries, {
                        upColor: '#26a69a', downColor: '#ef5350',
                        borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350',
                    });
                    
                    candlestickSeries.setData(chartData.prices);
                    chart.timeScale().fitContent();
                }

            } catch (error) {
                console.error("Chart Error:", error);
            } finally {
                setLoading(false);
                setChartLoading(false);
            }
        };
        fetchData();

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.remove();
                chartInstanceRef.current = null;
            }
        };
    }, [id, interval]);

    const coinSymbol = coin?.symbol?.toLowerCase();
    const liveData = turboPrice || globalPrices[coinSymbol]; 
    const currentPrice = liveData?.price || coin?.market_data?.current_price?.usd || 0;
    const priceChange = parseFloat(liveData?.change || coin?.market_data?.price_change_percentage_24h || 0);
    const priceColorClass = usePriceFlash(currentPrice);

    const asset = assets.find(a => a.id === id);
    const ownedAmount = asset ? asset.amount : 0;

    const totalEstimatedValue = (parseFloat(amount) || 0) * currentPrice;

    let finalSource = liveData?.source || chartSource || 'coingecko';
    let sourceLabel = "CoinGecko (Delayed)";
    let sourceColor = "bg-yellow-500";
    if (finalSource === 'binance') { sourceLabel = "Binance Feed"; sourceColor = "bg-green-500"; }
    else if (finalSource && finalSource.includes('gate')) { sourceLabel = "Gate.io Real-Time"; sourceColor = "bg-blue-500"; }

    const percentages = [25, 50, 75, 100];
    const handlePercentageClick = (percent) => {
        if (tradeType === 'buy') setAmount(((balance * percent / 100) / currentPrice * 0.999).toFixed(6));
        else setAmount(((ownedAmount * percent / 100)).toFixed(6));
    };

   const handleTrade = async () => {
        if (!user) { toast.error("Please login to trade"); return; }
        if (parseFloat(amount) <= 0) { toast.error("Please enter a valid amount"); return; }
        
        try {
            if (tradeType === 'buy') await buyCoin(id, amount, currentPrice);
            else await sellCoin(id, amount, currentPrice);
            
            setAmount('');
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center bg-slate-900 text-white font-bold">Loading...</div>;
    if (!coin) return <div className="p-10 text-center text-white">Coin not found.</div>;

    return (
        <div className="p-4 pb-24 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
                <button onClick={() => navigate(-1)} className="text-white p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition"><AiOutlineArrowLeft size={24} /></button>
                <div className="flex items-center gap-3">
                    <img src={coin.image?.large} alt={coin.name} className="w-10 h-10 rounded-full" />
                    <div>
                        <h1 className="text-xl font-bold text-white flex items-center gap-2">{coin.name} <span className="text-gray-400 text-sm uppercase">({coin.symbol})</span></h1>
                        <span className={`text-sm font-bold ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {priceChange >= 0 ? '▲' : '▼'} {Math.abs(priceChange).toFixed(2)}%
                        </span>
                    </div>
                </div>
                <div className="w-10"></div>
            </div>

            <div className="bg-slate-800 rounded-2xl p-4 mb-4 border border-slate-700 shadow-xl relative min-h-[380px]">
                <div className="absolute top-4 right-4 z-10 flex bg-slate-900/80 backdrop-blur rounded-lg p-1 gap-1 border border-slate-700">
                    {intervals.map(int => (
                        <button 
                            key={int} 
                            onClick={() => setInterval(int)}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition ${interval === int ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-slate-700'}`}
                        >
                            {int.toUpperCase()}
                        </button>
                    ))}
                </div>
                
                {chartLoading ? (
                    <div className="w-full h-[350px] flex flex-col items-center justify-center text-gray-400 animate-pulse">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                        <span className="text-xs font-mono">Loading Chart Data...</span>
                    </div>
                ) : (
                    <div ref={chartContainerRef} className="w-full h-[350px]"></div>
                )}
            </div>

            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <p className="text-gray-400 text-xs font-bold uppercase">Live Price</p>
                        <h2 className={`text-3xl font-mono font-bold transition-all duration-200 ${priceColorClass}`}>
                            ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                        </h2>
                        <div className="flex items-center gap-2 mt-2">
                            <span className={`w-2 h-2 rounded-full animate-pulse ${sourceColor}`}></span>
                            <p className="text-[10px] text-gray-400 uppercase">{sourceLabel}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-gray-400 text-xs font-bold uppercase">{tradeType === 'buy' ? 'Cash' : 'Owned'}</p>
                        <h2 className="text-xl font-bold text-blue-400 font-mono">{tradeType === 'buy' ? `$${balance.toLocaleString()}` : `${ownedAmount.toFixed(4)}`}</h2>
                    </div>
                </div>

                <div className="flex bg-slate-900/50 p-1 rounded-xl mb-6">
                    <button onClick={() => setTradeType('buy')} className={`flex-1 py-3 rounded-lg font-bold transition ${tradeType === 'buy' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}>BUY</button>
                    <button onClick={() => setTradeType('sell')} className={`flex-1 py-3 rounded-lg font-bold transition ${tradeType === 'sell' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>SELL</button>
                </div>

                <input 
                    type="number" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    placeholder="0.00" 
                    className="w-full bg-slate-900/50 p-4 rounded-xl text-white text-2xl font-bold outline-none border border-slate-600 focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                />
                
                <div className="text-right mt-2 mb-4">
                    <p className="text-gray-400 text-xs">
                        Estimated Value: <span className="text-white font-bold text-sm">${totalEstimatedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </p>
                </div>
                
                <div className="grid grid-cols-4 gap-2 mb-4">
                    {percentages.map(p => <button key={p} onClick={() => handlePercentageClick(p)} className="bg-slate-700 py-2 rounded-lg text-xs font-bold text-gray-300 hover:bg-slate-600">{p}%</button>)}
                </div>

                <button onClick={handleTrade} className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg ${tradeType === 'buy' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'} text-white transition`}>
                    {tradeType === 'buy' ? 'CONFIRM BUY' : 'CONFIRM SELL'}
                </button>
            </div>
        </div>
    );
};

export default CoinDetail;