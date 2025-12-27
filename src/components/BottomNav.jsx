import React from 'react';
import { NavLink } from 'react-router-dom';
import { AiFillHome, AiFillPieChart } from 'react-icons/ai'; 

const BottomNav = () => {
  return (
    <div className="fixed bottom-0 left-0 w-full bg-slate-800 border-t border-slate-700 p-3 flex justify-around items-center z-50">
      
      <NavLink 
        to="/" 
        className={({ isActive }) => 
          `flex flex-col items-center text-sm ${isActive ? 'text-blue-500' : 'text-gray-400'}`
        }
      >
        <AiFillHome size={24} />
        <span className="text-xs mt-1">Market</span>
      </NavLink>

      
      <NavLink 
        to="/portfolio" 
        className={({ isActive }) => 
          `flex flex-col items-center text-sm ${isActive ? 'text-blue-500' : 'text-gray-400'}`
        }
      >
        <AiFillPieChart size={24} />
        <span className="text-xs mt-1">Portfolio</span>
      </NavLink>
    </div>
  );
};

export default BottomNav;