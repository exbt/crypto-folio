import axios from 'axios';

const API_URL = 'https://api.coingecko.com/api/v3';

let marketCache = {
  data: [],
  lastFetch: 0
};

let historyCache = {};

export const getMarketData = async () => {
    const now = Date.now();
    const CACHE_DURATION = 60000;

    if (marketCache.data.length > 0 && (now - marketCache.lastFetch < CACHE_DURATION)) {
    // console.log("Using Cached Market Data"); 
    return marketCache.data;
    }
  try {
    const response = await axios.get(`${API_URL}/coins/markets`, {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: 50,
        page: 1,
        sparkline: false
      }
    });

    marketCache = {
      data: response.data,
      lastFetch: now
    };

    return response.data;
  } catch (error) {
    // console.error("API Error (Market):", error);
    return marketCache.data;
  }
};

export const getCoinHistory = async (coinId) => {
    const now = Date.now();
    const CACHE_DURATION = 300000;
    const cached = historyCache[coinId];

    if (cached && (now - cached.lastFetch < CACHE_DURATION)) {
    // console.log(`Using Cached History for ${coinId}`);
    return cached.data;
    }

  try {
    const response = await axios.get(`${API_URL}/coins/${coinId}/market_chart`, {
      params: {
        vs_currency: 'usd',
        days: '7',
      }
    });
    return response.data.prices.map(price => ({
      timestamp: price[0],
      price: price[1]
    }));

    historyCache[coinId] = {
      data: formattedData,
      lastFetch: now
    };

    return formattedData;
  } catch (error) {
    // console.error("API Error (History):", error);
    return cached ? cached.data : [];
  }
};