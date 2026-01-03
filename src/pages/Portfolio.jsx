import React, { useState, useEffect, useRef } from 'react';
import { useCrypto } from '../context/CryptoContext';
import { useNavigate } from 'react-router-dom';
import useHybridPrices from '../hooks/useHybridPrices';
import { AiOutlineHistory, AiOutlineLogout, AiOutlineSetting, AiOutlineCaretDown, AiOutlineClose, AiOutlineSave, AiOutlineLock, AiOutlineQrcode, AiOutlineCheck, AiOutlineUser, AiOutlineSafety, AiOutlineCopy, AiOutlineWarning } from 'react-icons/ai';
import toast from 'react-hot-toast';

const Portfolio = () => {
    const { user, userData, assets, balance, logout, userId, cryptoMasterList, handleTransfer, updateUserName, changePassword, generate2FA, enable2FA, disable2FA, verifyStoredCode } = useCrypto();
    const livePrices = useHybridPrices();
    const navigate = useNavigate();

    const [showDeposit, setShowDeposit] = useState(false);
    const [showWithdraw, setShowWithdraw] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    
    const [showTransfer2FA, setShowTransfer2FA] = useState(false); 
    const [verifyCodeInput, setVerifyCodeInput] = useState("");

    const [showDisable2FAModal, setShowDisable2FAModal] = useState(false);
    const [disableCode, setDisableCode] = useState("");

    const menuRef = useRef(null);
    const [settingsTab, setSettingsTab] = useState('profile');
    const [newName, setNewName] = useState("");
    const [newPass, setNewPass] = useState("");
    
    const [qrCodeUrl, setQrCodeUrl] = useState(null);
    const [tempSecret, setTempSecret] = useState(null);
    const [tempRecoveryKey, setTempRecoveryKey] = useState(null); 
    const [verifyCode, setVerifyCode] = useState("");

    const [targetId, setTargetId] = useState("");
    const [amount, setAmount] = useState("");
    const [type, setType] = useState("cash");
    const [selectedCoin, setSelectedCoin] = useState("");

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowProfileMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (showSettings && userData?.displayName) { setNewName(userData.displayName); }
        if (!showSettings) { 
            setQrCodeUrl(null); 
            setTempSecret(null); 
            setTempRecoveryKey(null);
            setVerifyCode(""); 
            setNewPass(""); 
            setDisableCode("");
        }
    }, [showSettings, userData]);

    let totalInvested = 0;
    const myAssets = (assets || []).map(asset => {
        const meta = cryptoMasterList.find(c => c.id === asset.id) || { name: asset.id, symbol: asset.id.substring(0,3).toUpperCase(), image: "https://placehold.co/32" };
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

    const handleLogout = async () => { try { await logout(); navigate('/login'); } catch (e) {} };
    const copyID = () => { navigator.clipboard.writeText(userId); toast.success("ID Copied"); };

    const handleWithdrawSubmit = async (e) => {
        e.preventDefault();
        if (userData?.is2FAEnabled) {
            setShowWithdraw(false); 
            setShowTransfer2FA(true); 
        } else {
            await executeTransfer();
        }
    };

    const executeTransfer = async () => {
        try {
            await handleTransfer(targetId, amount, type, type === 'asset' ? selectedCoin : null);
            toast.success("Transfer Successful");
            setShowWithdraw(false);
            setShowTransfer2FA(false);
            setVerifyCodeInput("");
        } catch (err) { toast.error(typeof err === 'string' ? err : "Error"); }
    };

    const confirmTransfer2FA = async () => {
        const isValid = await verifyStoredCode(verifyCodeInput);
        if (isValid) {
            await executeTransfer();
        } else {
            toast.error("Invalid 2FA Code");
        }
    };

    const handleConfirmDisable2FA = async () => {
        const success = await disable2FA(disableCode);
        if (success) {
            setShowDisable2FAModal(false);
            setDisableCode("");
        }
    };

    const handleStart2FA = async () => {
        const res = await generate2FA();
        setTempSecret(res.secret);
        setQrCodeUrl(res.imageUrl);
        setTempRecoveryKey(res.recoveryKey); 
    };

    const handleEnable2FA = async () => {
        const ok = await enable2FA(verifyCode, tempSecret, tempRecoveryKey); 
        if(ok) { 
            setQrCodeUrl(null); 
            setVerifyCode(""); 
            setTempRecoveryKey(null);
        }
    };

    const copyRecoveryKey = () => {
        navigator.clipboard.writeText(tempRecoveryKey);
        toast.success("Recovery Key Copied");
    };

    const displayName = userData?.displayName || user?.email?.split('@')[0] || "User";
    const is2FAActive = userData?.is2FAEnabled;

    return (
        <div className="p-4 pb-24 relative max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">Portfolio</h1>
                
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/transactions')} className="bg-slate-800 text-gray-300 p-2.5 rounded-full hover:text-white hover:bg-slate-700 transition border border-slate-700">
                        <AiOutlineHistory size={20} />
                    </button>

                    <div className="relative" ref={menuRef}>
                        <button onClick={() => setShowProfileMenu(!showProfileMenu)} className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full transition border ${showProfileMenu ? 'bg-slate-700 border-blue-500' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-lg uppercase">{displayName[0]}</div>
                            <span className="text-sm font-bold text-white hidden sm:block truncate max-w-[100px]">{displayName}</span>
                            <AiOutlineCaretDown size={10} className={`text-gray-400 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showProfileMenu && (
                            <div className="absolute right-0 top-12 w-64 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                                    <p className="text-white text-sm font-bold truncate">{user?.email}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] text-gray-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 font-mono">UID: {userId.substring(0, 6)}...</span>
                                        <button onClick={copyID} className="text-[10px] text-blue-400 hover:underline">Copy</button>
                                    </div>
                                </div>
                                <div className="p-1.5">
                                    <button onClick={() => { setShowSettings(true); setShowProfileMenu(false); }} className="w-full text-left flex items-center gap-3 p-3 rounded-lg text-gray-300 hover:bg-slate-700 hover:text-white transition group">
                                        <AiOutlineSetting className="group-hover:rotate-90 transition duration-300" /> <span className="text-sm font-medium">Settings</span>
                                    </button>
                                    <div className="h-px bg-slate-700/50 my-1 mx-2"></div>
                                    <button onClick={handleLogout} className="w-full text-left flex items-center gap-3 p-3 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition">
                                        <AiOutlineLogout /> <span className="text-sm font-medium">Logout</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 rounded-2xl shadow-xl mb-8 text-white relative overflow-hidden">
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
                    <div className="mt-6 flex flex-wrap gap-2 text-sm opacity-90 font-medium">
                        <span className="bg-blue-900/40 px-3 py-1 rounded-lg">Cash: ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span className="bg-blue-900/40 px-3 py-1 rounded-lg">Assets: ${totalAssetValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>
                <div className="relative z-10 flex gap-3 mt-6 pt-4 border-t border-white/20">
                    <button onClick={() => setShowDeposit(true)} className="flex-1 bg-white/20 hover:bg-white/30 py-2.5 rounded-xl font-bold text-sm transition">Deposit</button>
                    <button onClick={() => setShowWithdraw(true)} className="flex-1 bg-white/20 hover:bg-white/30 py-2.5 rounded-xl font-bold text-sm transition">Withdraw</button>
                </div>
                <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
            </div>

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

            {showSettings && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-slate-800 w-full max-w-lg rounded-2xl relative border border-slate-700 shadow-2xl animate-in zoom-in duration-200 overflow-hidden flex flex-col md:flex-row h-[500px]">
                        <div className="w-full md:w-40 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-700 p-4 flex md:flex-col gap-2">
                            <h2 className="text-white font-bold mb-4 hidden md:block">Settings</h2>
                            <button onClick={() => setSettingsTab('profile')} className={`flex items-center gap-2 p-2 rounded-lg text-sm font-bold transition ${settingsTab === 'profile' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-slate-800'}`}><AiOutlineUser /> Profile</button>
                            <button onClick={() => setSettingsTab('security')} className={`flex items-center gap-2 p-2 rounded-lg text-sm font-bold transition ${settingsTab === 'security' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-slate-800'}`}><AiOutlineLock /> Security</button>
                        </div>
                        <div className="flex-1 p-6 relative overflow-y-auto">
                            <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><AiOutlineClose size={20} /></button>
                            
                            {settingsTab === 'profile' && (
                                <div className="space-y-6">
                                    <h3 className="text-white font-bold text-lg">Profile Settings</h3>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Display Name</label>
                                        <div className="flex gap-2">
                                            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" placeholder="Your Name" />
                                            <button onClick={() => { updateUserName(newName); toast.success("Name updated"); }} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition"><AiOutlineSave size={20} /></button>
                                        </div>
                                    </div>
                                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700"><p className="text-xs text-gray-500 uppercase font-bold mb-1">Email</p><p className="text-white text-sm">{user?.email}</p></div>
                                </div>
                            )}
                            
                            {settingsTab === 'security' && (
                                <div className="space-y-6">
                                    <h3 className="text-white font-bold text-lg">Security</h3>
                                    <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-700/50">
                                        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><AiOutlineLock /> Change Password</h4>
                                        <div className="flex gap-2">
                                            <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" placeholder="New Password" />
                                            <button onClick={() => { if(newPass.length < 6) toast.error("Too short"); else { changePassword(newPass); setNewPass(""); } }} className="bg-slate-700 hover:bg-white hover:text-black text-white px-4 py-2 rounded-lg text-xs font-bold transition">Update</button>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-700/50">
                                        <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><AiOutlineQrcode /> Two-Factor Authentication</h4>
                                        {is2FAActive ? (
                                            <div className="flex items-center justify-between bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                                                <span className="text-green-400 text-xs font-bold flex items-center gap-1"><AiOutlineCheck /> Active</span>
                                                <button onClick={() => setShowDisable2FAModal(true)} className="text-xs text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 px-3 py-1.5 rounded transition">Disable</button>
                                            </div>
                                        ) : (
                                            <div>
                                                {!qrCodeUrl ? (
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-xs text-gray-400">Secure your account.</p>
                                                        <button onClick={handleStart2FA} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition">Enable</button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4 animate-in fade-in zoom-in duration-200">
                                                        <div className="bg-white p-2 rounded-lg w-fit mx-auto"><img src={qrCodeUrl} alt="2FA QR" className="w-32 h-32" /></div>
                                                        <p className="text-xs text-center text-gray-400">Scan this QR Code</p>
                                                        
                                                        {tempRecoveryKey && (
                                                            <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-lg">
                                                                <p className="text-[10px] text-yellow-500 font-bold uppercase mb-1 flex items-center gap-1"><AiOutlineWarning /> Recovery Key (Save This!)</p>
                                                                <div className="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-700">
                                                                    <code className="text-white text-xs font-mono break-all">{tempRecoveryKey}</code>
                                                                    <button onClick={copyRecoveryKey} className="text-gray-400 hover:text-white ml-2 shrink-0"><AiOutlineCopy /></button>
                                                                </div>
                                                                <p className="text-[10px] text-gray-400 mt-1">If you lose your device, this is the only way to recover access.</p>
                                                            </div>
                                                        )}

                                                        <div className="flex gap-2">
                                                            <input type="text" placeholder="000000" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm text-center tracking-widest outline-none focus:border-blue-500" maxLength={6} />
                                                            <button onClick={handleEnable2FA} className="bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-lg font-bold transition">Verify</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
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
                        <form onSubmit={handleWithdrawSubmit} className="space-y-4">
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

            {showTransfer2FA && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-sm relative border border-slate-700 animate-in zoom-in duration-200 text-center">
                        <button onClick={() => { setShowTransfer2FA(false); setVerifyCodeInput(""); }} className="absolute top-4 right-4 text-gray-400 hover:text-white"><AiOutlineClose size={20} /></button>
                        <div className="w-12 h-12 bg-blue-600/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AiOutlineSafety size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Verify Transfer</h2>
                        <p className="text-gray-400 text-xs mb-6">Enter 2FA code to confirm transaction.</p>
                        <input type="text" placeholder="000000" value={verifyCodeInput} onChange={(e) => setVerifyCodeInput(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white text-center text-xl tracking-widest rounded-xl p-3 mb-6 focus:border-blue-500 outline-none" maxLength={6} />
                        <button onClick={confirmTransfer2FA} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition shadow-lg">Confirm</button>
                    </div>
                </div>
            )}

            {showDisable2FAModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
                    <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-sm relative border border-slate-700 animate-in zoom-in duration-200 text-center">
                        <button onClick={() => { setShowDisable2FAModal(false); setDisableCode(""); }} className="absolute top-4 right-4 text-gray-400 hover:text-white"><AiOutlineClose size={20} /></button>
                        <div className="w-12 h-12 bg-red-600/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AiOutlineWarning size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Disable 2FA?</h2>
                        <p className="text-gray-400 text-xs mb-6">Your account will be less secure. Enter your code to confirm.</p>
                        <input type="text" placeholder="000000" value={disableCode} onChange={(e) => setDisableCode(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white text-center text-xl tracking-widest rounded-xl p-3 mb-6 focus:border-red-500 outline-none" maxLength={6} />
                        <div className="flex gap-2">
                            <button onClick={() => { setShowDisable2FAModal(false); setDisableCode(""); }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition">Cancel</button>
                            <button onClick={handleConfirmDisable2FA} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition shadow-lg">Confirm Disable</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Portfolio;