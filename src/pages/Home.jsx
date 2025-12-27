import React, { useEffect, useState } from 'react';
import { getMarketData } from '../services/api';
import { Link } from 'react-router-dom';
import { AiOutlineSearch } from 'react-icons/ai';

const Home = () => {
    const [coins, setCoins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchCoins = async () => {
            const data = await getMarketData();
            setCoins(data);
            setLoading(false);
        };

        fetchCoins();
    }, []);

    const filteredCoins = coins.filter(coin =>
        coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 pb-20">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-white">Market 📈</h1>
            </div>

            <div className="relative mb-6">
                <AiOutlineSearch className="absolute left-3 top-3.5 text-gray-400 text-xl" />
                <input
                    type="text"
                    placeholder="Search coins (e.g. Bitcoin, ETH)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-800 text-white pl-10 pr-4 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                />
            </div>

            {loading ? (
                <div className="text-center text-blue-400 mt-10 animate-pulse">Loading market data...</div>) : (
                <div className="space-y-4">
                    
                    {filteredCoins.length === 0 && (
                        <div className="text-center text-gray-500 mt-8">
                            No coins found matching "{searchTerm}" 🔍
                        </div>
                    )}

                    {filteredCoins.map((coin) => (
                        <Link
                            to={`/coin/${coin.id}`}
                            key={coin.id}
                            className="bg-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg border border-slate-700 hover:border-blue-500 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <img src={coin.image} alt={coin.name} className="w-10 h-10 rounded-full" />
                                <div>
                                    <h2 className="font-bold text-white text-lg">{coin.symbol.toUpperCase()}</h2>
                                    <p className="text-xs text-gray-400 font-medium">{coin.name}</p>
                                </div>
                            </div>

                            <div className="text-right">
                                <p className="text-white font-mono font-bold text-lg">${coin.current_price.toLocaleString()}</p>
                                <p className={`text-sm font-bold flex justify-end items-center gap-1 ${coin.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {coin.price_change_percentage_24h > 0 ? '▲' : '▼'} {coin.price_change_percentage_24h?.toFixed(2)}%
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