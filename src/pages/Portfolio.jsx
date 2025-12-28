import React, { useEffect, useState } from 'react';
import { useCrypto } from '../context/CryptoContext';
import { getMarketData } from '../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { AiOutlineLogout, AiOutlineDown, AiOutlineUp, AiOutlineSwap, AiOutlineClose, AiOutlineCopy, AiOutlineHistory } from 'react-icons/ai';
import toast from 'react-hot-toast';

const Portfolio = () => {

    const { assets, balance, logout, setAssets, setBalance, userId, handleTransfer, updateUserPortfolio, transactions } = useCrypto();

    const [coins, setCoins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const navigate = useNavigate();

    const [showDepositModal, setShowDepositModal] = useState(false);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    const [targetId, setTargetId] = useState("");
    const [transferAmount, setTransferAmount] = useState("");
    const [transferType, setTransferType] = useState("cash");
    const [selectedCoinToTransfer, setSelectedCoinToTransfer] = useState("");

    const DUST_LIMIT = 10.0;

    useEffect(() => {
        const fetchData = async () => {
            const marketData = await getMarketData();
            setCoins(marketData);
            setLoading(false);
        };
        fetchData();
    }, []);

    const handleLogout = async () => {
        try { await logout(); navigate('/login'); } catch (error) { }
    };

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const myAssets = (assets || []).map(asset => {
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


    const handleConvertDust = async () => {
        const dustAssets = myAssets.filter(asset => asset.total_value > 0 && asset.total_value < DUST_LIMIT);
        if (dustAssets.length === 0) { toast.error(`No small balances found.`); return; }

        const totalDustValue = dustAssets.reduce((acc, curr) => acc + curr.total_value, 0);

        toast((t) => (
            <div className="flex flex-col gap-3">
                <div className="font-bold text-sm">
                    A total of <span className="text-green-400">${totalDustValue.toFixed(4)}</span> will be cashed out for {dustAssets.length} units of assets.
                </div>
                <div className="flex gap-2">
                    
                    <button 
                        onClick={async () => {
                            toast.dismiss(t.id); 
                            
                            
                            const remainingAssets = assets.filter(asset => !dustAssets.some(d => d.id === asset.id));
                            const newBalance = balance + totalDustValue;

                            setAssets(remainingAssets);
                            setBalance(newBalance);
                            
                            if (updateUserPortfolio) {
                                await updateUserPortfolio(remainingAssets, newBalance, totalDustValue);
                            }
                            toast.success("The process has been completed successfully!");
                            
                        }}
                        className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs font-bold transition"
                    >
                        Yes, convert assets into cash.
                    </button>

                    
                    <button 
                        onClick={() => toast.dismiss(t.id)}
                        className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1 rounded text-xs font-bold transition"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        ), {
            duration: 8000, 
            position: 'top-center',
            style: {
                background: '#1e293b', 
                color: '#fff',
                border: '1px solid #475569',
                maxWidth: '400px'
            }
        });
    };


    const onWithdrawSubmit = async (e) => {
        e.preventDefault();

        const loadingToast = toast.loading("Transfer is in progress...");
        try {

            await handleTransfer(
                targetId,
                transferAmount,
                transferType,
                transferType === 'asset' ? selectedCoinToTransfer : null
            );

            toast.dismiss(loadingToast);
            toast.success(`Success! $${transferAmount} was sent to user with ID ${targetId}.`);
            setShowWithdrawModal(false);
            setTargetId("");
            setTransferAmount("");
            setTransferType("cash");
        } catch (error) {
            toast.dismiss(loadingToast);
            toast.error(error.message.replace("Error:", ""));
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(userId);
        toast.success("ID copied");
    };

    const hasDust = myAssets.some(asset => asset.total_value > 0 && asset.total_value < DUST_LIMIT);

    const formatDate = (timestamp) => {
        if (!timestamp) return "";
        return new Date(timestamp.seconds * 1000).toLocaleString();
    };

    return (
        <div className="p-4 pb-24 relative">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">My Portfolio</h1>
                <div className="flex gap-2">

                    <button onClick={() => setShowHistoryModal(true)} className="bg-slate-800 text-gray-300 p-2 rounded-lg hover:bg-slate-700 hover:text-white transition">
                        <AiOutlineHistory size={20} />
                    </button>
                    <button onClick={handleLogout} className="bg-red-500/20 text-red-400 p-2 rounded-lg hover:bg-red-500 hover:text-white transition flex items-center gap-2 text-sm font-bold">
                        <AiOutlineLogout /> Logout
                    </button>
                </div>
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 rounded-2xl shadow-xl mb-8 text-white">
                <p className="text-blue-200 text-sm mb-1">Total Net Worth</p>
                <h2 className="text-4xl font-bold">${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
                <div className="mt-4 flex justify-between text-sm opacity-80">
                    <span>Cash: ${balance.toLocaleString()}</span>
                    <span>Assets: ${totalAssetValue.toLocaleString()}</span>
                </div>
                <div className="flex gap-3 mt-6 pt-4 border-t border-white/20">
                    <button onClick={() => setShowDepositModal(true)} className="flex-1 bg-white/20 hover:bg-white/30 py-2 rounded-lg font-bold text-sm transition">Deposit</button>
                    <button onClick={() => setShowWithdrawModal(true)} className="flex-1 bg-white/20 hover:bg-white/30 py-2 rounded-lg font-bold text-sm transition">Withdraw</button>
                </div>
            </div>


            <div className="space-y-4">
                {myAssets.length === 0 ? (
                    <div className="text-center text-gray-500 mt-10"><p>No assets yet.</p><Link to="/" className="text-blue-400">Go to Market</Link></div>
                ) : (
                    <>
                        {myAssets.map(asset => (
                            <div key={asset.id} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 transition-all">
                                <div onClick={() => toggleExpand(asset.id)} className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-750">
                                    <div className="flex items-center gap-3">
                                        {asset.image && <img src={asset.image} alt={asset.name} className="w-10 h-10 rounded-full" />}
                                        <div>
                                            <h3 className="font-bold text-white uppercase">{asset.symbol}</h3>
                                            <p className="text-xs text-gray-400">{asset.amount.toFixed(4)} units</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="text-white font-bold">${asset.total_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                            <p className="text-xs text-blue-400">${asset.current_price.toLocaleString()}</p>
                                        </div>
                                        {expandedId === asset.id ? <AiOutlineUp className="text-gray-400" /> : <AiOutlineDown className="text-gray-400" />}
                                    </div>
                                </div>
                                {expandedId === asset.id && (
                                    <div className="bg-slate-900/50 p-4 border-t border-slate-700 flex gap-3 animate-fade-in-down">
                                        <button onClick={() => navigate(`/coin/${asset.id}`)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-bold transition">Go to Spot</button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {hasDust && (
                            <div className="mt-6 p-4 border border-yellow-600/30 bg-yellow-900/10 rounded-xl flex justify-between items-center animate-pulse">
                                <div>
                                    <p className="text-yellow-500 font-bold text-sm">Dust Balance Found</p>
                                    <p className="text-xs text-gray-400">Convert small balances (under ${DUST_LIMIT}) to cash.</p>
                                </div>
                                <button onClick={handleConvertDust} className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition">
                                    <AiOutlineSwap /> Convert All
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>


            {showDepositModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-sm border border-slate-700 relative">
                        <button onClick={() => setShowDepositModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><AiOutlineClose size={24} /></button>
                        <h2 className="text-xl font-bold text-white mb-2">Deposit Assets</h2>
                        <div className="bg-slate-900 p-4 rounded-lg flex justify-between items-center border border-slate-600">
                            <span className="text-blue-400 font-mono text-xs break-all">{userId}</span>
                            <button onClick={copyToClipboard} className="text-white hover:text-blue-400 transition ml-2"><AiOutlineCopy size={24} /></button>
                        </div>
                    </div>
                </div>
            )}

            {showWithdrawModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-sm border border-slate-700 relative">
                        <button onClick={() => setShowWithdrawModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><AiOutlineClose size={24} /></button>
                        <h2 className="text-xl font-bold text-white mb-6">Send Assets</h2>
                        <form onSubmit={onWithdrawSubmit} className="space-y-4">
                            <div className="flex bg-slate-900 p-1 rounded-lg mb-4">
                                <button type="button" onClick={() => setTransferType('cash')} className={`flex-1 py-2 text-sm font-bold rounded transition ${transferType === 'cash' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>Cash ($)</button>
                                <button type="button" onClick={() => setTransferType('asset')} className={`flex-1 py-2 text-sm font-bold rounded transition ${transferType === 'asset' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>Crypto</button>
                            </div>
                            <div>
                                <label className="text-gray-400 text-xs uppercase font-bold block mb-2">Receiver ID</label>
                                <input type="text" placeholder="UID" value={targetId} onChange={(e) => setTargetId(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white" required />
                            </div>
                            {transferType === 'asset' && (
                                <div>
                                    <label className="text-gray-400 text-xs uppercase font-bold block mb-2">Select Coin</label>
                                    <select value={selectedCoinToTransfer} onChange={(e) => setSelectedCoinToTransfer(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white" required>
                                        <option value="">Select...</option>
                                        {assets.map(a => <option key={a.id} value={a.id}>{a.id.toUpperCase()} ({a.amount})</option>)}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="text-gray-400 text-xs uppercase font-bold block mb-2">Amount</label>
                                <input type="number" placeholder="0.00" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white" required step="any" />
                            </div>
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition shadow-lg mt-2">Confirm</button>
                        </form>
                    </div>
                </div>
            )}


            {showHistoryModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl w-full max-w-md border border-slate-700 relative max-h-[80vh] flex flex-col">
                        <div className="p-6 pb-2 border-b border-slate-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Transaction History</h2>
                            <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-white"><AiOutlineClose size={24} /></button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1 space-y-3">
                            {transactions.length === 0 ? (
                                <p className="text-center text-gray-500 py-10">No transactions found.</p>
                            ) : (
                                transactions.map((tx) => (
                                    <div key={tx.id} className="bg-slate-900/50 p-3 rounded-xl border border-slate-700 flex justify-between items-center">
                                        <div className="flex items-center gap-3">

                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
                                                ${tx.type === 'buy' || tx.type === 'send' ? 'bg-red-500/20 text-red-500' :
                                                    tx.type === 'sell' || tx.type === 'receive' || tx.type === 'dust' ? 'bg-green-500/20 text-green-500' : 'bg-gray-700 text-white'
                                                }`}>
                                                {tx.type === 'buy' ? '↓' : tx.type === 'sell' ? '↑' : tx.type === 'send' ? '→' : tx.type === 'receive' ? '←' : '♻️'}
                                            </div>
                                            <div>
                                                <p className="text-white font-bold text-sm capitalize">{tx.type} {tx.coinId && tx.coinId.toUpperCase()}</p>
                                                <p className="text-xs text-gray-400">{tx.description}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-bold text-sm ${tx.type === 'buy' || tx.type === 'send' ? 'text-white' : 'text-green-400'
                                                }`}>
                                                {tx.type === 'buy' || tx.type === 'send' ? '-' : '+'}{tx.amount.toFixed(tx.coinId ? 4 : 2)}
                                                {tx.coinId ? '' : '$'}
                                            </p>
                                            <p className="text-[10px] text-gray-500">{formatDate(tx.date)}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Portfolio;