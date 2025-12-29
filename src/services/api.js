import axios from 'axios';



export const getMarketData = async () => {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=200&page=1&sparkline=false"
    );
    
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.warn("API Quota Exceeded (429). Please wait a little while...");

      return []; 
    }
    console.error("API Error:", error);
    return [];
  }
};

export const getCoinHistory = async (id) => {
  try {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=30`
    );
    return response.data.prices.map(price => ({
        date: new Date(price[0]).toLocaleDateString(),
        price: price[1]
    }));
  } catch (error) {
    console.error("Graphical data could not be obtained.", error);
    return [];
  }
};

export const getCoinMasterList = async () => {
    try {
        const response = await fetch("https://api.coingecko.com/api/v3/coins/list?include_platform=false");
        const data = await response.json();
        
       
        const map = {};
        data.forEach(coin => {
            map[coin.id] = {
                symbol: coin.symbol.toUpperCase(),
                name: coin.name 
            };
        });
        
        return map;
    } catch (error) {
        console.error("Master Liste Hatası:", error);
        return {}; 
    }
};