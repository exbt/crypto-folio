import React, { useState } from 'react';
import { useCrypto } from '../context/CryptoContext';
import { useNavigate } from 'react-router-dom';
import useHybridPrices from '../hooks/useHybridPrices';
import { AiFillStar, AiOutlineStar, AiOutlineSearch } from 'react-icons/ai';

const Home = () => {
    const { cryptoMasterList, isMasterLoading, watchlist, toggleWatchlist } = useCrypto();
    const livePrices = useHybridPrices();
    const navigate = useNavigate();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('ALL');

    if (isMasterLoading) {
        return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading Market...</div>;
    }

    const filteredCoins = cryptoMasterList.filter(coin => {
        const matchesSearch = coin.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              coin.symbol.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (activeTab === 'WATCHLIST') {
            return matchesSearch && watchlist.includes(coin.id);
        }
        return matchesSearch;
    });

    return (
        <div className="p-4 pb-24 max-w-4xl mx-auto">
            <div className="mb-6 relative">
                <AiOutlineSearch className="absolute left-4 top-4 text-gray-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Search coins..." 
                    className="w-full bg-slate-800 text-white pl-12 pr-4 py-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition shadow-lg"
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="flex gap-4 mb-6 border-b border-slate-700 pb-2">
                <button 
                    onClick={() => setActiveTab('ALL')}
                    className={`pb-2 text-sm font-bold transition relative ${activeTab === 'ALL' ? 'text-blue-500' : 'text-gray-400 hover:text-white'}`}
                >
                    Market
                    {activeTab === 'ALL' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-t-full"></div>}
                </button>
                <button 
                    onClick={() => setActiveTab('WATCHLIST')}
                    className={`pb-2 text-sm font-bold transition relative flex items-center gap-2 ${activeTab === 'WATCHLIST' ? 'text-yellow-500' : 'text-gray-400 hover:text-white'}`}
                >
                    <AiFillStar /> Watchlist
                    {activeTab === 'WATCHLIST' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-yellow-500 rounded-t-full"></div>}
                </button>
            </div>

            <div className="space-y-3">
                {filteredCoins.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <p className="text-gray-400">No coins found.</p>
                        {activeTab === 'WATCHLIST' && <p className="text-xs text-gray-500 mt-2">Star some coins to see them here!</p>}
                    </div>
                ) : (
                    filteredCoins.map(coin => {
                        const liveData = livePrices[coin.symbol.toLowerCase()];
                        const price = liveData ? liveData.price : coin.current_price;
                        const change = liveData ? liveData.change : coin.price_change_percentage_24h;
                        const isFav = watchlist.includes(coin.id);

                        return (
                            <div key={coin.id} className="bg-slate-800 p-4 rounded-2xl flex items-center justify-between border border-slate-700/50 hover:border-blue-500/50 transition group">
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); toggleWatchlist(coin.id); }}
                                        className={`p-2 rounded-full transition ${isFav ? 'text-yellow-500 bg-yellow-500/10' : 'text-gray-600 hover:text-yellow-500 hover:bg-slate-700'}`}
                                    >
                                        {isFav ? <AiFillStar size={20} /> : <AiOutlineStar size={20} />}
                                    </button>

                                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/coin/${coin.id}`)}>
                                        <img src={coin.image} alt={coin.name} className="w-10 h-10 rounded-full" loading="lazy" />
                                        <div>
                                            <h2 className="font-bold text-white text-base">{coin.name}</h2>
                                            <span className="text-xs text-gray-400 font-mono bg-slate-900 px-1.5 py-0.5 rounded">{coin.symbol.toUpperCase()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right cursor-pointer" onClick={() => navigate(`/coin/${coin.id}`)}>
                                    <p className="text-white font-bold font-mono text-sm">
                                        ${price.toLocaleString()}
                                    </p>
                                    <p className={`text-xs font-bold ${change >= 0 ? 'text-green-400' : 'text-red-400'} flex items-center justify-end gap-1`}>
                                        {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default Home;