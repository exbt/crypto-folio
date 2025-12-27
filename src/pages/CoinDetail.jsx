import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCoinHistory, getMarketData } from '../services/api'; 
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { AiOutlineArrowLeft } from 'react-icons/ai';
import { useCrypto } from '../context/CryptoContext'; 

const CoinDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { buyCoin, balance } = useCrypto(); 
  
  const [history, setHistory] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(0); 
  const [amount, setAmount] = useState(''); 

  useEffect(() => {
    getCoinHistory(id).then(setHistory);
    getMarketData().then(coins => {
      const coin = coins.find(c => c.id === id);
      if(coin) setCurrentPrice(coin.current_price);
    });
  }, [id]);

  const handleBuy = () => {
    if (!amount || amount <= 0) return;
    buyCoin(id, amount, currentPrice);
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
            <Area type="monotone" dataKey="price" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-400">Current Price</span>
          <span className="text-2xl font-bold">${currentPrice.toLocaleString()}</span>
        </div>

        <div className="flex justify-between items-center mb-4 text-sm">
          <span className="text-gray-400">Your Balance</span>
          <span className="text-green-400 font-bold">${balance.toLocaleString()}</span>
        </div>

        <div className="flex gap-2">
          <input 
            type="number" 
            placeholder="Amount (e.g. 0.5)" 
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
          />
          <button 
            onClick={handleBuy}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 rounded-lg transition-colors"
          >
            BUY
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoinDetail;