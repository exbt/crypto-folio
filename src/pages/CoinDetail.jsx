import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCoinHistory, getMarketData } from '../services/api';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { AiOutlineArrowLeft } from 'react-icons/ai';
import { useCrypto } from '../context/CryptoContext';

const CoinDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { buyCoin, sellCoin, balance, assets } = useCrypto(); 
  
  const [history, setHistory] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [amount, setAmount] = useState('');

  const [mode, setMode] = useState('BUY');
  

  const myAsset = (assets || []).find(a => a.id === id);
  const myAmount = myAsset ? myAsset.amount : 0;

  useEffect(() => {
    getCoinHistory(id).then(setHistory);
    getMarketData().then(coins => {
      const coin = coins.find(c => c.id === id);
      if(coin) setCurrentPrice(coin.current_price);
    });
  }, [id]);

 
  const handlePercentage = (percent) => {
    if (currentPrice === 0) return;

    if (mode === 'BUY') {
      const safetyFactor = percent === 1 ? 0.99999 : 1; 
      
      const usableBalance = balance * percent * safetyFactor;
      const calculatedAmount = usableBalance / currentPrice;
      
      setAmount(calculatedAmount.toFixed(6)); 
    } else {
      const safetyFactor = percent === 1 ? 0.99999 : 1;
      const calculatedAmount = myAmount * percent * safetyFactor;
      setAmount(calculatedAmount.toFixed(6));
    }
  };
  const handleTransaction = () => {
    if (!amount || amount <= 0) return;
    
    if (mode === 'BUY') {
      buyCoin(id, amount, currentPrice);
    } else {
      sellCoin(id, amount, currentPrice);
    }
    setAmount('');
  };

 return (
    <div className="p-4 pb-20">
      
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="text-white bg-slate-800 p-2 rounded-full">
          <AiOutlineArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-white capitalize">{id}</h1>
      </div>

      
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 h-[250px] mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history}>
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} labelStyle={{ display: 'none' }} />
            <Area 
              type="monotone" 
              dataKey="price" 
              stroke={mode === 'BUY' ? "#22c55e" : "#ef4444"} 
              fill={mode === 'BUY' ? "#22c55e" : "#ef4444"} 
              fillOpacity={0.3} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-gray-400 text-xs">Current Price</p>
            <p className="text-2xl font-bold text-white">${currentPrice.toLocaleString()}</p>
          </div>
          <div className="text-right">
             <p className="text-gray-400 text-xs">{mode === 'BUY' ? 'Available Cash' : 'Available Asset'}</p>
             <p className="text-lg font-bold text-blue-400">
               {mode === 'BUY' ? `$${balance.toLocaleString()}` : `${myAmount.toFixed(4)} ${id.toUpperCase()}`}
             </p>
          </div>
        </div>

        
        <div className="flex bg-slate-900 rounded-lg p-1 mb-4">
          <button 
            onClick={() => { setMode('BUY'); setAmount(''); }}
            className={`flex-1 py-2 rounded-md font-bold text-sm transition ${mode === 'BUY' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            BUY
          </button>
          <button 
            onClick={() => { setMode('SELL'); setAmount(''); }}
            className={`flex-1 py-2 rounded-md font-bold text-sm transition ${mode === 'SELL' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            SELL
          </button>
        </div>

        
        <div className="mb-4">
          <div className="relative">
            <input 
              type="number" 
              placeholder="Amount" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-white text-lg focus:outline-none focus:border-blue-500"
            />
            <span className="absolute right-4 top-4 text-gray-500 font-bold uppercase">{id}</span>
          </div>
        </div>

        
        <div className="flex gap-2 mb-6">
          {[0.25, 0.50, 0.75, 1].map((percent) => (
            <button
              key={percent}
              onClick={() => handlePercentage(percent)}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-gray-300 text-xs font-bold py-2 rounded-lg transition"
            >
              {percent === 1 ? 'MAX' : `${percent * 100}%`}
            </button>
          ))}
        </div>

        
        <button 
          onClick={handleTransaction}
          className={`w-full font-bold py-4 rounded-xl text-white text-lg transition shadow-lg ${
            mode === 'BUY' 
              ? 'bg-green-600 hover:bg-green-700 shadow-green-900/20' 
              : 'bg-red-600 hover:bg-red-700 shadow-red-900/20'
          }`}
        >
          {mode === 'BUY' ? `BUY ${id.toUpperCase()}` : `SELL ${id.toUpperCase()}`}
        </button>

      </div>
    </div>
  );
};

export default CoinDetail;