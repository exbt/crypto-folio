import React, { useEffect, useState } from 'react';
import { useCrypto } from '../context/CryptoContext';
import { getMarketData } from '../services/api';
import { Link } from 'react-router-dom';

const Portfolio = () => {
  const { assets, balance } = useCrypto();
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const marketData = await getMarketData();
      setCoins(marketData);
      setLoading(false);
    };
    fetchData();
  }, []);

  const myAssets = assets.map(asset => {
    const marketCoin = coins.find(c => c.id === asset.id);
    return {
      ...asset,
      current_price: marketCoin ? marketCoin.current_price : 0,
      image: marketCoin ? marketCoin.image : '',
      symbol: marketCoin ? marketCoin.symbol : '',
      name: marketCoin ? marketCoin.name : asset.id,
      total_value: marketCoin ? asset.amount * marketCoin.current_price : 0
    };
  });

  const totalAssetValue = myAssets.reduce((acc, curr) => acc + curr.total_value, 0);
  const netWorth = totalAssetValue + balance;

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold text-white mb-6">My Assets 💼</h1>

      {/* Net Worth Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 rounded-2xl shadow-xl mb-8 text-white">
        <p className="text-blue-200 text-sm mb-1">Total Net Worth</p>
        <h2 className="text-4xl font-bold">${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
        <div className="mt-4 flex justify-between text-sm opacity-80">
          <span>Cash: ${balance.toLocaleString()}</span>
          <span>Assets: ${totalAssetValue.toLocaleString()}</span>
        </div>
      </div>

      {/* Asset List */}
      <div className="space-y-4">
        {myAssets.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">
            <p className="mb-4">You don't own any crypto yet.</p>
            <Link to="/" className="text-blue-400 border border-blue-400 px-4 py-2 rounded-lg hover:bg-blue-400 hover:text-white transition">
              Go to Market
            </Link>
          </div>
        ) : (
          myAssets.map(asset => (
            <div key={asset.id} className="bg-slate-800 p-4 rounded-xl flex items-center justify-between border border-slate-700">
              <div className="flex items-center gap-3">
                {asset.image && <img src={asset.image} alt={asset.name} className="w-10 h-10 rounded-full" />}
                <div>
                  <h3 className="font-bold text-white uppercase">{asset.symbol}</h3>
                  <p className="text-xs text-gray-400">{asset.amount} units</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-bold">${asset.total_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-xs text-blue-400">${asset.current_price.toLocaleString()}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Portfolio;