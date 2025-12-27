import React, { createContext, useState, useContext, useEffect } from "react";

const CryptoContext = createContext();

export const CryptoProvider = ({ children }) => {
  const [balance, setBalance] = useState(() => {
    const saved = localStorage.getItem("balance");
    return saved ? parseFloat(saved) : 10000;
  });

  const [assets, setAssets] = useState(() => {
    const saved = localStorage.getItem("assets");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("balance", balance);
    localStorage.setItem("assets", JSON.stringify(assets));
  }, [balance, assets]);

  const buyCoin = (coinId, amount, price) => {
    const totalCost = amount * price;

    if (totalCost > balance) {
      alert("Insufficient Balance!");
      return;
    }

    setBalance((prev) => prev - totalCost);

    setAssets((prev) => {
      const existingAsset = prev.find((asset) => asset.id === coinId);
      if (existingAsset) {
        return prev.map((asset) =>
          asset.id === coinId
            ? { ...asset, amount: asset.amount + parseFloat(amount) }
            : asset
        );
      } else {
        return [...prev, { id: coinId, amount: parseFloat(amount) }];
      }
    });

    alert("Transaction Successful!");
  };

  const sellCoin = (coinId, amount, price) => {
    const asset = assets.find((a) => a.id === coinId);

    if (!asset || asset.amount < parseFloat(amount)) {
      alert("Insufficient Coin Supply!");
      return;
    }

    const totalValue = amount * price;

    setBalance((prev) => prev + totalValue);

    setAssets((prev) => {
      return prev.map((item) => {
        if (item.id === coinId) {
          return { ...item, amount: item.amount - parseFloat(amount) };
        }
        return item;
      }).filter((item) => item.amount > 0); 
    });

    alert("Sale successful!");
  };

  return (
    <CryptoContext.Provider value={{ balance, assets, buyCoin, sellCoin }}>
      {children}
    </CryptoContext.Provider>
  );
};

export const useCrypto = () => useContext(CryptoContext);