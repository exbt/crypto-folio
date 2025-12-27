import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Portfolio from './pages/Portfolio';
import BottomNav from './components/BottomNav';
import CoinDetail from './pages/CoinDetail';

function App() {
  return (
    <BrowserRouter>
      
      <div className="min-h-screen bg-slate-900 text-white font-sans">
        
        
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/coin/:id" element={<CoinDetail />} />
          <Route path="/portfolio" element={<Portfolio />} />
        </Routes>

        
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}

export default App;