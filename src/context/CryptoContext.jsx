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

  return (
    <CryptoContext.Provider value={{ balance, assets, buyCoin }}>
      {children}
    </CryptoContext.Provider>
  );
};

export const useCrypto = () => useContext(CryptoContext);