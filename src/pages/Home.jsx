import React, { useState } from 'react';
import { useCrypto } from '../context/CryptoContext';
import { Link } from 'react-router-dom';
import useHybridPrices from '../hooks/useHybridPrices';
import { AiOutlineSearch } from 'react-icons/ai';

const Home = () => {
    const { cryptoMasterList, isMasterLoading } = useCrypto();
    const livePrices = useHybridPrices();
    
    const [searchTerm, setSearchTerm] = useState("");

    const filteredCoins = cryptoMasterList.filter(coin => 
        coin.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isMasterLoading) return <div className="text-white text-center mt-10 animate-pulse">Loading Market Data...</div>;

    return (
        <div className="p-4 pb-24 max-w-4xl mx-auto">
            
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white mb-4">Market</h1>
                <div className="relative">
                    <AiOutlineSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search coins (e.g. Bitcoin, BTC)..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-800 text-white pl-10 pr-4 py-3 rounded-xl border border-slate-700 focus:border-blue-500 outline-none transition-all"
                    />
                </div>
            </div>

            <div className="space-y-3">
                {filteredCoins.map((coin) => {
                    const symbol = coin.symbol.toLowerCase();
                    const liveData = livePrices[symbol];
                    
                    const currentPrice = liveData ? liveData.price : coin.current_price;
                    const rawChange = liveData ? liveData.change : coin.price_change_percentage_24h;
                    
                    const priceChange = (rawChange === null || isNaN(parseFloat(rawChange))) ? 0 : parseFloat(rawChange);

                    const isGate = liveData?.source === 'gate';
                    const borderClass = isGate ? 'border-blue-500/50 shadow-blue-500/10' : 'border-slate-700';

                    return (
                        <Link to={`/coin/${coin.id}`} key={coin.id} className="block">
                            <div className={`bg-slate-800 p-4 rounded-xl flex items-center justify-between border ${borderClass} hover:border-blue-500 transition-all shadow-sm group`}>
                                <div className="flex items-center gap-3">
                                    <img src={coin.image} alt={coin.name} className="w-10 h-10 rounded-full bg-slate-700" loading="lazy" />
                                    <div>
                                        <h3 className="font-bold text-white">{coin.name}</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-400 uppercase font-bold">{coin.symbol}</span>
                                            {isGate && <span className="text-[9px] bg-blue-900 text-blue-200 px-1.5 py-0.5 rounded">GATE</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold font-mono transition-colors duration-300 ${liveData ? 'text-white' : 'text-gray-300'}`}>
                                        ${currentPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                                    </p>
                                    <div className={`flex items-center justify-end gap-1 text-xs font-bold ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        <span>{priceChange >= 0 ? '▲' : '▼'} {Math.abs(priceChange).toFixed(2)}%</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
                
                {filteredCoins.length === 0 && (
                    <div className="text-center text-gray-500 py-10">No coins found.</div>
                )}
            </div>
        </div>
    );
};

export default Home;