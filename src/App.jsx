import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Portfolio from './pages/Portfolio';
import BottomNav from './components/BottomNav';
import CoinDetail from './pages/CoinDetail';
import Login from './pages/Login'; 
import Signup from './pages/Signup'; 
import { CryptoProvider, useCrypto } from './context/CryptoContext';

const ProtectedRoute = ({ children }) => {
  const { user } = useCrypto();
  if (!user) {
    return <Navigate to="/login" />;
  }
  return children;
};

function App() {
  return (
    <CryptoProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </CryptoProvider>
  );
}

function AppContent() {
  const { user } = useCrypto();

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      <Routes>
        
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/coin/:id" element={<ProtectedRoute><CoinDetail /></ProtectedRoute>} />
        <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
      </Routes>

      
      {user && <BottomNav />}
    </div>
  );
}

export default App;