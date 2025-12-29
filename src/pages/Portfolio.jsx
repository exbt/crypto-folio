import React, { useEffect, useState } from 'react';
import { useCrypto } from '../context/CryptoContext';
import { Link, useNavigate } from 'react-router-dom';
import { AiOutlineLogout, AiOutlineHistory, AiOutlineSwap, AiOutlineClose, AiOutlineCopy, AiOutlineFilter, AiOutlineInfoCircle } from 'react-icons/ai';
import toast from 'react-hot-toast';
import useHybridPrices from '../hooks/useHybridPrices';

const Portfolio = () => {
   
  const ID_TO_TICKER = {
        
        'crypto-com-chain': 'CRO', 
        'kaspa': 'KAS',
        'toncoin': 'TON'
        
    };
    const { assets, balance, logout, setAssets, setBalance, userId, handleTransfer, updateUserPortfolio, transactions } = useCrypto();
    const livePrices = useHybridPrices();
    
    
    const [coinMetaData, setCoinMetaData] = useState({});
    
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const navigate = useNavigate();

    
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
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
        const fetchMetaData = async () => {
            if (!assets || assets.length === 0) return;

            
            const ids = assets.map(a => a.id).join(',');

            try {
                
                const response = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false`);
                
                if (response.ok) {
                    const data = await response.json();
                    const metaMap = {};
                    data.forEach(coin => {
                        metaMap[coin.id] = {
                            name: coin.name,           
                            symbol: coin.symbol.toUpperCase(), 
                            image: coin.image          
                        };
                    });
                    setCoinMetaData(metaMap);
                }
            } catch (error) {
                console.warn("CoinGecko API ulaşılamadı, yedek resim kaynakları kullanılacak.");
            }
        };

        fetchMetaData();
    }, [assets]); 

    
    const getCoinDetails = (id) => {
        
        if (coinMetaData[id]) {
            return {
                ticker: coinMetaData[id].symbol,
                name: coinMetaData[id].name,
                image: coinMetaData[id].image 
            };
        }

        
        const ticker = (ID_TO_TICKER[id.toLowerCase()] || id).toUpperCase();
        const name = id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' ');
        
        
        const image = `https://cryptologos.cc/logos/${id.toLowerCase()}-${ticker.toLowerCase()}-logo.png?v=040`;

        return { ticker, name, image };
    };

    
    const handleImageError = (e) => {
        const imgElement = e.target;
        const currentSrc = imgElement.src;
        const ticker = imgElement.getAttribute('data-ticker') || 'BTC';
        const lowerTicker = ticker.toLowerCase();

        
        if (currentSrc.includes("coingecko.com")) {
            imgElement.src = `https://assets.coincap.io/assets/icons/${lowerTicker}@2x.png`; 
            return;
        }

        
        if (currentSrc.includes("cryptologos.cc")) {
            imgElement.src = `https://assets.coincap.io/assets/icons/${lowerTicker}@2x.png`;
            return;
        }

        
        if (currentSrc.includes("coincap.io")) {
            imgElement.src = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${ticker.toUpperCase()}/logo.png`;
            return;
        }

        
        if (currentSrc.includes("trustwallet")) {
            imgElement.src = `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${lowerTicker}.png`;
            return;
        }

        
        if (currentSrc.includes("spothq") && !currentSrc.includes("placehold.co")) {
            imgElement.src = "https://placehold.co/32x32/1e293b/ffffff?text=?";
        }
    };

    const handleLogout = async () => { try { await logout(); navigate('/login'); } catch (error) { } };
    const toggleExpand = (id) => { setExpandedId(expandedId === id ? null : id); };

    
    let totalInvested = 0;

    const myAssets = (assets || []).map(asset => {
        const { ticker, name, image } = getCoinDetails(asset.id);
        
        const priceKey = ticker.toLowerCase(); 
        const liveData = livePrices[priceKey]; 

        const currentPrice = liveData ? liveData.price : 0;
        const change24hPercent = liveData ? liveData.change : 0;

        const totalValue = asset.amount * currentPrice;
        const avgPrice = asset.avgPrice || currentPrice; 
        const costBasis = asset.amount * avgPrice;
        totalInvested += costBasis;

        const profitLossValue = totalValue - costBasis;
        const profitLossPercent = costBasis > 0 ? (profitLossValue / costBasis) * 100 : 0;

        return {
            ...asset,
            ticker, name, image,
            displayName: name, 
            current_price: currentPrice,
            total_value: totalValue,
            change24hPercent,
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
                <div className="font-bold text-sm">Total <span className="text-green-400">${totalDustValue.toFixed(4)}</span> will be cashed out for {dustAssets.length} assets.</div>
                <div className="flex gap-2">
                    <button onClick={async () => {
                            toast.dismiss(t.id);
                            const remainingAssets = assets.filter(asset => !dustAssets.some(d => d.id === asset.id));
                            const newBalance = balance + totalDustValue;
                            setAssets(remainingAssets);
                            setBalance(newBalance);
                            if (updateUserPortfolio) await updateUserPortfolio(remainingAssets, newBalance, totalDustValue);
                            toast.success("Conversion successful!");
                        }} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs font-bold transition">Yes</button>
                    <button onClick={() => toast.dismiss(t.id)} className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1 rounded text-xs font-bold transition">Cancel</button>
                </div>
            </div>
        ), { duration: 8000, style: { background: '#1e293b', color: '#fff', border: '1px solid #475569' } });
    };

    const onWithdrawSubmit = async (e) => { 
        e.preventDefault();
        const loadingToast = toast.loading("Transferring...");
        try {
            await handleTransfer(targetId, transferAmount, transferType, transferType === 'asset' ? selectedCoinToTransfer : null);
            toast.dismiss(loadingToast);
            toast.success(`Success! Sent $${transferAmount} to ${targetId}.`);
            setShowWithdrawModal(false); setTargetId(""); setTransferAmount(""); setTransferType("cash");
        } catch (error) {
            toast.dismiss(loadingToast);
            toast.error(error.message.replace("Error:", ""));
        }
    };

    const copyToClipboard = () => { navigator.clipboard.writeText(userId); toast.success("ID copied"); };
    const hasDust = myAssets.some(asset => asset.total_value > 0 && asset.total_value < DUST_LIMIT);
    const formatDate = (timestamp) => timestamp ? new Date(timestamp.seconds * 1000).toLocaleString() : "";

    return (
        <div className="p-4 pb-24 relative">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">My Portfolio</h1>
                <div className="flex gap-2">
                    <button onClick={() => setShowHistoryModal(true)} className="bg-slate-800 text-gray-300 p-2 rounded-lg hover:bg-slate-700 hover:text-white transition"><AiOutlineHistory size={20} /></button>
                    <button onClick={handleLogout} className="bg-red-500/20 text-red-400 p-2 rounded-lg hover:bg-red-500 hover:text-white transition flex items-center gap-2 text-sm font-bold"><AiOutlineLogout /> Logout</button>
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
                        <p className="text-xl font-bold">{totalWalletPnlValue >= 0 ? '+' : ''}${Math.abs(totalWalletPnlValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p className="text-xs font-medium bg-black/20 px-2 py-0.5 rounded inline-block">{totalWalletPnlValue >= 0 ? '▲' : '▼'} {Math.abs(totalWalletPnlPercent).toFixed(2)}%</p>
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
                                        <img 
                                            src={asset.image} 
                                            alt={asset.displayName}                               
                                            data-ticker={asset.ticker} 
                                            className="w-10 h-10 rounded-full shadow-md bg-slate-700 object-cover" 
                                            onError={handleImageError} 
                                            loading="lazy"
                                        />
                                        <div>
                                            <h3 className="font-bold text-white capitalize">{asset.displayName}</h3>
                                            <p className="text-xs text-gray-400 font-medium uppercase">{asset.ticker}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white font-bold">${asset.total_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        <div className={`text-xs font-bold flex items-center justify-end gap-1 ${asset.pnlValue >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            <span>{asset.pnlValue >= 0 ? '+' : ''}{asset.pnlPercent.toFixed(2)}%</span>
                                            <span className="opacity-60">(${asset.pnlValue.toFixed(2)})</span>
                                        </div>
                                        <p className="text-[10px] text-gray-500 mt-0.5 font-mono">{asset.amount.toFixed(4)} {asset.ticker}</p>
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
                                <div><p className="text-yellow-500 font-bold text-sm">Dust Balance Found</p><p className="text-xs text-gray-400">Convert small balances (under ${DUST_LIMIT}) to cash.</p></div>
                                <button onClick={handleConvertDust} className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition"><AiOutlineSwap /> Convert</button>
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
                                    <button key={type} onClick={() => setFilterType(type)} className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize whitespace-nowrap transition ${filterType === type ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}>{type === 'all' ? 'All' : type}</button>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 space-y-3 min-h-[300px]">
                            {filteredTransactions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50"><AiOutlineFilter size={40} className="mb-2"/><p>No transactions found.</p></div>
                            ) : (
                                filteredTransactions.map((tx) => (
                                    <div key={tx.id} onClick={() => setSelectedTransaction(tx)} className="bg-slate-800 p-3 rounded-xl border border-slate-700 flex justify-between items-center hover:border-blue-500 cursor-pointer transition group">
                                         <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-inner font-bold ${tx.type === 'buy' || tx.type === 'send' ? 'bg-red-500/10 text-red-500' : tx.type === 'sell' || tx.type === 'receive' || tx.type === 'dust' ? 'bg-green-500/10 text-green-500' : 'bg-gray-700 text-white'}`}>
                                                {tx.type === 'buy' ? '↓' : tx.type === 'sell' ? '↑' : tx.type === 'send' ? '→' : tx.type === 'receive' ? '←' : '♻️'}
                                            </div>
                                            <div>
                                                <p className="text-white font-bold text-sm capitalize flex items-center gap-1">
                                                    {tx.type} <span className="text-xs px-1.5 py-0.5 bg-slate-700 rounded text-gray-300 font-mono">{tx.coinId ? ((coinMetaData[tx.coinId] && coinMetaData[tx.coinId].symbol) || (ID_TO_TICKER[tx.coinId] || tx.coinId).toUpperCase()) : 'USD'}</span>
                                                </p>
                                                <p className="text-[10px] text-gray-400 truncate max-w-[150px]">{tx.description}</p>
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
            
            {selectedTransaction && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 backdrop-blur-md animate-fade-in">
                    <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-sm border border-slate-600 shadow-2xl relative">
                        <button onClick={() => setSelectedTransaction(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><AiOutlineClose size={24} /></button>
                        <h3 className="text-lg font-bold text-white mb-6 border-b border-slate-700 pb-2">Transaction Details</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center"><span className="text-gray-400 text-sm">Type</span><span className="text-white font-bold capitalize bg-slate-700 px-2 py-1 rounded text-xs">{selectedTransaction.type}</span></div>
                            <div className="flex justify-between items-center"><span className="text-gray-400 text-sm">Asset</span><span className="text-white font-mono">{selectedTransaction.coinId ? ((coinMetaData[selectedTransaction.coinId] && coinMetaData[selectedTransaction.coinId].symbol) || (ID_TO_TICKER[selectedTransaction.coinId] || selectedTransaction.coinId).toUpperCase()) : 'Cash (USD)'}</span></div>
                            <div className="flex justify-between items-center"><span className="text-gray-400 text-sm">Amount</span><span className={`font-bold ${selectedTransaction.type === 'buy' || selectedTransaction.type === 'send' ? 'text-red-400' : 'text-green-400'}`}>{selectedTransaction.amount}</span></div>
                            {selectedTransaction.executionPrice > 0 && (<div className="flex justify-between items-center"><span className="text-gray-400 text-sm">Price per Unit</span><span className="text-blue-300 font-mono">${selectedTransaction.executionPrice.toLocaleString()}</span></div>)}
                            {selectedTransaction.totalValue > 0 && (<div className="flex justify-between items-center"><span className="text-gray-400 text-sm">Total Value</span><span className="text-white font-bold">${selectedTransaction.totalValue.toLocaleString()}</span></div>)}
                            <div className="pt-4 border-t border-slate-700 mt-2"><p className="text-gray-500 text-xs uppercase font-bold mb-1">Description</p><p className="text-gray-300 text-sm bg-slate-900 p-3 rounded-lg border border-slate-700">{selectedTransaction.description}</p></div>
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
                                        {myAssets.map(a => <option key={a.id} value={a.id}>{a.ticker} ({a.amount})</option>)}
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