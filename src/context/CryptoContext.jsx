import React, { createContext, useState, useContext, useEffect } from "react";
import { auth, db } from "../firebase";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "firebase/auth";
import { doc, setDoc, updateDoc, onSnapshot, runTransaction, getDoc } from "firebase/firestore";

const CryptoContext = createContext();

export const CryptoProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [balance, setBalance] = useState(0);
    const [assets, setAssets] = useState([]);
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
                    } else {

                    }
                });
                return () => unsubscribeSnapshot();
            } else {
                setBalance(0);
                setAssets([]);
                setUserId("");
            }
        });

        return () => unsubscribeAuth();
    }, []);


    const updateUserPortfolio = async (newAssets, newBalance) => {
        if (!user) return;
        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                assets: newAssets,
                balance: newBalance
            });
        } catch (error) {
            console.error("Update Portfolio Error:", error);
            throw error;
        }
    };


    const handleTransfer = async (targetId, amount, type = 'cash', coinId = null) => {
        const transferAmount = parseFloat(amount);


        if (!user) throw new Error("You must log in.");
        if (targetId === user.uid) throw new Error("You can't send money to yourself!");
        if (transferAmount <= 0) throw new Error("Invalid amount.");


        const senderRef = doc(db, "users", user.uid);
        const receiverRef = doc(db, "users", targetId);

        try {
            await runTransaction(db, async (transaction) => {

                const receiverDoc = await transaction.get(receiverRef);
                if (!receiverDoc.exists()) {
                    throw "Recipient user not found! Check ID.";
                }


                const senderDoc = await transaction.get(senderRef);
                const senderData = senderDoc.data();
                const receiverData = receiverDoc.data();

                if (type === 'cash') {
                    if (senderData.balance < transferAmount) throw "Insufficient balance.";

                    transaction.update(senderRef, { balance: senderData.balance - transferAmount });
                    transaction.update(receiverRef, { balance: (receiverData.balance || 0) + transferAmount });
                }

                else if (type === 'asset') {
                    const senderAssets = senderData.assets || [];
                    const senderAssetIndex = senderAssets.findIndex(a => a.id === coinId);

                    if (senderAssetIndex === -1 || senderAssets[senderAssetIndex].amount < transferAmount) {
                        throw `Insufficient Coin Balance: ${coinId}`;
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
                }
            });
            return true;
        } catch (error) {
            console.error("Transfer Error:", error);

            throw new Error(typeof error === 'string' ? error : "Transfer failed.");
        }
    };

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

    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const logout = () => {
        return signOut(auth);
    };

    const buyCoin = async (coinId, amount, price) => {
        if (!user) return;
        const totalCost = amount * price;

        if (totalCost > balance) {
            alert("Insufficient balance!");
            return;
        }

        const newBalance = balance - totalCost;
        let newAssets = [...assets];
        const existingIndex = newAssets.findIndex(a => a.id === coinId);

        if (existingIndex >= 0) {
            newAssets[existingIndex].amount += parseFloat(amount);
        }
        else {
            newAssets.push({ id: coinId, amount: parseFloat(amount) });
        }
        await updateDoc(doc(db, "users", user.uid), { balance: newBalance, assets: newAssets });

    };
    const sellCoin = async (coinId, amount, price) => {
        if (!user) return;
        const asset = assets.find(a => a.id === coinId);

        if (!asset || asset.amount < parseFloat(amount)) {
            alert("Not Enough Money!");
            return;
        }

        const newBalance = balance + (amount * price);
        let newAssets = assets.map(item => item.id === coinId ? { ...item, amount: item.amount - parseFloat(amount) } : item).filter(item => item.amount > 0);
        await updateDoc(doc(db, "users", user.uid), { balance: newBalance, assets: newAssets });
    };

    return (
        <CryptoContext.Provider value={{
            user,
            loading,
            signUp,
            login,
            logout,
            balance,
            setAssets,
            setBalance,
            assets,
            buyCoin,
            sellCoin,
            userId,
            handleTransfer,
            updateUserPortfolio
        }}>
            {!loading && children}
        </CryptoContext.Provider>
    );
};

export const useCrypto = () => useContext(CryptoContext);