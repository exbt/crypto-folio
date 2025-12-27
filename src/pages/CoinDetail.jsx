import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCoinHistory } from '../services/api';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { AiOutlineArrowLeft } from 'react-icons/ai';

const CoinDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const data = await getCoinHistory(id);
      setHistory(data);
      setLoading(false);
    };
    fetchHistory();
  }, [id]);

  return (
    <div className="p-4 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="text-white bg-slate-800 p-2 rounded-full">
          <AiOutlineArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-white capitalize">{id} Details</h1>
      </div>

      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 h-[300px]">
        {loading ? (
          <div className="text-blue-400 text-center mt-20">Loading Chart...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: 'none' }}
                labelStyle={{ display: 'none' }}
                formatter={(value) => [`$${value.toFixed(2)}`, 'Price']}
              />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke="#3b82f6" 
                fillOpacity={1} 
                fill="url(#colorPrice)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      
      <div className="mt-4 text-gray-400 text-sm text-center">
        Last 7 Days Price Trend
      </div>
    </div>
  );
};

export default CoinDetail;