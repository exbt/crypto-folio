import axios from 'axios';

const API_URL = 'https://api.coingecko.com/api/v3';

export const getMarketData = async () => {
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
    return response.data;
  } catch (error) {
    console.error("Data fetching error:", error);
    return [];
  }
};

export const getCoinHistory = async (coinId) => {
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
  } catch (error) {
    console.error("History fetch error:", error);
    return [];
  }
};