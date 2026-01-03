import React, { createContext, useState, useContext, useEffect } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, updatePassword } from "firebase/auth";
import { doc, setDoc, updateDoc, onSnapshot, collection, addDoc, query, orderBy, serverTimestamp, runTransaction, getDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import toast from 'react-hot-toast';
import { getMarketData } from '../services/api';
import QRCode from 'qrcode';

const CryptoContext = createContext();

export const CryptoProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [balance, setBalance] = useState(0);
    const [assets, setAssets] = useState([]);
    const [watchlist, setWatchlist] = useState([]); 
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState("");

    const [is2FAVerifiedSession, setIs2FAVerifiedSession] = useState(false);

    const [cryptoMasterList, setCryptoMasterList] = useState([]);
    const [isMasterLoading, setIsMasterLoading] = useState(true);

    useEffect(() => {
        const loadMasterData = async () => {
            const cachedData = localStorage.getItem("cryptoMasterList");
            const cachedTime = localStorage.getItem("cryptoMasterListTime");
            const ONE_DAY = 24 * 60 * 60 * 1000;
            const now = Date.now();

            if (cachedData && cachedTime && (now - cachedTime < ONE_DAY)) {
                setCryptoMasterList(JSON.parse(cachedData));
                setIsMasterLoading(false);
            } else {
                try {
                    const data = await getMarketData();
                    if (data.length > 0) {
                        setCryptoMasterList(data);
                        localStorage.setItem("cryptoMasterList", JSON.stringify(data));
                        localStorage.setItem("cryptoMasterListTime", now.toString());
                    }
                } catch (error) {
                    console.error("Data error:", error);
                } finally {
                    setIsMasterLoading(false);
                }
            }
        };
        loadMasterData();
    }, []);


    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
            if (currentUser) {
                setUserId(currentUser.uid);
                const userRef = doc(db, "users", currentUser.uid);

                const unsubscribeSnapshot = onSnapshot(userRef, (d) => {
                    if (d.exists()) {
                        const data = d.data();
                        setUserData(data);
                        setBalance(data.balance);
                        setAssets(data.assets || []);
                        setWatchlist(data.watchlist || []); 
                        
                        if (data.is2FAEnabled === false) {
                            setIs2FAVerifiedSession(true);
                        }
                    }
                });
                
                const q = query(collection(db, "users", currentUser.uid, "transactions"), orderBy("date", "desc"));
                const unsubscribeHistory = onSnapshot(q, (s) => setTransactions(s.docs.map(d => ({ id: d.id, ...d.data() }))));
                
                return () => { unsubscribeSnapshot(); unsubscribeHistory(); };
            } else {

                setBalance(0); 
                setAssets([]); 
                setWatchlist([]); 
                setTransactions([]); 
                setUserId(""); 
                setUserData(null); 
                setIs2FAVerifiedSession(false);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    const signUp = async (email, password) => { 
        const r = await createUserWithEmailAndPassword(auth, email, password); 
        const defaultName = email.split('@')[0];
        await setDoc(doc(db, "users", r.user.uid), { 
            uid: r.user.uid, 
            balance: 10000, 
            assets: [],
            watchlist: [], 
            email,
            displayName: defaultName,
            is2FAEnabled: false 
        }); 
        return r.user; 
    };

    const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
    const logout = () => signOut(auth);
    
    const updateUserName = async (newName) => {
        if (!user) return;
        await updateDoc(doc(db, "users", user.uid), { displayName: newName });
        toast.success("Profile updated");
    };

    const changePassword = async (newPassword) => {
        if (!user) return;
        try {
            await updatePassword(user, newPassword);
            toast.success("Password updated successfully");
        } catch (error) {
            console.error(error);
            toast.error("Error: Please re-login and try again.");
        }
    };

    const logTransactionInternal = async (uid, type, desc, amount, coinId, exPrice, totalVal, targetId = null) => { 
        await addDoc(collection(db, "users", uid, "transactions"), { 
            type, 
            description: desc, 
            amount: parseFloat(amount), 
            coinId: coinId || 'USD', 
            executionPrice: parseFloat(exPrice), 
            totalValue: parseFloat(totalVal), 
            targetId: targetId, 
            date: serverTimestamp() 
        }); 
    };

    const toggleWatchlist = async (coinId) => {
        if (!user) return;
        const userRef = doc(db, "users", user.uid);
        
        if (watchlist.includes(coinId)) {
            await updateDoc(userRef, { watchlist: arrayRemove(coinId) });
            toast.success("Removed from Watchlist");
        } else {
            await updateDoc(userRef, { watchlist: arrayUnion(coinId) });
            toast.success("Added to Watchlist");
        }
    };
    
    const generateBase32Secret = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let secret = '';
        const array = new Uint8Array(20);
        window.crypto.getRandomValues(array);
        for (let i = 0; i < array.length; i++) { secret += chars[array[i] % 32]; }
        return secret;
    };

    const generateRecoveryKey = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
        let key = '';
        const array = new Uint8Array(32); 
        window.crypto.getRandomValues(array);
        for (let i = 0; i < array.length; i++) { key += chars[array[i] % chars.length]; }
        return key;
    };

    const base32ToUint8Array = (str) => {
        const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let bits = 0, value = 0, index = 0;
        const output = new Uint8Array((str.length * 5) / 8);
        for (let i = 0; i < str.length; i++) {
            value = (value << 5) | base32chars.indexOf(str[i].toUpperCase());
            bits += 5;
            if (bits >= 8) { output[index++] = (value >>> (bits - 8)) & 0xff; bits -= 8; }
        }
        return output;
    };

    const verifyTOTP = async (token, secret) => {
        try {
            const keyBytes = base32ToUint8Array(secret);
            const key = await window.crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
            const epoch = Math.floor(Date.now() / 1000.0);
            const currentCounter = Math.floor(epoch / 30);
            
            for (let i = -1; i <= 1; i++) {
                const counter = currentCounter + i;
                const counterBuffer = new ArrayBuffer(8);
                const view = new DataView(counterBuffer);
                view.setUint32(0, 0, false);
                view.setUint32(4, counter, false);
                const signature = await window.crypto.subtle.sign("HMAC", key, counterBuffer);
                const sigBytes = new Uint8Array(signature);
                const offset = sigBytes[sigBytes.length - 1] & 0xf;
                const binary = ((sigBytes[offset] & 0x7f) << 24) | ((sigBytes[offset + 1] & 0xff) << 16) | ((sigBytes[offset + 2] & 0xff) << 8) | (sigBytes[offset + 3] & 0xff);
                const otp = (binary % 1000000).toString().padStart(6, '0');
                if (otp === token) return true;
            }
            return false;
        } catch (e) { console.error("TOTP Error:", e); return false; }
    };

    
    const generate2FA = async () => {
        if (!user) return;
        const secret = generateBase32Secret();
        const recoveryKey = generateRecoveryKey(); 
        
        const label = `crypto-folio:${user.email}`;
        const otpauth = `otpauth://totp/${label}?secret=${secret}&issuer=crypto-folio`;
        const imageUrl = await QRCode.toDataURL(otpauth); 
        
        return { secret, imageUrl, recoveryKey };
    };

    const enable2FA = async (token, secret, recoveryKey) => {
        if (!user) return;
        const cleanToken = token.replace(/\s/g, ''); 
        const isValid = await verifyTOTP(cleanToken, secret);
        if (isValid) {
            await updateDoc(doc(db, "users", user.uid), { 
                twoFactorSecret: secret, 
                recoveryKey: recoveryKey, 
                is2FAEnabled: true 
            });
            setIs2FAVerifiedSession(true);
            toast.success("2FA Enabled Successfully");
            return true;
        } else {
            toast.error("Invalid Code");
            return false;
        }
    };

    const disable2FA = async (token) => {
        if (!user || !userData?.twoFactorSecret) return false;
        const cleanToken = token.replace(/\s/g, ''); 
        const isValid = await verifyTOTP(cleanToken, userData.twoFactorSecret);

        if (isValid) {
            await updateDoc(doc(db, "users", user.uid), { 
                twoFactorSecret: null, 
                recoveryKey: null,
                is2FAEnabled: false 
            });
            setIs2FAVerifiedSession(true); 
            toast.success("2FA Disabled");
            return true;
        } else {
            toast.error("Invalid Code");
            return false;
        }
    };

    const reset2FAWithRecovery = async (uid, inputKey) => {
        try {
            const docRef = doc(db, "users", uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.recoveryKey === inputKey) {
                    await updateDoc(docRef, { twoFactorSecret: null, recoveryKey: null, is2FAEnabled: false });
                    toast.success("Recovery Successful. 2FA Disabled.");
                    return true;
                }
            }
            toast.error("Invalid Recovery Key");
            return false;
        } catch (e) { console.error("Recovery Error:", e); toast.error("System Error"); return false; }
    };
    
    const checkUser2FAStatus = async (uid) => {
        try {
            const docSnap = await getDoc(doc(db, "users", uid));
            if (docSnap.exists()) { return docSnap.data().is2FAEnabled || false; }
            return false;
        } catch (e) { return false; }
    };

    const verifyLogin2FA = async (uid, token) => {
        try {
            const docSnap = await getDoc(doc(db, "users", uid));
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.is2FAEnabled && data.twoFactorSecret) {
                    const cleanToken = token.replace(/\s/g, '');
                    return await verifyTOTP(cleanToken, data.twoFactorSecret);
                }
            }
            return true;
        } catch (e) { return false; }
    };
    
    const verifyStoredCode = async (token) => {
        if (!userData || !userData.is2FAEnabled || !userData.twoFactorSecret) return true;
        const cleanToken = token.replace(/\s/g, '');
        return await verifyTOTP(cleanToken, userData.twoFactorSecret);
    };

    const confirmSession = () => {
        setIs2FAVerifiedSession(true);
    };

    const buyCoin = async (coinId, amount, price) => {
        if (!user) return;
        const total = amount * price;
        if (total > balance) { toast.error("Insufficient balance"); return; }
        const newBalance = balance - total;
        let newAssets = [...assets];
        const idx = newAssets.findIndex(a => a.id === coinId);
        if (idx >= 0) {
            const current = newAssets[idx];
            const currentCost = current.amount * (current.avgPrice || current.current_price || price);
            const newTotal = current.amount + parseFloat(amount);
            const newAvg = (currentCost + total) / newTotal;
            newAssets[idx] = { ...current, amount: newTotal, avgPrice: newAvg };
        } else {
            newAssets.push({ id: coinId, amount: parseFloat(amount), avgPrice: price });
        }
        await updateDoc(doc(db, "users", user.uid), { balance: newBalance, assets: newAssets });
        await logTransactionInternal(user.uid, 'buy', `Bought ${coinId}`, amount, coinId, price, total);
        toast.success("Buy order executed successfully");
    };

    const sellCoin = async (coinId, amount, price) => {
        if (!user) return;
        const asset = assets.find(a => a.id === coinId);
        if (!asset || asset.amount < parseFloat(amount)) { toast.error("Insufficient assets"); return; }
        const earnings = amount * price;
        const newBalance = balance + earnings;
        let newAssets = assets.map(item => item.id === coinId ? { ...item, amount: item.amount - parseFloat(amount) } : item).filter(i => i.amount > 0.00000001);
        await updateDoc(doc(db, "users", user.uid), { balance: newBalance, assets: newAssets });
        await logTransactionInternal(user.uid, 'sell', `Sold ${coinId}`, amount, coinId, price, earnings);
        toast.success("Sell order executed successfully");
    };

    const handleTransfer = async (targetId, amount, type = 'cash', coinId = null) => { 
        const val = parseFloat(amount);
        if (val <= 0) throw new Error("Invalid amount");
        const senderRef = doc(db, "users", user.uid);
        const receiverRef = doc(db, "users", targetId);
        
        await runTransaction(db, async (t) => {
            const rDoc = await t.get(receiverRef);
            if (!rDoc.exists()) throw "Receiver not found";
            const sDoc = await t.get(senderRef);
            const sData = sDoc.data();
            const rData = rDoc.data();

            if (type === 'cash') {
                if (sData.balance < val) throw "Insufficient balance";
                t.update(senderRef, { balance: sData.balance - val });
                t.update(receiverRef, { balance: (rData.balance || 0) + val });
            } else {
                const sAssets = sData.assets || [];
                const idx = sAssets.findIndex(a => a.id === coinId);
                if (idx === -1 || sAssets[idx].amount < val) throw "Insufficient assets";
                sAssets[idx].amount -= val;
                const newSAssets = sAssets.filter(a => a.amount > 0.00000001);
                
                let rAssets = rData.assets || [];
                const rIdx = rAssets.findIndex(a => a.id === coinId);
                if (rIdx >= 0) rAssets[rIdx].amount += val;
                else rAssets.push({ id: coinId, amount: val });
                
                t.update(senderRef, { assets: newSAssets });
                t.update(receiverRef, { assets: rAssets });
            }
        });

        const assetName = type === 'cash' ? 'USD' : coinId;
        await logTransactionInternal(user.uid, 'withdraw', `Sent to ${targetId}`, val, assetName, 0, val, targetId);
        await logTransactionInternal(targetId, 'deposit', `Received from ${user.uid}`, val, assetName, 0, val, user.uid);
    };

    const updateUserPortfolio = async (newAssets, newBalance, totalDust) => {
        if (!user) return;
        await updateDoc(doc(db, "users", user.uid), { assets: newAssets, balance: newBalance });
        await logTransactionInternal(user.uid, 'dust', 'Converted dust', 1, 'mixed', totalDust, totalDust);
    };

    return (
        <CryptoContext.Provider value={{
            user, userData, loading, userId,
            balance, assets, watchlist, transactions,
            cryptoMasterList, isMasterLoading,
            signUp, login, logout, updateUserName, changePassword,
            toggleWatchlist,
            buyCoin, sellCoin, handleTransfer, updateUserPortfolio,        
            generate2FA, enable2FA, disable2FA, 
            verifyStoredCode, checkUser2FAStatus, verifyLogin2FA, reset2FAWithRecovery,
            is2FAVerifiedSession, confirmSession
        }}>
            {!loading && children}
        </CryptoContext.Provider>
    );
};

export const useCrypto = () => useContext(CryptoContext);