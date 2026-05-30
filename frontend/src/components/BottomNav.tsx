import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Map, Clock, User } from 'lucide-react';

interface BottomNavProps {
  active: 'home' | 'map' | 'history' | 'profile';
}

const navItems = [
  { id: 'home', label: 'Home', icon: Home, path: '/dashboard' },
  { id: 'map', label: 'Hospitals', icon: Map, path: '/hospitals' },
  { id: 'history', label: 'History', icon: Clock, path: '/history' },
  { id: 'profile', label: 'Profile', icon: User, path: '/profile' },
] as const;

export default function BottomNav({ active }: BottomNavProps) {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 safe-area-bottom">
      <div className="glass-dark border-t border-white/10 px-4 py-2">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-1 py-1 px-4 relative"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-red-500 rounded-full"
                  />
                )}
                <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-red-400' : 'text-gray-500'}`} />
                <span className={`text-xs transition-colors ${isActive ? 'text-red-400 font-medium' : 'text-gray-500'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
