import React, { useState, useMemo, useEffect } from 'react';
import { useCrypto } from '../context/CryptoContext';
import { useNavigate } from 'react-router-dom';
import { AiOutlineArrowLeft, AiOutlineCalendar, AiOutlineSearch, AiOutlineClose, AiOutlineCheckCircle, AiOutlineCopy, AiOutlineArrowRight, AiOutlineArrowDown, AiOutlineArrowUp } from 'react-icons/ai';
import { BiTransfer, BiTrendingUp, BiTrendingDown, BiRevision } from 'react-icons/bi';
import useHybridPrices from '../hooks/useHybridPrices';
import toast from 'react-hot-toast';

const TransactionHistory = () => {
    const { transactions } = useCrypto();
    const navigate = useNavigate();
    const livePrices = useHybridPrices();


    const [mainFilter, setMainFilter] = useState('ALL'); 
    const [subFilter, setSubFilter] = useState('ALL');   

    const [activeStartDate, setActiveStartDate] = useState('');
    const [activeEndDate, setActiveEndDate] = useState('');

    const [tempStartDate, setTempStartDate] = useState('');
    const [tempEndDate, setTempEndDate] = useState('');

    const [showDateModal, setShowDateModal] = useState(false);
    const [selectedTx, setSelectedTx] = useState(null);

    useEffect(() => {
        if (showDateModal) {
            setTempStartDate(activeStartDate);
            setTempEndDate(activeEndDate);
        }
    }, [showDateModal, activeStartDate, activeEndDate]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const txDate = new Date(tx.date?.seconds * 1000);
            const type = tx.type.toLowerCase();
            
            let typeMatch = false;
            if (mainFilter === 'ALL') {
                typeMatch = true;
            } else if (mainFilter === 'BUY' || mainFilter === 'SELL' || mainFilter === 'CONVERT') {
                typeMatch = type === mainFilter.toLowerCase();
            } else if (mainFilter === 'TRANSFER') {
                if (subFilter === 'ALL') {
                    typeMatch = type === 'deposit' || type === 'withdraw' || type === 'send';
                } else {
                    if (subFilter === 'WITHDRAW') typeMatch = type === 'withdraw' || type === 'send';
                    if (subFilter === 'DEPOSIT') typeMatch = type === 'deposit';
                }
            }

            const start = activeStartDate ? new Date(activeStartDate) : null;
            const end = activeEndDate ? new Date(activeEndDate) : null;
            
            if (end) end.setHours(23, 59, 59);

            const afterStart = start ? txDate >= start : true;
            const beforeEnd = end ? txDate <= end : true;

            return typeMatch && afterStart && beforeEnd;
        }).sort((a, b) => b.date?.seconds - a.date?.seconds); 
    }, [transactions, mainFilter, subFilter, activeStartDate, activeEndDate]);

    const getIcon = (type) => {
        switch (type) {
            case 'buy': return <BiTrendingUp size={24} className="text-green-400" />;
            case 'sell': return <BiTrendingDown size={24} className="text-red-400" />;
            case 'withdraw': 
            case 'send': return <AiOutlineArrowUp size={24} className="text-red-400" />;
            case 'deposit': return <AiOutlineArrowDown size={24} className="text-green-400" />;
            case 'convert': return <BiRevision size={24} className="text-purple-400" />;
            default: return <BiTransfer size={24} className="text-gray-400" />;
        }
    };

    const getTransactionDetails = (tx) => {
        if (!tx) return {};

        const rawPrice = tx.executionPrice !== undefined ? tx.executionPrice : tx.price;
        const amount = parseFloat(tx.amount) || 0;
        const price = parseFloat(rawPrice) || 0;
        
        const symbol = tx.coinId?.toLowerCase();
        const currentPrice = livePrices[symbol]?.price || 0;
        const displayPrice = price > 0 ? price : currentPrice;
        
        const totalValue = amount * displayPrice;

        return { amount, displayPrice, totalValue };
    };

    const copyTxID = (id) => {
        navigator.clipboard.writeText(id);
        toast.success("ID Copied");
    };

    const setPresetDate = (days) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days);
        
        setTempEndDate(end.toISOString().split('T')[0]);
        setTempStartDate(start.toISOString().split('T')[0]);
    };

    const applyFilters = () => {
        setActiveStartDate(tempStartDate);
        setActiveEndDate(tempEndDate);
        setShowDateModal(false);
        toast.success("Filters Applied");
    };

    const resetDates = () => {
        setTempStartDate('');
        setTempEndDate('');
        setActiveStartDate('');
        setActiveEndDate('');
        setShowDateModal(false);
        toast.success("Filters Reset");
    };

    return (
        <div className="min-h-screen bg-slate-900 pb-20 relative">
            {/* HEADER */}
            <div className="sticky top-0 bg-slate-900/90 backdrop-blur z-20 p-4 border-b border-slate-800">
                <div className="flex items-center justify-between max-w-4xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 bg-slate-800 rounded-full text-white hover:bg-slate-700">
                            <AiOutlineArrowLeft size={20} />
                        </button>
                        <h1 className="text-xl font-bold text-white">History</h1>
                    </div>
                    <button 
                        onClick={() => setShowDateModal(true)} 
                        className={`p-2 rounded-full transition ${activeStartDate || activeEndDate ? 'bg-blue-600 text-white' : 'bg-slate-800 text-gray-400 hover:text-white'}`}
                    >
                        <AiOutlineCalendar size={20} />
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 space-y-6">
                
                <div className="bg-slate-800 rounded-2xl p-4 shadow-lg border border-slate-700">
                    <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
                        {['ALL', 'BUY', 'SELL', 'TRANSFER', 'CONVERT'].map(type => (
                            <button
                                key={type}
                                onClick={() => { setMainFilter(type); if(type !== 'TRANSFER') setSubFilter('ALL'); }}
                                className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                                    mainFilter === type 
                                    ? 'bg-blue-600 text-white shadow-lg scale-105' 
                                    : 'bg-slate-700 text-gray-400 hover:bg-slate-600 hover:text-white'
                                }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>

                    {mainFilter === 'TRANSFER' && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700 animate-in slide-in-from-top-2 duration-200">
                            {['ALL', 'DEPOSIT', 'WITHDRAW'].map(sub => (
                                <button
                                    key={sub}
                                    onClick={() => setSubFilter(sub)}
                                    className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                                        subFilter === sub 
                                        ? 'bg-slate-600 text-white border border-slate-500' 
                                        : 'bg-slate-900/50 text-gray-500 hover:text-gray-300'
                                    }`}
                                >
                                    {sub}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center px-2">
                        <h2 className="text-gray-400 text-xs font-bold uppercase">
                            {filteredTransactions.length} Transactions
                        </h2>
                        {(activeStartDate || activeEndDate) && (
                            <span className="text-[10px] text-blue-400 bg-blue-400/10 px-2 py-1 rounded border border-blue-400/20">
                                {activeStartDate} / {activeEndDate}
                            </span>
                        )}
                    </div>
                    
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
                                        <h3 className="text-white font-bold text-sm uppercase">{tx.type === 'send' ? 'withdraw' : tx.type}</h3>
                                        <p className="text-gray-400 text-xs font-mono">
                                            {new Date(tx.date?.seconds * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold text-sm ${
                                        tx.type === 'buy' || tx.type === 'deposit' ? 'text-green-400' : 
                                        tx.type === 'sell' || tx.type === 'withdraw' || tx.type === 'send' ? 'text-red-400' : 'text-white'
                                    }`}>
                                        {tx.type === 'buy' || tx.type === 'deposit' ? '+' : '-'}{tx.amount} {tx.coinId?.toUpperCase()}
                                    </p>
                                    <p className="text-xs text-blue-400 font-mono">Completed</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {showDateModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end">
                    <div className="bg-slate-800 w-full rounded-t-3xl p-6 pb-24 border-t border-slate-700 shadow-2xl animate-in slide-in-from-bottom duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-white font-bold text-lg">Select Date Range</h2>
                            <button onClick={() => setShowDateModal(false)} className="bg-slate-700 p-2 rounded-full text-white">
                                <AiOutlineClose />
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {[7, 30, 120].map(day => (
                                <button 
                                    key={day} 
                                    onClick={() => setPresetDate(day)}
                                    className="bg-slate-700 hover:bg-slate-600 text-gray-300 py-3 rounded-xl text-xs font-bold transition border border-slate-600/30 active:scale-95"
                                >
                                    Last {day} Days
                                </button>
                            ))}
                        </div>

                        <div className="space-y-4">
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Custom Range</p>
                            
                            <div className="flex items-center gap-3">
                                <div className="flex-1 bg-[#0b1426] p-3 rounded-2xl border border-slate-700/80 hover:border-blue-500/50 transition relative group">
                                    <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">From</label>
                                    <input 
                                        type="date" 
                                        max={new Date().toISOString().split('T')[0]}
                                        value={tempStartDate}
                                        onChange={(e) => setTempStartDate(e.target.value)}
                                        className="bg-transparent text-white w-full outline-none text-sm font-mono z-10 relative cursor-pointer"
                                    />
                                    <AiOutlineCalendar className="absolute right-3 bottom-3 text-slate-600 group-hover:text-blue-400 transition" />
                                </div>

                                <div className="text-slate-500">
                                    <AiOutlineArrowRight />
                                </div>

                                <div className="flex-1 bg-[#0b1426] p-3 rounded-2xl border border-slate-700/80 hover:border-blue-500/50 transition relative group">
                                    <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">To</label>
                                    <input 
                                        type="date" 
                                        max={new Date().toISOString().split('T')[0]}
                                        value={tempEndDate}
                                        onChange={(e) => setTempEndDate(e.target.value)}
                                        className="bg-transparent text-white w-full outline-none text-sm font-mono z-10 relative cursor-pointer"
                                    />
                                    <AiOutlineCalendar className="absolute right-3 bottom-3 text-slate-600 group-hover:text-blue-400 transition" />
                                </div>
                            </div>
                            
                            <div className="flex gap-3 mt-6">
                                <button onClick={resetDates} className="flex-1 bg-slate-700/50 text-gray-400 py-4 rounded-xl font-bold hover:bg-slate-700 hover:text-white transition border border-slate-600/30">
                                    Reset
                                </button>
                                <button onClick={applyFilters} className="flex-[2] bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-500 transition shadow-lg shadow-blue-900/20 active:scale-[0.98]">
                                    Apply Filters
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedTx && (() => {
                const { amount, displayPrice, totalValue } = getTransactionDetails(selectedTx);
                const isTransfer = selectedTx.type === 'send' || selectedTx.type === 'withdraw' || selectedTx.type === 'deposit';
                
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
                                <h2 className="text-2xl font-bold text-white uppercase">{selectedTx.type === 'send' ? 'WITHDRAW' : selectedTx.type} Success</h2>
                                <p className="text-gray-400 text-sm mt-1">
                                    {new Date(selectedTx.date?.seconds * 1000).toLocaleString('en-US', { 
                                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                                    })}
                                </p>
                            </div>

                            <div className="space-y-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                                <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                                    <span className="text-gray-400 text-sm">Transaction ID</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-blue-400 font-mono text-[10px] tracking-wide">
                                            {selectedTx.id.substring(0, 12)}...
                                        </span>
                                        <button onClick={() => copyTxID(selectedTx.id)} className="text-gray-400 hover:text-white transition">
                                            <AiOutlineCopy size={14} />
                                        </button>
                                    </div>
                                </div>

                                {isTransfer ? (
                                    <>
                                        <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                                            <span className="text-gray-400 text-sm">Asset</span>
                                            <span className="text-white font-bold">
                                                {selectedTx.coinId ? selectedTx.coinId.toUpperCase() : 'USD (CASH)'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                                            <span className="text-gray-400 text-sm">Amount</span>
                                            <span className={`font-bold ${selectedTx.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                                                {selectedTx.type === 'deposit' ? '+' : '-'}{amount}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400 text-sm">
                                                {selectedTx.type === 'deposit' ? 'Sender ID' : 'Receiver ID'}
                                            </span>
                                            <span className="text-white font-mono text-sm break-all">
                                                {selectedTx.targetId || 'External'}
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                                            <span className="text-gray-400 text-sm">Asset</span>
                                            <span className="text-white font-bold">{selectedTx.coinId?.toUpperCase()}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                                            <span className="text-gray-400 text-sm">Execution Price</span>
                                            <span className="text-white font-mono">
                                                ${displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                                            <span className="text-gray-400 text-sm">Amount</span>
                                            <span className={`font-bold ${selectedTx.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                                                {amount}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400 text-sm">Total Value</span>
                                            <span className="text-white font-bold text-lg">
                                                ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>

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