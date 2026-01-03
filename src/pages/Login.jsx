import React, { useState } from 'react';
import { useCrypto } from '../context/CryptoContext';
import { useNavigate, Link } from 'react-router-dom';
import { AiOutlineSafety, AiOutlineKey } from 'react-icons/ai';
import toast from 'react-hot-toast';

const Login = () => {
    const { login, checkUser2FAStatus, verifyLogin2FA, reset2FAWithRecovery } = useCrypto();
    const navigate = useNavigate();


    const [step, setStep] = useState(1); 
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [recoveryKey, setRecoveryKey] = useState('');
    const [tempUid, setTempUid] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const userCredential = await login(email, password);
            const uid = userCredential.user.uid;
            
            const has2FA = await checkUser2FAStatus(uid);

            if (has2FA) {
                setTempUid(uid);
                setStep(2);
                toast('Please verify 2FA', { icon: '🔒' });
            } else {
                toast.success('Welcome back!');
                navigate('/portfolio');
            }
        } catch (error) {
            toast.error('Login Failed: Check credentials');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handle2FASubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const isValid = await verifyLogin2FA(tempUid, otp);
            if (isValid) {
                toast.success('Verification Successful');
                navigate('/portfolio');
            } else {
                toast.error('Invalid Code');
            }
        } catch (error) {
            toast.error('Error verifying code');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRecoverySubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const success = await reset2FAWithRecovery(tempUid, recoveryKey.trim());
            if (success) {
                navigate('/portfolio'); 
            }
        } catch (error) {
            toast.error('Recovery Failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl border border-slate-700">
                <h2 className="text-3xl font-bold text-white text-center mb-2">
                    {step === 1 ? 'Welcome Back' : step === 3 ? 'Account Recovery' : 'Security Check'}
                </h2>
                <p className="text-gray-400 text-center text-sm mb-8">
                    {step === 1 ? 'Enter your credentials to access your portfolio.' : step === 3 ? 'Enter your recovery key to disable 2FA.' : 'Enter the 6-digit code from your authenticator app.'}
                </p>
                
                {step === 1 && (
                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Email</label>
                            <input type="email" className="w-full bg-slate-900 text-white p-4 rounded-xl border border-slate-700 focus:border-blue-500 outline-none transition" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Password</label>
                            <input type="password" className="w-full bg-slate-900 text-white p-4 rounded-xl border border-slate-700 focus:border-blue-500 outline-none transition" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition shadow-lg active:scale-[0.98] disabled:opacity-50">{isLoading ? 'Checking...' : 'Sign In'}</button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handle2FASubmit} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-blue-600/20 text-blue-500 rounded-full flex items-center justify-center animate-pulse">
                                <AiOutlineSafety size={32} />
                            </div>
                        </div>
                        <div>
                            <input type="text" className="w-full bg-slate-900 text-white text-center text-3xl tracking-[0.5em] p-4 rounded-xl border border-slate-700 focus:border-blue-500 outline-none transition font-mono" placeholder="000000" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} autoFocus required />
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition shadow-lg active:scale-[0.98] disabled:opacity-50">{isLoading ? 'Verifying...' : 'Verify Code'}</button>
                        
                        <div className="text-center space-y-2">
                            <button type="button" onClick={() => setStep(3)} className="text-sm text-blue-400 hover:text-blue-300 font-bold">Lost your device?</button>
                            <div className="block"></div>
                            <button type="button" onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-white transition">Back to Login</button>
                        </div>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleRecoverySubmit} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-yellow-500/20 text-yellow-500 rounded-full flex items-center justify-center">
                                <AiOutlineKey size={32} />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase ml-1 block mb-2">Recovery Key</label>
                            <input type="text" className="w-full bg-slate-900 text-white p-4 rounded-xl border border-slate-700 focus:border-yellow-500 outline-none transition font-mono text-center uppercase break-all text-sm" placeholder="ABCDEFGH..." value={recoveryKey} onChange={(e) => setRecoveryKey(e.target.value)} autoFocus required />
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-4 rounded-xl transition shadow-lg active:scale-[0.98] disabled:opacity-50">{isLoading ? 'Recovering...' : 'Reset 2FA & Login'}</button>
                        <button type="button" onClick={() => setStep(2)} className="w-full text-gray-500 text-sm hover:text-white transition">Back to 2FA</button>
                    </form>
                )}

                {step === 1 && (
                    <p className="text-gray-500 text-center mt-6 text-sm">
                        Don't have an account? <Link to="/signup" className="text-blue-400 font-bold hover:underline">Sign Up</Link>
                    </p>
                )}
            </div>
        </div>
    );
};

export default Login;