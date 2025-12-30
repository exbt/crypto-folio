import React, { useState, useMemo } from 'react';
import { useCrypto } from '../context/CryptoContext';
import { useNavigate } from 'react-router-dom';
import { AiOutlineArrowLeft, AiOutlineCalendar, AiOutlineSearch, AiOutlineClose, AiOutlineCheckCircle } from 'react-icons/ai';
import { BiTransfer, BiTrendingUp, BiTrendingDown, BiRevision } from 'react-icons/bi';
import useHybridPrices from '../hooks/useHybridPrices';

const TransactionHistory = () => {
    const { transactions } = useCrypto();
    const navigate = useNavigate();
    
    const livePrices = useHybridPrices();

    const [filterType, setFilterType] = useState('ALL'); 
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedTx, setSelectedTx] = useState(null); 

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const txDate = new Date(tx.date?.seconds * 1000);
            
            const typeMatch = filterType === 'ALL' 
                ? true 
                : tx.type.toLowerCase() === filterType.toLowerCase();

            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            
            if (end) end.setHours(23, 59, 59);

            const afterStart = start ? txDate >= start : true;
            const beforeEnd = end ? txDate <= end : true;

            return typeMatch && afterStart && beforeEnd;
        }).sort((a, b) => b.date?.seconds - a.date?.seconds); 
    }, [transactions, filterType, startDate, endDate]);

    const getIcon = (type) => {
        switch (type) {
            case 'buy': return <BiTrendingUp size={24} className="text-green-400" />;
            case 'sell': return <BiTrendingDown size={24} className="text-red-400" />;
            case 'send': return <BiTransfer size={24} className="text-blue-400" />;
            case 'convert': return <BiRevision size={24} className="text-purple-400" />;
            default: return <BiTransfer size={24} className="text-gray-400" />;
        }
    };

    const getTransactionDetails = (tx) => {
        if (!tx) return {};

        const amount = parseFloat(tx.amount) || 0;
        const historicalPrice = parseFloat(tx.price) || 0;
        
        const symbol = tx.coinId?.toLowerCase();
        const currentPrice = livePrices[symbol]?.price || 0;

        const displayPrice = historicalPrice > 0 ? historicalPrice : currentPrice;
        
        const isEstimated = historicalPrice <= 0 && currentPrice > 0;

        const totalValue = amount * displayPrice;

        return { amount, displayPrice, totalValue, isEstimated };
    };

    return (
        <div className="min-h-screen bg-slate-900 pb-20">
            <div className="sticky top-0 bg-slate-900/90 backdrop-blur z-20 p-4 border-b border-slate-800">
                <div className="flex items-center gap-4 max-w-4xl mx-auto">
                    <button onClick={() => navigate(-1)} className="p-2 bg-slate-800 rounded-full text-white hover:bg-slate-700">
                        <AiOutlineArrowLeft size={20} />
                    </button>
                    <h1 className="text-xl font-bold text-white">Transaction History</h1>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 space-y-6">
                
                <div className="bg-slate-800 rounded-2xl p-4 shadow-lg border border-slate-700">
                    <div className="flex overflow-x-auto gap-2 pb-4 scrollbar-hide">
                        {['ALL', 'BUY', 'SELL', 'SEND', 'CONVERT'].map(type => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                                    filterType === type 
                                    ? 'bg-blue-600 text-white shadow-lg scale-105' 
                                    : 'bg-slate-700 text-gray-400 hover:bg-slate-600 hover:text-white'
                                }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700/50">
                        <div>
                            <label className="text-[10px] text-gray-400 uppercase font-bold pl-1 block mb-1">Start Date</label>
                            <div className="relative">
                                <AiOutlineCalendar className="absolute left-3 top-3 text-gray-400" />
                                <input 
                                    type="date" 
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-slate-900 text-white text-xs p-2.5 pl-9 rounded-lg border border-slate-700 focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-400 uppercase font-bold pl-1 block mb-1">End Date</label>
                            <div className="relative">
                                <AiOutlineCalendar className="absolute left-3 top-3 text-gray-400" />
                                <input 
                                    type="date" 
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full bg-slate-900 text-white text-xs p-2.5 pl-9 rounded-lg border border-slate-700 focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <h2 className="text-gray-400 text-xs font-bold uppercase pl-2">
                        {filteredTransactions.length} Transactions Found
                    </h2>
                    
                    {filteredTransactions.length === 0 ? (
                        <div className="text-center py-20 opacity-50">
                            <AiOutlineSearch size={48} className="mx-auto mb-2 text-gray-600"/>
                            <p className="text-gray-400">No transactions found.</p>
                        </div>
                    ) : (
                        filteredTransactions.map(tx => (
                            <div 
                                key={tx.id} 
                                onClick={() => setSelectedTx(tx)}
                                className="bg-slate-800 hover:bg-slate-750 p-4 rounded-xl flex items-center justify-between border border-slate-700/50 hover:border-blue-500/50 cursor-pointer transition active:scale-[0.98]"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center border border-slate-700">
                                        {getIcon(tx.type)}
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-sm uppercase">{tx.type}</h3>
                                        <p className="text-gray-400 text-xs font-mono">
                                            {new Date(tx.date?.seconds * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold text-sm ${tx.type === 'buy' ? 'text-green-400' : tx.type === 'sell' || tx.type === 'send' ? 'text-red-400' : 'text-white'}`}>
                                        {tx.type === 'buy' ? '+' : '-'}{tx.amount} {tx.coinId?.toUpperCase()}
                                    </p>
                                    <p className="text-xs text-blue-400 font-mono">Completed</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {selectedTx && (() => {
                const { amount, displayPrice, totalValue, isEstimated } = getTransactionDetails(selectedTx);
                
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                        <div className="bg-slate-800 w-full max-w-sm rounded-3xl p-6 relative border border-slate-700 shadow-2xl animate-in fade-in zoom-in duration-200">
                            <button onClick={() => setSelectedTx(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                                <AiOutlineClose size={24} />
                            </button>
                            
                            <div className="flex flex-col items-center mb-6">
                                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-3 text-blue-400 border border-blue-500/20">
                                    <AiOutlineCheckCircle size={32} />
                                </div>
                                <h2 className="text-2xl font-bold text-white uppercase">{selectedTx.type} Success</h2>
                                <p className="text-gray-400 text-sm">
                                    {new Date(selectedTx.date?.seconds * 1000).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}
                                </p>
                            </div>

                            <div className="space-y-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                                <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                                    <span className="text-gray-400 text-sm">Asset</span>
                                    <span className="text-white font-bold">{selectedTx.coinId?.toUpperCase()}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                                    <span className="text-gray-400 text-sm">Amount</span>
                                    <span className={`font-bold ${selectedTx.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                                        {amount}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                                    <span className="text-gray-400 text-sm">
                                        Price {isEstimated ? <span className="text-yellow-500 text-[10px]">(Current)</span> : ''}
                                    </span>
                                    <span className="text-white font-mono">
                                        ${displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400 text-sm">
                                        Total Value {isEstimated ? <span className="text-yellow-500 text-[10px]">(Est.)</span> : ''}
                                    </span>
                                    <span className="text-white font-bold text-lg">
                                        ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            {selectedTx.type === 'send' && (
                                <div className="mt-4 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Receiver ID</p>
                                    <p className="text-white font-mono text-sm break-all">{selectedTx.targetId || 'External'}</p>
                                </div>
                            )}

                            <div className="mt-6">
                                <button onClick={() => setSelectedTx(null)} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition">
                                    Close Details
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default TransactionHistory;