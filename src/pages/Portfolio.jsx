import React, { useState } from 'react';
import { useCrypto } from '../context/CryptoContext';
import { useNavigate } from 'react-router-dom';
import useHybridPrices from '../hooks/useHybridPrices';
import { AiOutlineHistory, AiOutlineLogout } from 'react-icons/ai';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const Portfolio = () => {
    const { assets, balance, logout, userId, cryptoMasterList, handleTransfer, transactions } = useCrypto();
    const livePrices = useHybridPrices();
    const navigate = useNavigate();

    const [showDeposit, setShowDeposit] = useState(false);
    const [showWithdraw, setShowWithdraw] = useState(false);
    
    const [targetId, setTargetId] = useState("");
    const [amount, setAmount] = useState("");
    const [type, setType] = useState("cash");
    const [selectedCoin, setSelectedCoin] = useState("");

    let totalInvested = 0;

    const myAssets = (assets || []).map(asset => {
        const meta = cryptoMasterList.find(c => c.id === asset.id) || { 
            name: asset.id, symbol: asset.id.substring(0,3).toUpperCase(), image: "https://placehold.co/32" 
        };
        const symbol = meta.symbol.toLowerCase();
        
        const liveData = livePrices[symbol];
        const currentPrice = liveData ? liveData.price : (meta.current_price || 0);
        
        const totalValue = asset.amount * currentPrice;
        const avgPrice = asset.avgPrice || currentPrice;
        const costBasis = asset.amount * avgPrice;
        totalInvested += costBasis;
        
        const pnlValue = totalValue - costBasis;
        const pnlPercent = costBasis > 0 ? (pnlValue / costBasis) * 100 : 0;

        return { ...asset, ...meta, currentPrice, totalValue, pnlValue, pnlPercent };
    });

    const totalAssetValue = myAssets.reduce((acc, c) => acc + c.totalValue, 0);
    const netWorth = totalAssetValue + balance;
    const totalPnl = totalAssetValue - totalInvested;
    const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];
    
    const pieData = [
        { name: 'Cash (USD)', value: balance, color: '#3b82f6' }, 
        ...myAssets.map((asset, index) => ({
            name: asset.symbol.toUpperCase(),
            value: asset.totalValue,
            color: COLORS[(index + 1) % COLORS.length] 
        }))
    ]
    .filter(item => item.value > 1) 
    .sort((a, b) => b.value - a.value); 

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-slate-700 p-2 rounded-lg shadow-xl">
                    <p className="text-white font-bold text-xs">{payload[0].name}</p>
                    <p className="text-blue-400 text-xs font-mono">
                        ${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
            );
        }
        return null;
    };

    const handleLogout = async () => { try { await logout(); navigate('/login'); } catch (e) {} };
    const copyID = () => { navigator.clipboard.writeText(userId); toast.success("ID Copied"); };
    
    const handleWithdraw = async (e) => {
        e.preventDefault();
        try {
            await handleTransfer(targetId, amount, type, type === 'asset' ? selectedCoin : null);
            toast.success("Transfer Successful"); setShowWithdraw(false);
        } catch (err) { toast.error(typeof err === 'string' ? err : "Error"); }
    };

    return (
        <div className="p-4 pb-24 relative max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">Portfolio</h1>
                <div className="flex gap-2">
                    <button onClick={() => navigate('/transactions')} className="bg-slate-800 text-gray-300 p-2 rounded-lg hover:text-white hover:bg-slate-700 transition">
                        <AiOutlineHistory size={20} />
                    </button>
                    <button onClick={handleLogout} className="bg-red-500/20 text-red-400 p-2 rounded-lg hover:bg-red-500 hover:text-white transition">
                        <AiOutlineLogout size={20} />
                    </button>
                </div>
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 rounded-2xl shadow-xl mb-6 text-white relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-blue-200 text-sm font-medium">Total Net Worth</p>
                            <h2 className="text-4xl font-bold tracking-tight">${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
                        </div>
                        <div className={`text-right ${totalPnl >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                            <p className="text-xs opacity-80 uppercase font-bold">Total PNL</p>
                            <div className="flex items-center justify-end gap-1">
                                <span className="text-sm">{totalPnl >= 0 ? '▲' : '▼'}</span>
                                <span className="text-xl font-bold">${Math.abs(totalPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <p className="text-xs font-bold bg-black/20 px-2 py-0.5 rounded inline-block">
                                {totalPnlPercent >= 0 ? '+' : ''}{totalPnlPercent.toFixed(2)}%
                            </p>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-between text-sm opacity-90 font-medium">
                        <span className="bg-blue-900/40 px-3 py-1 rounded-lg">Cash: ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span className="bg-blue-900/40 px-3 py-1 rounded-lg">Assets: ${totalAssetValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex gap-3 mt-6 pt-4 border-t border-white/20">
                        <button onClick={() => setShowDeposit(true)} className="flex-1 bg-white/20 hover:bg-white/30 py-2.5 rounded-xl font-bold text-sm transition">Deposit</button>
                        <button onClick={() => setShowWithdraw(true)} className="flex-1 bg-white/20 hover:bg-white/30 py-2.5 rounded-xl font-bold text-sm transition">Withdraw</button>
                    </div>
                </div>
                <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
            </div>

            {pieData.length > 0 && (
                <div className="bg-slate-800 rounded-2xl p-4 mb-6 border border-slate-700 shadow-lg">
                    <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                        <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                        Allocation
                    </h3>
                    <div className="h-[200px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend 
                                    verticalAlign="middle" 
                                    align="right" 
                                    layout="vertical"
                                    iconType="circle"
                                    iconSize={8}
                                    wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            <h3 className="text-white font-bold text-sm mb-3 pl-1">Your Assets</h3>
            <div className="space-y-4">
                {myAssets.length === 0 ? (
                    <div className="text-center py-10 bg-slate-800 rounded-2xl border border-slate-700 border-dashed">
                        <p className="text-gray-500 text-sm">No assets found.</p>
                        <button onClick={() => setShowDeposit(true)} className="mt-2 text-blue-400 text-xs font-bold hover:underline">Deposit Funds</button>
                    </div>
                ) : (
                    myAssets.map(asset => (
                    <div key={asset.id} onClick={() => navigate(`/coin/${asset.id}`)} className="bg-slate-800 rounded-xl p-4 flex justify-between items-center border border-slate-700 hover:border-blue-500 transition cursor-pointer active:scale-[0.98]">
                        <div className="flex items-center gap-3">
                            <img src={asset.image} className="w-10 h-10 rounded-full bg-slate-700" loading="lazy" />
                            <div>
                                <h3 className="font-bold text-white capitalize">{asset.name}</h3>
                                <p className="text-xs text-gray-400 font-mono">{asset.amount.toFixed(4)} {asset.symbol.toUpperCase()}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-white font-bold">${asset.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            <div className={`text-xs font-bold flex items-center justify-end gap-1 ${asset.pnlValue >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                <span>{asset.pnlValue >= 0 ? '▲' : '▼'}</span>
                                {asset.pnlPercent.toFixed(2)}%
                            </div>
                        </div>
                    </div>
                )))}
            </div>
            
            {showDeposit && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-sm relative border border-slate-700 animate-in zoom-in duration-200">
                        <button onClick={() => setShowDeposit(false)} className="absolute top-4 right-4 text-white">X</button>
                        <h2 className="text-xl font-bold text-white mb-2">Deposit</h2>
                        <div className="bg-slate-900 p-3 rounded text-blue-400 text-xs break-all flex justify-between items-center border border-slate-600">
                            {userId} <button onClick={copyID} className="text-white ml-2 font-bold bg-slate-700 px-2 py-1 rounded hover:bg-slate-600">COPY</button>
                        </div>
                    </div>
                </div>
            )}
            
            {showWithdraw && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-sm relative border border-slate-700 animate-in zoom-in duration-200">
                        <button onClick={() => setShowWithdraw(false)} className="absolute top-4 right-4 text-white">X</button>
                        <h2 className="text-xl font-bold text-white mb-4">Withdraw</h2>
                        <form onSubmit={handleWithdraw} className="space-y-4">
                            <div className="flex bg-slate-900 p-1 rounded-lg">
                                <button type="button" onClick={() => setType('cash')} className={`flex-1 py-2 rounded-md text-sm font-bold transition ${type==='cash'?'bg-blue-600 text-white':'text-gray-400 hover:text-white'}`}>Cash</button>
                                <button type="button" onClick={() => setType('asset')} className={`flex-1 py-2 rounded-md text-sm font-bold transition ${type==='asset'?'bg-blue-600 text-white':'text-gray-400 hover:text-white'}`}>Asset</button>
                            </div>
                            <input type="text" placeholder="Receiver UID" onChange={e => setTargetId(e.target.value)} className="w-full bg-slate-900 p-3 rounded-lg text-white border border-slate-700 focus:border-blue-500 outline-none" required />
                            {type === 'asset' && (
                                <select onChange={e => setSelectedCoin(e.target.value)} className="w-full bg-slate-900 p-3 rounded-lg text-white border border-slate-700 focus:border-blue-500 outline-none">
                                    <option value="">Select Coin</option>
                                    {myAssets.map(a => <option key={a.id} value={a.id}>{a.symbol}</option>)}
                                </select>
                            )}
                            <input type="number" placeholder="Amount" onChange={e => setAmount(e.target.value)} className="w-full bg-slate-900 p-3 rounded-lg text-white border border-slate-700 focus:border-blue-500 outline-none" required />
                            <button type="submit" className="w-full bg-blue-600 py-3 rounded-xl font-bold text-white shadow-lg hover:bg-blue-500 transition">Confirm Transfer</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Portfolio;