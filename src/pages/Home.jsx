import React, { useEffect, useState } from 'react';
import { getMarketData } from '../services/api';
import { Link } from 'react-router-dom';

const Home = () => {
  const [coins, setCoins] = useState([]); 
  const [loading, setLoading] = useState(true); 

  useEffect(() => {
    const fetchCoins = async () => {
      const data = await getMarketData();
      setCoins(data);
      setLoading(false);
    };
    
    fetchCoins();
  }, []);

  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold text-white mb-4">Market 📈</h1>
      
      {loading ? (
        <div className="text-center text-blue-400 mt-10">Loading coins...</div>
      ) : (
        <div className="space-y-4">
          {coins.map((coin) => (
            <Link to={`/coin/${coin.id}`} key={coin.id} className="block bg-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg border border-slate-700 hover:border-blue-500 transition-colors">
              
              
              <div className="flex items-center gap-3">
                <img src={coin.image} alt={coin.name} className="w-8 h-8" />
                <div>
                  <h2 className="font-bold text-white">{coin.symbol.toUpperCase()}</h2>
                  <p className="text-xs text-gray-400">{coin.name}</p>
                </div>
              </div>

              
              <div className="text-right">
                <p className="text-white font-mono">${coin.current_price.toLocaleString()}</p>
                <p className={`text-xs font-bold ${coin.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {coin.price_change_percentage_24h?.toFixed(2)}%
                </p>
              </div>

            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;