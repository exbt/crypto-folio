import React, { useEffect, useState } from 'react';
import { useCrypto } from '../context/CryptoContext';
import { Link, useNavigate } from 'react-router-dom';
import { AiOutlineLogout, AiOutlineDown, AiOutlineUp, AiOutlineSwap, AiOutlineClose, AiOutlineCopy, AiOutlineHistory, AiOutlineCalendar, AiOutlineFilter } from 'react-icons/ai';
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

    const [filterType, setFilterType] = useState('all');
    const [filterDate, setFilterDate] = useState('all');
    const [customStartDate, setCustomStartDate] = useState("");
    const [customEndDate, setCustomEndDate] = useState("");

    const DUST_LIMIT = 10.0;

    useEffect(() => {
        let intervalId;

        const fetchUserCoins = async () => {
            if (!assets || assets.length === 0) {
                setCoins([]);
                setLoading(false);
                return;
            }

            const coinIds = assets.map(a => a.id).join(',');

            try {
                const response = await fetch(
                    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinIds}&order=market_cap_desc&sparkline=false`
                );
                if (!response.ok) throw new Error("API Limit");
                const data = await response.json();
                setCoins(data);
                setLoading(false);
            } catch (error) {
                // console.error("Price update error:", error);
                setLoading(false);
            }
        };


        fetchUserCoins();
        intervalId = setInterval(fetchUserCoins, 30000);

        return () => clearInterval(intervalId);
    }, [assets]);

    const handleLogout = async () => {
        try { await logout(); navigate('/login'); } catch (error) { }
    };

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    let totalInvested = 0;

    const myAssets = (assets || []).map(asset => {
        const marketCoin = coins.find(c => c.id === asset.id);

        const currentPrice = marketCoin ? marketCoin.current_price : (asset.current_price || 0);

        const totalValue = asset.amount * currentPrice;
        const change24hPercent = marketCoin ? marketCoin.price_change_percentage_24h : 0;

        const avgPrice = asset.avgPrice || currentPrice;
        const costBasis = asset.amount * avgPrice;
        totalInvested += costBasis;

        const profitLossValue = totalValue - costBasis;
        const profitLossPercent = costBasis > 0 ? (profitLossValue / costBasis) * 100 : 0;

        return {
            ...asset,
            current_price: currentPrice,
            image: marketCoin ? marketCoin.image : '',
            symbol: marketCoin ? marketCoin.symbol : '',
            name: marketCoin ? marketCoin.name : asset.id,
            total_value: totalValue,
            change24hPercent: change24hPercent,
            avgPrice: avgPrice,
            pnlValue: profitLossValue,
            pnlPercent: profitLossPercent
        };
    });

    const totalAssetValue = myAssets.reduce((acc, curr) => acc + curr.total_value, 0);
    const netWorth = totalAssetValue + balance;

    const totalWalletPnlValue = totalAssetValue - totalInvested;
    const totalWalletPnlPercent = totalInvested > 0 ? (totalWalletPnlValue / totalInvested) * 100 : 0;


    const getFilteredTransactions = () => {
        if (!transactions) return [];

        return transactions.filter(tx => {

            if (filterType !== 'all') {
                if (filterType === 'transfer' && (tx.type !== 'send' && tx.type !== 'receive')) return false;
                if (filterType !== 'transfer' && tx.type !== filterType) return false;
            }


            const txDate = tx.date ? new Date(tx.date.seconds * 1000) : new Date();
            const now = new Date();

            if (filterDate === '1d' && txDate < new Date(now.setDate(now.getDate() - 1))) return false;
            if (filterDate === '7d' && txDate < new Date(now.setDate(now.getDate() - 7))) return false;
            if (filterDate === '28d' && txDate < new Date(now.setDate(now.getDate() - 28))) return false;

            if (filterDate === 'custom') {
                const start = customStartDate ? new Date(customStartDate) : null;
                const end = customEndDate ? new Date(customEndDate) : null;
                if (end) end.setHours(23, 59, 59);

                if (start && txDate < start) return false;
                if (end && txDate > end) return false;
            }

            return true;
        });
    };

    const filteredTransactions = getFilteredTransactions();

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

            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 rounded-2xl shadow-xl mb-8 text-white relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-blue-200 text-sm mb-1 font-medium">Total Net Worth</p>
                        <h2 className="text-4xl font-bold tracking-tight">${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
                    </div>
                    <div className={`text-right ${totalWalletPnlValue >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                        <p className="text-xs opacity-80 uppercase font-bold tracking-wider">Total Profit/Loss</p>
                        <p className="text-xl font-bold">
                            {totalWalletPnlValue >= 0 ? '+' : ''}${Math.abs(totalWalletPnlValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs font-medium bg-black/20 px-2 py-0.5 rounded inline-block">
                            {totalWalletPnlValue >= 0 ? '▲' : '▼'} {Math.abs(totalWalletPnlPercent).toFixed(2)}%
                        </p>
                    </div>
                </div>
                <div className="mt-6 flex justify-between text-sm opacity-90 font-medium">
                    <span className="bg-blue-900/40 px-3 py-1 rounded-lg">Cash: ${balance.toLocaleString()}</span>
                    <span className="bg-blue-900/40 px-3 py-1 rounded-lg">Assets: ${totalAssetValue.toLocaleString()}</span>
                </div>
                <div className="flex gap-3 mt-6 pt-4 border-t border-white/20">
                    <button onClick={() => setShowDepositModal(true)} className="flex-1 bg-white/20 hover:bg-white/30 py-2.5 rounded-xl font-bold text-sm transition shadow-sm">Deposit</button>
                    <button onClick={() => setShowWithdrawModal(true)} className="flex-1 bg-white/20 hover:bg-white/30 py-2.5 rounded-xl font-bold text-sm transition shadow-sm">Withdraw</button>
                </div>
            </div>

            <div className="space-y-4">
                {myAssets.length === 0 ? (
                    <div className="text-center text-gray-500 mt-10"><p>No assets yet.</p><Link to="/" className="text-blue-400">Go to Market</Link></div>
                ) : (
                    <>
                        {myAssets.map(asset => (
                            <div key={asset.id} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 transition-all shadow-sm">
                                <div onClick={() => toggleExpand(asset.id)} className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-750">
                                    <div className="flex items-center gap-3">
                                        {asset.image && <img src={asset.image} alt={asset.name} className="w-10 h-10 rounded-full shadow-md" />}
                                        <div>
                                            <h3 className="font-bold text-white uppercase">{asset.symbol}</h3>
                                            <p className="text-xs text-gray-400 font-mono">{asset.amount.toFixed(4)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white font-bold">${asset.total_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        <div className={`text-xs font-bold flex items-center justify-end gap-1 ${asset.pnlValue >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            <span>{asset.pnlValue >= 0 ? '+' : ''}{asset.pnlPercent.toFixed(2)}%</span>
                                            <span className="opacity-60">(${asset.pnlValue.toFixed(2)})</span>
                                        </div>
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
                                    <AiOutlineSwap /> Convert
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {showHistoryModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-slate-800 rounded-2xl w-full max-w-lg border border-slate-700 relative max-h-[90vh] flex flex-col shadow-2xl">
                        <div className="p-5 pb-4 border-b border-slate-700 flex justify-between items-center bg-slate-800 rounded-t-2xl">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2"><AiOutlineHistory /> Transaction History</h2>
                            <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-white bg-slate-700 p-1 rounded-full"><AiOutlineClose size={20} /></button>
                        </div>
                        <div className="p-4 bg-slate-900/50 border-b border-slate-700 space-y-3">
                            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                {['all', 'buy', 'sell', 'dust', 'transfer'].map(type => (
                                    <button key={type} onClick={() => setFilterType(type)} className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize whitespace-nowrap transition ${filterType === type ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}>{type === 'all' ? 'All Transactions' : type}</button>
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-2 items-center">
                                <span className="text-xs text-gray-500 font-bold uppercase mr-1"><AiOutlineCalendar className="inline mb-0.5" /> Range:</span>
                                {['1d', '7d', '28d', 'all', 'custom'].map(date => (
                                    <button key={date} onClick={() => setFilterDate(date)} className={`px-3 py-1 rounded text-xs font-bold uppercase transition ${filterDate === date ? 'bg-slate-200 text-slate-900' : 'bg-slate-800 border border-slate-600 text-gray-400 hover:border-gray-400'}`}>{date === 'all' ? 'Lifetime' : date === 'custom' ? 'Custom' : `Last ${date.replace('d', '')} Days`}</button>
                                ))}
                            </div>
                            {filterDate === 'custom' && (
                                <div className="flex gap-2 mt-2 pt-2 border-t border-slate-700/50 animate-fade-in-down">
                                    <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white flex-1" />
                                    <span className="text-gray-500 self-center">-</span>
                                    <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white flex-1" />
                                </div>
                            )}
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 space-y-3 min-h-[300px]">
                            {filteredTransactions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50"><AiOutlineFilter size={40} className="mb-2" /><p>No transactions found.</p></div>
                            ) : (
                                filteredTransactions.map((tx) => (
                                    <div key={tx.id} className="bg-slate-800 p-3 rounded-xl border border-slate-700 flex justify-between items-center hover:border-slate-500 transition">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-inner font-bold ${tx.type === 'buy' || tx.type === 'send' ? 'bg-red-500/10 text-red-500' : tx.type === 'sell' || tx.type === 'receive' || tx.type === 'dust' ? 'bg-green-500/10 text-green-500' : 'bg-gray-700 text-white'}`}>
                                                {tx.type === 'buy' ? '↓' : tx.type === 'sell' ? '↑' : tx.type === 'send' ? '→' : tx.type === 'receive' ? '←' : '♻️'}
                                            </div>
                                            <div>
                                                <p className="text-white font-bold text-sm capitalize flex items-center gap-1">{tx.type} <span className="text-xs px-1.5 py-0.5 bg-slate-700 rounded text-gray-300 font-mono">{tx.coinId ? tx.coinId.toUpperCase() : 'USD'}</span></p>
                                                <p className="text-[10px] text-gray-400">{tx.description}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-bold text-sm ${tx.type === 'buy' || tx.type === 'send' ? 'text-white' : 'text-green-400'}`}>{tx.type === 'buy' || tx.type === 'send' ? '-' : '+'}{tx.amount.toFixed(4)}</p>
                                            <p className="text-[10px] text-gray-500">{formatDate(tx.date)}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
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
        </div>
    );
};

export default Portfolio;