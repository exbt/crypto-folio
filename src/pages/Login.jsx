import React, { useState } from 'react';
import { useCrypto } from '../context/CryptoContext';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useCrypto();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      await login(email, password);
      navigate('/'); 
    } catch (err) {
      setError('Failed to login. Check your email/password.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">Welcome Back 👋</h2>
        
        {error && <div className="bg-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm">Email</label>
            <input 
              type="email" 
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white mt-1 focus:border-blue-500 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm">Password</label>
            <input 
              type="password" 
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white mt-1 focus:border-blue-500 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition">
            Sign In
          </button>
        </form>

        <div className="mt-6 text-center text-gray-400 text-sm">
          Don't have an account? <Link to="/signup" className="text-blue-400 hover:underline">Sign Up</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;