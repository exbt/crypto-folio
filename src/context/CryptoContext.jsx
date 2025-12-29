import React, { createContext, useState, useContext, useEffect } from "react";
import { auth, db } from "../firebase";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "firebase/auth";
import {
    doc, setDoc, updateDoc, onSnapshot, runTransaction,
    collection, addDoc, query, orderBy, serverTimestamp
} from "firebase/firestore";
import toast from 'react-hot-toast';

const CryptoContext = createContext();

export const CryptoProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [balance, setBalance] = useState(0);
    const [assets, setAssets] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState("");

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);

            if (currentUser) {
                setUserId(currentUser.uid);
                const userRef = doc(db, "users", currentUser.uid);


                const unsubscribeSnapshot = onSnapshot(userRef, (coinDoc) => {
                    if (coinDoc.exists()) {
                        setBalance(coinDoc.data().balance);
                        setAssets(coinDoc.data().assets || []);
                    }
                });


                const transactionsRef = collection(db, "users", currentUser.uid, "transactions");
                const q = query(transactionsRef, orderBy("date", "desc"));

                const unsubscribeHistory = onSnapshot(q, (snapshot) => {
                    const hist = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setTransactions(hist);
                });

                return () => {
                    unsubscribeSnapshot();
                    unsubscribeHistory();
                };
            } else {
                setBalance(0);
                setAssets([]);
                setTransactions([]);
                setUserId("");
            }
        });
        return () => unsubscribeAuth();
    }, []);

    const signUp = async (email, password) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;

        await setDoc(doc(db, "users", newUser.uid), {
            uid: newUser.uid,
            balance: 10000,
            assets: [],
            email: email
        });
        return newUser;
    };


    const logTransaction = async (type, description, amount, coinId = null, executionPrice = 0, totalValue = 0) => {
        if (!user) return;
        const transRef = collection(db, "users", user.uid, "transactions");
        await addDoc(transRef, {
            type,
            description,
            amount: parseFloat(amount),
            coinId,
            executionPrice: parseFloat(executionPrice),
            totalValue: parseFloat(totalValue),
            date: serverTimestamp()
        });
    };


    const handleTransfer = async (targetId, amount, type = 'cash', coinId = null) => {
        const transferAmount = parseFloat(amount);

        if (!user) throw new Error("You must log in.");
        if (targetId === user.uid) throw new Error("You can't send it to yourself!");
        if (transferAmount <= 0) throw new Error("Invalid amount.");

        const senderRef = doc(db, "users", user.uid);
        const receiverRef = doc(db, "users", targetId);


        const senderHistoryRef = collection(db, "users", user.uid, "transactions");
        const receiverHistoryRef = collection(db, "users", targetId, "transactions");

        try {
            await runTransaction(db, async (transaction) => {
                const receiverDoc = await transaction.get(receiverRef);
                if (!receiverDoc.exists()) throw "Recipient not found!";

                const senderDoc = await transaction.get(senderRef);
                const senderData = senderDoc.data();
                const receiverData = receiverDoc.data();


                if (type === 'cash') {
                    if (senderData.balance < transferAmount) throw "Insufficient Balance:";

                    transaction.update(senderRef, { balance: senderData.balance - transferAmount });
                    transaction.update(receiverRef, { balance: (receiverData.balance || 0) + transferAmount });


                    const senderLog = { type: 'send', description: `Sent cash to ${targetId}`, amount: transferAmount, executionPrice: 1, totalValue: transferAmount, date: serverTimestamp() };
                    const receiverLog = { type: 'receive', description: `Received cash from ${user.uid}`, amount: transferAmount, executionPrice: 1, totalValue: transferAmount, date: serverTimestamp() };


                    const newSenderLogRef = doc(senderHistoryRef);
                    const newReceiverLogRef = doc(receiverHistoryRef);
                    transaction.set(newSenderLogRef, senderLog);
                    transaction.set(newReceiverLogRef, receiverLog);

                } else if (type === 'asset') {
                    const senderAssets = senderData.assets || [];
                    const senderAssetIndex = senderAssets.findIndex(a => a.id === coinId);

                    if (senderAssetIndex === -1 || senderAssets[senderAssetIndex].amount < transferAmount) {
                        throw `Insufficient Coin: ${coinId}`;
                    }

                    senderAssets[senderAssetIndex].amount -= transferAmount;
                    let newSenderAssets = senderAssets.filter(a => a.amount > 0.00000001);

                    let receiverAssets = receiverData.assets || [];
                    const receiverAssetIndex = receiverAssets.findIndex(a => a.id === coinId);

                    if (receiverAssetIndex >= 0) {
                        receiverAssets[receiverAssetIndex].amount += transferAmount;
                    } else {
                        receiverAssets.push({ id: coinId, amount: transferAmount });
                    }

                    transaction.update(senderRef, { assets: newSenderAssets });
                    transaction.update(receiverRef, { assets: receiverAssets });


                    const senderLog = { type: 'send', description: `Sent ${coinId} to ${targetId}`, amount: transferAmount, coinId, executionPrice: 0, totalValue: 0, date: serverTimestamp() };
                    const receiverLog = { type: 'receive', description: `Received ${coinId} from ${user.uid}`, amount: transferAmount, coinId, executionPrice: 0, totalValue: 0, date: serverTimestamp() };

                    const newSenderLogRef = doc(senderHistoryRef);
                    const newReceiverLogRef = doc(receiverHistoryRef);
                    transaction.set(newSenderLogRef, senderLog);
                    transaction.set(newReceiverLogRef, receiverLog);
                }
            });
            return true;
        } catch (error) {
            // console.error("Transfer Error:", error);
            throw new Error(typeof error === 'string' ? error : "Transfer failed.");
        }
    };

    const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
    const logout = () => signOut(auth);


   const updateUserPortfolio = async (newAssets, newBalance, totalDustValue, dustDetails = []) => {
        if (!user) return;
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { assets: newAssets, balance: newBalance });
        await logTransaction('dust', `Converted dust assets to cash`, 1, 'mixed', totalDustValue, totalDustValue);
    };

    const buyCoin = async (coinId, amount, price) => {
        if (!user) return;
        const totalCost = amount * price;
        if (totalCost > balance) {
            toast.error("Insufficient balance! Check your wallet.");
            return;
        }

        const newBalance = balance - totalCost;
        let newAssets = [...assets];
        const existingIndex = newAssets.findIndex(a => a.id === coinId);

        if (existingIndex >= 0) {
            const currentAsset = newAssets[existingIndex];
            const currentTotalCost = currentAsset.amount * (currentAsset.avgPrice || currentAsset.current_price || price);
            const newPurchaseCost = totalCost;
            const totalAmount = currentAsset.amount + parseFloat(amount);
            const newAvgPrice = (currentTotalCost + newPurchaseCost) / totalAmount;
            newAssets[existingIndex] = {
                ...currentAsset,
                amount: totalAmount,
                avgPrice: newAvgPrice
            };
        } else {
            newAssets.push({
                id: coinId,
                amount: parseFloat(amount),
                avgPrice: price
            });
        }

        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
            balance: newBalance,
            assets: newAssets
        });

        await logTransaction('buy', `Bought ${coinId} @ $${price.toLocaleString()}`, amount, coinId, price, totalCost);
        toast.success("Purchase successful!");
    };

    const sellCoin = async (coinId, amount, price) => {
        if (!user) return;
        const asset = assets.find(a => a.id === coinId);

        if (!asset || asset.amount < parseFloat(amount)) {
            toast.error("You don't have enough coins to sell!");
            return;
        }

        const earnings = amount * price;
        const newBalance = balance + earnings;
         let newAssets = assets.map(item => {
            if (item.id === coinId) {
                return { ...item, amount: item.amount - parseFloat(amount) };
            }
            return item;
        }).filter(item => item.amount > 0.00000001);

        await updateDoc(doc(db, "users", user.uid), { balance: newBalance, assets: newAssets });
        await logTransaction('sell', `Sold ${coinId} @ $${price.toLocaleString()}`, amount, coinId, price, earnings);
        toast.success("The sale transaction has been completed.");
    };

    return (
        <CryptoContext.Provider value={{
            user, loading, signUp, login, logout,
            balance, setBalance, assets, setAssets,
            buyCoin, sellCoin, userId,
            handleTransfer, updateUserPortfolio,
            transactions
        }}>
            {!loading && children}
        </CryptoContext.Provider>
    );
};

export const useCrypto = () => useContext(CryptoContext);