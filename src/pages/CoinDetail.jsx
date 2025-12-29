import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCoinHistory, getMarketData } from '../services/api'; 
import { AreaChart, Area, Tooltip, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { AiOutlineArrowLeft } from 'react-icons/ai';
import { useCrypto } from '../context/CryptoContext';
import toast from 'react-hot-toast';

const CoinDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { buyCoin, sellCoin, balance, assets } = useCrypto(); 
  
  const [history, setHistory] = useState([]);
  const [coinData, setCoinData] = useState(null); 
  

  const [livePrice, setLivePrice] = useState(null); 
  const [priceColor, setPriceColor] = useState("text-white"); 

  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('BUY');
  

  const prevPriceRef = useRef(0);

  const wsRef = useRef(null);

  const myAsset = (assets || []).find(a => a.id === id);
  const myAmount = myAsset ? myAsset.amount : 0;


  useEffect(() => {

    getCoinHistory(id).then(setHistory);


    getMarketData().then(coins => {
      const coin = coins.find(c => c.id === id);
      if(coin) {
        setCoinData(coin);
        setLivePrice(coin.current_price);
        prevPriceRef.current = coin.current_price;
      }
    });
  }, [id]);

  useEffect(() => {
    if (!coinData || !coinData.symbol) return;

    const binanceSymbol = `${coinData.symbol.toLowerCase()}usdt`;

    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${binanceSymbol}@trade`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`Binance WS Bağlandı: ${binanceSymbol}`);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const newPrice = parseFloat(data.p);

      setLivePrice(newPrice);

      if (newPrice > prevPriceRef.current) {
        setPriceColor("text-green-400 transition duration-300");
      } else if (newPrice < prevPriceRef.current) {
        setPriceColor("text-red-400 transition duration-300");
      }
      
      setTimeout(() => setPriceColor("text-white transition duration-500"), 300);

      prevPriceRef.current = newPrice;
    };

    ws.onerror = (error) => {
      // console.warn("Binance does not support this coin or an error has occurred. CoinGecko data will be used.");
    };

    return () => {
      if (ws.readyState === 1) ws.close();
    };
  }, [coinData]); 

  const activePrice = livePrice || (coinData ? coinData.current_price : 0);

  const handlePercentage = (percent) => {
    if (activePrice === 0) return;

    if (mode === 'BUY') {
      const safetyFactor = percent === 1 ? 0.99999 : 1; 
      const usableBalance = balance * percent * safetyFactor;
      const calculatedAmount = usableBalance / activePrice;
      setAmount(calculatedAmount.toFixed(6)); 
    } else {
      const safetyFactor = percent === 1 ? 0.99999 : 1;
      const calculatedAmount = myAmount * percent * safetyFactor;
      setAmount(calculatedAmount.toFixed(6));
    }
  };

  const handleTransaction = () => {
    if (!amount || amount <= 0) {
        toast.error("You must enter the amount.");
        return;
    }
    
 
    if (mode === 'BUY') {
      buyCoin(id, amount, activePrice);
    } else {
      sellCoin(id, amount, activePrice);
    }
    setAmount('');
  };

  if (!coinData) return <div className="text-white text-center mt-20">Loading Coin Data...</div>;

  return (
    <div className="p-4 pb-20 max-w-4xl mx-auto">

      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="text-white bg-slate-800 p-2 rounded-full hover:bg-slate-700 transition">
          <AiOutlineArrowLeft size={24} />
        </button>
        <div className="flex items-center gap-3">
            <img src={coinData.image} alt={coinData.name} className="w-8 h-8 rounded-full" />
            <h1 className="text-2xl font-bold text-white capitalize">{coinData.name} <span className="text-gray-400 text-sm uppercase">({coinData.symbol})</span></h1>
        </div>
      </div>

      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 h-[300px] mb-6 shadow-lg">
        {history.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
                <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={mode === 'BUY' ? "#22c55e" : "#ef4444"} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={mode === 'BUY' ? "#22c55e" : "#ef4444"} stopOpacity={0}/>
                </linearGradient>
                </defs>
                <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} 
                    labelStyle={{ display: 'none' }}
                    formatter={(value) => [`$${value.toLocaleString()}`, 'Price']}
                />
                <Area 
                type="monotone" 
                dataKey="price" 
                stroke={mode === 'BUY' ? "#22c55e" : "#ef4444"} 
                fill="url(#colorPrice)" 
                strokeWidth={2}
                />
                <YAxis domain={['auto', 'auto']} hide />
            </AreaChart>
            </ResponsiveContainer>
        ) : (
            <div className="h-full flex items-center justify-center text-gray-400 animate-pulse">Loading Chart Data...</div>
        )}
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
        
        <div className="flex justify-between items-end mb-8">
          <div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Live Market Price</p>

            <p className={`text-4xl font-mono font-bold ${priceColor}`}>
                ${activePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
            </p>

            <div className="flex items-center gap-1.5 mt-2">
                <span className={`w-2 h-2 rounded-full ${wsRef.current && wsRef.current.readyState === 1 ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
                <span className="text-[10px] text-gray-500 font-mono">
                    {wsRef.current && wsRef.current.readyState === 1 ? 'Binance Live Feed' : 'CoinGecko Price'}
                </span>
            </div>
          </div>
          <div className="text-right">
             <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">{mode === 'BUY' ? 'Available Cash' : 'Your Holdings'}</p>
             <p className="text-xl font-bold text-blue-400">
               {mode === 'BUY' ? `$${balance.toLocaleString()}` : `${myAmount.toFixed(4)} ${coinData.symbol.toUpperCase()}`}
             </p>
          </div>
        </div>

        <div className="flex bg-slate-900 rounded-xl p-1.5 mb-6 border border-slate-700">
          <button 
            onClick={() => { setMode('BUY'); setAmount(''); }}
            className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all duration-300 ${mode === 'BUY' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            BUY {coinData.symbol.toUpperCase()}
          </button>
          <button 
            onClick={() => { setMode('SELL'); setAmount(''); }}
            className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all duration-300 ${mode === 'SELL' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            SELL {coinData.symbol.toUpperCase()}
          </button>
        </div>

        <div className="mb-4">
          <div className="relative">
            <input 
              type="number" 
              placeholder="Amount" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-xl p-4 text-white text-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold uppercase">{coinData.symbol}</span>
          </div>
          <p className="text-right text-xs text-gray-500 mt-2">
            Estimated Value: <span className="text-white font-mono">${(amount * activePrice).toLocaleString()}</span>
          </p>
        </div>

        <div className="flex gap-2 mb-8">
          {[0.25, 0.50, 0.75, 1].map((percent) => (
            <button
              key={percent}
              onClick={() => handlePercentage(percent)}
              className="flex-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-gray-300 text-xs font-bold py-2.5 rounded-lg transition"
            >
              {percent === 1 ? 'MAX' : `${percent * 100}%`}
            </button>
          ))}
        </div>

        <button 
          onClick={handleTransaction}
          className={`w-full font-bold py-4 rounded-xl text-white text-lg transition transform active:scale-95 shadow-lg ${
            mode === 'BUY' 
              ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 shadow-green-900/30' 
              : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-red-900/30'
          }`}
        >
          {mode === 'BUY' ? `BUY ${coinData.symbol.toUpperCase()}` : `SELL ${coinData.symbol.toUpperCase()}`}
        </button>

      </div>
    </div>
  );
};

export default CoinDetail;