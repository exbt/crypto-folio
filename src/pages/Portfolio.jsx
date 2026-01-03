import React, { useState, useEffect, useRef } from 'react';
import { useCrypto } from '../context/CryptoContext';
import { useNavigate } from 'react-router-dom';
import useHybridPrices from '../hooks/useHybridPrices';
import { 
    AiOutlineHistory, AiOutlineLogout, AiOutlineSetting, AiOutlineCaretDown, 
    AiOutlineClose, AiOutlineSave, AiOutlineLock, AiOutlineQrcode, 
    AiOutlineCheck, AiOutlineUser, AiOutlineSafety, AiOutlineCopy, 
    AiOutlineWarning, AiOutlineBook, AiOutlinePlus, AiOutlineDelete 
} from 'react-icons/ai';
import toast from 'react-hot-toast';

const Portfolio = () => {
    const { 
        user, userData, assets, balance, logout, userId, cryptoMasterList, 
        handleTransfer, updateUserName, changePassword, 
        generate2FA, enable2FA, disable2FA, verifyStoredCode, 
        contacts, addContact, deleteContact 
    } = useCrypto();
    
    const livePrices = useHybridPrices();
    const navigate = useNavigate();

    const [showDeposit, setShowDeposit] = useState(false);
    const [showWithdraw, setShowWithdraw] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    
    const [showAddressBook, setShowAddressBook] = useState(false);
    const [showAddContact, setShowAddContact] = useState(false);
    
    const [showTransfer2FA, setShowTransfer2FA] = useState(false); 
    const [showDisable2FAModal, setShowDisable2FAModal] = useState(false);
    
    const [verifyCodeInput, setVerifyCodeInput] = useState("");
    const [disableCode, setDisableCode] = useState("");

    const menuRef = useRef(null);
    const [settingsTab, setSettingsTab] = useState('profile');
    const [newName, setNewName] = useState("");
    const [newPass, setNewPass] = useState("");
    
    const [contactName, setContactName] = useState("");
    const [contactUid, setContactUid] = useState("");
    const [contact2FA, setContact2FA] = useState("");

    const [qrCodeUrl, setQrCodeUrl] = useState(null);
    const [tempSecret, setTempSecret] = useState(null);
    const [tempRecoveryKey, setTempRecoveryKey] = useState(null); 
    const [verifyCode, setVerifyCode] = useState("");

    const [targetId, setTargetId] = useState("");
    const [amount, setAmount] = useState("");
    const [type, setType] = useState("cash");
    const [selectedCoin, setSelectedCoin] = useState("");

    useEffect(() => {
        if (showDeposit || showWithdraw || showSettings || showTransfer2FA || showDisable2FAModal || showAddressBook || showAddContact) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; }
    }, [showDeposit, showWithdraw, showSettings, showTransfer2FA, showDisable2FAModal, showAddressBook, showAddContact]);

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

    const getMaxBalance = () => {
        if (type === 'cash') {
            return balance;
        } else {
            if (!selectedCoin) return 0;
            const asset = assets.find(a => a.id === selectedCoin);
            return asset ? asset.amount : 0;
        }
    };

    const maxBalance = getMaxBalance();

    const handleAmountChange = (e) => {
        let val = e.target.value;
        
        if (val === '' || parseFloat(val) < 0) {
            setAmount(val);
            return;
        }

        const numVal = parseFloat(val);
        if (numVal > maxBalance) {
            setAmount(maxBalance);
            toast.error(`Max available: ${maxBalance.toFixed(4)}`);
        } else {
            setAmount(val);
        }
    };

    const handleWithdrawSubmit = async (e) => {
        e.preventDefault();
        if (parseFloat(amount) > maxBalance) {
            toast.error("Insufficient balance");
            return;
        }

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
            setAmount(""); 
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

    const handleAddContactClick = () => {
        if (!userData.is2FAEnabled) {
            toast.error("Enable 2FA to add contacts!");
            setShowAddressBook(false);
            setShowWithdraw(false);
            setShowSettings(true);
            setSettingsTab('security');
        } else {
            setShowAddContact(true);
        }
    };

    const handleSaveContact = async () => {
        if (!contactName || !contactUid || !contact2FA) {
            toast.error("All fields required");
            return;
        }
        const success = await addContact(contactName, contactUid, contact2FA);
        if (success) {
            setContactName(""); setContactUid(""); setContact2FA("");
            setShowAddContact(false);
        }
    };

    const selectContact = (uid) => {
        setTargetId(uid);
        setShowAddressBook(false);
    };

    const handleConfirmDisable2FA = async () => {
        const success = await disable2FA(disableCode);
        if (success) { setShowDisable2FAModal(false); setDisableCode(""); }
    };

    const handleStart2FA = async () => {
        const res = await generate2FA();
        setTempSecret(res.secret); setQrCodeUrl(res.imageUrl); setTempRecoveryKey(res.recoveryKey); 
    };

    const handleEnable2FA = async () => {
        const ok = await enable2FA(verifyCode, tempSecret, tempRecoveryKey); 
        if(ok) { setQrCodeUrl(null); setVerifyCode(""); setTempRecoveryKey(null); }
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
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[50] p-4 backdrop-blur-sm">
                    <div className="bg-slate-800 w-full max-w-3xl rounded-2xl relative border border-slate-700 shadow-2xl animate-in zoom-in duration-200 overflow-hidden flex flex-col md:flex-row h-[600px] md:h-[500px]">
                        <div className="w-full md:w-60 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-700 p-6 flex md:flex-col gap-2 shrink-0">
                            <h2 className="text-white font-bold text-xl mb-4 hidden md:block">Settings</h2>
                            <button onClick={() => setSettingsTab('profile')} className={`flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition ${settingsTab === 'profile' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-slate-800'}`}><AiOutlineUser size={18} /> Profile</button>
                            <button onClick={() => setSettingsTab('security')} className={`flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition ${settingsTab === 'security' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-slate-800'}`}><AiOutlineLock size={18} /> Security</button>
                        </div>
                        
                        <div className="flex-1 p-8 relative overflow-y-auto bg-slate-800">
                            <button onClick={() => setShowSettings(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white bg-slate-900/50 p-2 rounded-full transition"><AiOutlineClose size={20} /></button>
                            
                            {settingsTab === 'profile' && (
                                <div className="space-y-8 max-w-md mx-auto md:mx-0">
                                    <h3 className="text-white font-bold text-2xl">Profile Settings</h3>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Display Name</label>
                                        <div className="flex gap-3">
                                            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition" placeholder="Your Name" />
                                            <button onClick={() => { updateUserName(newName); toast.success("Name updated"); }} className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transition shadow-lg"><AiOutlineSave size={20} /></button>
                                        </div>
                                    </div>
                                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Email Address</p>
                                        <p className="text-white font-mono">{user?.email}</p>
                                    </div>
                                </div>
                            )}
                            
                            {settingsTab === 'security' && (
                                <div className="space-y-8 max-w-md mx-auto md:mx-0">
                                    <h3 className="text-white font-bold text-2xl">Security</h3>
                                    
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-gray-300 flex items-center gap-2">Change Password</h4>
                                        <div className="flex gap-3">
                                            <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition" placeholder="New Password" />
                                            <button onClick={() => { if(newPass.length < 6) toast.error("Too short"); else { changePassword(newPass); setNewPass(""); } }} className="bg-slate-700 hover:bg-white hover:text-black text-white px-5 py-3 rounded-xl text-sm font-bold transition">Update</button>
                                        </div>
                                    </div>
                                    
                                    <hr className="border-slate-700" />

                                    <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-700/50">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="text-white font-bold flex items-center gap-2 text-lg"><AiOutlineQrcode className="text-blue-500"/> Two-Factor Authentication</h4>
                                                <p className="text-gray-400 text-xs mt-1">Secure your account with Google Authenticator.</p>
                                            </div>
                                            {is2FAActive && (
                                                <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-500/20 flex items-center gap-1">
                                                    <AiOutlineCheck /> Active
                                                </span>
                                            )}
                                        </div>

                                        {is2FAActive ? (
                                            <button onClick={() => setShowDisable2FAModal(true)} className="w-full bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white font-bold py-3 rounded-xl border border-red-500/30 transition">
                                                Disable 2FA
                                            </button>
                                        ) : (
                                            !qrCodeUrl ? (
                                                <button onClick={handleStart2FA} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg transition">
                                                    Enable 2FA
                                                </button>
                                            ) : (
                                                <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                                                    <div className="flex flex-col items-center p-4 bg-white rounded-xl w-fit mx-auto">
                                                        <img src={qrCodeUrl} alt="2FA QR" className="w-40 h-40" />
                                                    </div>
                                                    
                                                    {tempRecoveryKey && (
                                                        <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <p className="text-xs text-yellow-500 font-bold uppercase flex items-center gap-1"><AiOutlineWarning /> Recovery Key</p>
                                                                <button onClick={copyRecoveryKey} className="text-yellow-500 hover:text-white transition"><AiOutlineCopy /></button>
                                                            </div>
                                                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                                                                <code className="text-white text-xs font-mono break-all tracking-wider">{tempRecoveryKey}</code>
                                                            </div>
                                                            <p className="text-[10px] text-gray-400 mt-2 text-center">Save this key safely! It's your only way to recover access.</p>
                                                        </div>
                                                    )}

                                                    <div className="flex gap-3">
                                                        <input type="text" placeholder="000000" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 text-center text-lg tracking-[0.5em] font-mono outline-none focus:border-blue-500" maxLength={6} />
                                                        <button onClick={handleEnable2FA} className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg">Verify</button>
                                                    </div>
                                                </div>
                                            )
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
                                <button type="button" onClick={() => { setType('cash'); setAmount(""); }} className={`flex-1 py-2 rounded-md text-sm font-bold transition ${type==='cash'?'bg-blue-600 text-white':'text-gray-400 hover:text-white'}`}>Cash</button>
                                <button type="button" onClick={() => { setType('asset'); setAmount(""); }} className={`flex-1 py-2 rounded-md text-sm font-bold transition ${type==='asset'?'bg-blue-600 text-white':'text-gray-400 hover:text-white'}`}>Asset</button>
                            </div>
                            
                            <div className="flex gap-2">
                                <input type="text" placeholder="Receiver UID" value={targetId} onChange={e => setTargetId(e.target.value)} className="flex-1 bg-slate-900 p-3 rounded-lg text-white border border-slate-700 focus:border-blue-500 outline-none" required />
                                <button type="button" onClick={() => setShowAddressBook(true)} className="bg-slate-700 hover:bg-slate-600 text-white p-3 rounded-lg border border-slate-600 transition" title="Address Book">
                                    <AiOutlineBook size={20} />
                                </button>
                            </div>

                            {type === 'asset' && (
                                <select onChange={e => { setSelectedCoin(e.target.value); setAmount(""); }} className="w-full bg-slate-900 p-3 rounded-lg text-white border border-slate-700 focus:border-blue-500 outline-none">
                                    <option value="">Select Coin</option>
                                    {myAssets.map(a => <option key={a.id} value={a.id}>{a.symbol}</option>)}
                                </select>
                            )}

                            <div>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        placeholder="Amount" 
                                        value={amount} 
                                        onChange={handleAmountChange} 
                                        className="w-full bg-slate-900 p-3 rounded-lg text-white border border-slate-700 focus:border-blue-500 outline-none pr-16" 
                                        required 
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setAmount(maxBalance)} 
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-500 px-2 py-1 rounded transition"
                                    >
                                        MAX
                                    </button>
                                </div>
                                <div className="text-right mt-1">
                                    <span className="text-[10px] text-gray-400 font-mono">
                                        Available: <span className="text-white">{maxBalance.toLocaleString()} {type === 'cash' ? 'USD' : (selectedCoin ? selectedCoin.toUpperCase() : '')}</span>
                                    </span>
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-blue-600 py-3 rounded-xl font-bold text-white shadow-lg hover:bg-blue-500 transition">Confirm Transfer</button>
                        </form>
                    </div>
                </div>
            )}

            {showAddressBook && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[55] p-4 backdrop-blur-sm">
                    <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-sm relative border border-slate-700 animate-in zoom-in duration-200 flex flex-col max-h-[500px]">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2"><AiOutlineBook /> Contacts</h2>
                            <button onClick={() => setShowAddressBook(false)} className="text-gray-400 hover:text-white"><AiOutlineClose size={20} /></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {contacts.length === 0 ? (
                                <p className="text-gray-500 text-center py-8 text-sm">No contacts saved.</p>
                            ) : (
                                contacts.map((c, idx) => (
                                    <div key={idx} className="bg-slate-900 p-3 rounded-xl border border-slate-700 flex justify-between items-center group hover:border-blue-500 transition cursor-pointer" onClick={() => selectContact(c.uid)}>
                                        <div>
                                            <p className="text-white font-bold text-sm">{c.name}</p>
                                            <p className="text-gray-500 text-[10px] font-mono">{c.uid.substring(0, 12)}...</p>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); deleteContact(c); }} className="text-gray-600 hover:text-red-400 p-2"><AiOutlineDelete /></button>
                                    </div>
                                ))
                            )}
                        </div>

                        <button onClick={handleAddContactClick} className="w-full mt-4 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl border border-slate-600 flex items-center justify-center gap-2 transition">
                            <AiOutlinePlus /> Add New Contact
                        </button>
                    </div>
                </div>
            )}

            {showAddContact && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
                    <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-sm relative border border-slate-700 animate-in zoom-in duration-200">
                        <button onClick={() => setShowAddContact(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><AiOutlineClose size={20} /></button>
                        <h2 className="text-xl font-bold text-white mb-4">New Contact</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 font-bold ml-1">Name</label>
                                <input type="text" placeholder="Friend's Name" value={contactName} onChange={e => setContactName(e.target.value)} className="w-full bg-slate-900 p-3 rounded-lg text-white border border-slate-700 focus:border-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 font-bold ml-1">UID</label>
                                <input type="text" placeholder="User ID" value={contactUid} onChange={e => setContactUid(e.target.value)} className="w-full bg-slate-900 p-3 rounded-lg text-white border border-slate-700 focus:border-blue-500 outline-none" />
                            </div>
                            <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-500/30">
                                <label className="text-[10px] text-blue-300 font-bold ml-1 flex items-center gap-1"><AiOutlineSafety /> 2FA Verification Required</label>
                                <input type="text" placeholder="000000" maxLength={6} value={contact2FA} onChange={e => setContact2FA(e.target.value)} className="w-full bg-slate-950 p-3 rounded-lg text-white text-center tracking-widest font-mono border border-slate-700 focus:border-blue-500 outline-none mt-1" />
                            </div>
                            
                            <button onClick={handleSaveContact} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg transition">Save Contact</button>
                        </div>
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