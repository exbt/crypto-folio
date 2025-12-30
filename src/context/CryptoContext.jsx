import React, { createContext, useState, useContext, useEffect } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, updateDoc, onSnapshot, collection, addDoc, query, orderBy, serverTimestamp, runTransaction } from "firebase/firestore";
import toast from 'react-hot-toast';
import { getMarketData } from '../services/api';

const CryptoContext = createContext();

export const CryptoProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [balance, setBalance] = useState(0);
    const [assets, setAssets] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState("");

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
                        setBalance(d.data().balance);
                        setAssets(d.data().assets || []);
                    }
                });
                const q = query(collection(db, "users", currentUser.uid, "transactions"), orderBy("date", "desc"));
                const unsubscribeHistory = onSnapshot(q, (s) => setTransactions(s.docs.map(d => ({ id: d.id, ...d.data() }))));
                return () => { unsubscribeSnapshot(); unsubscribeHistory(); };
            } else {
                setBalance(0); setAssets([]); setTransactions([]); setUserId("");
            }
        });
        return () => unsubscribeAuth();
    }, []);

    const signUp = async (email, password) => { const r = await createUserWithEmailAndPassword(auth, email, password); await setDoc(doc(db, "users", r.user.uid), { uid: r.user.uid, balance: 10000, assets: [], email }); return r.user; };
    const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
    const logout = () => signOut(auth);
    
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
            user, loading, signUp, login, logout,
            balance, setBalance, assets, setAssets,
            buyCoin, sellCoin, userId, handleTransfer, updateUserPortfolio, transactions,
            cryptoMasterList, isMasterLoading
        }}>
            {!loading && children}
        </CryptoContext.Provider>
    );
};

export const useCrypto = () => useContext(CryptoContext);