import React from 'react';
import { 
  LayoutGrid, 
  Calendar, 
  Trophy, 
  Swords, 
  User,
  ShoppingBag,
  Mail
} from 'lucide-react';
import { UserRole } from '../types';
import { soundEffects } from '../services/soundEffects';

interface BottomNavBarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  role: UserRole;
  unreadCount?: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeView,
  onNavigate,
  role,
  unreadCount = 0
}) => {
  const isPlayer = role === 'player';

  const navItems = [
    {
      id: 'dashboard',
      label: 'Inicio',
      icon: LayoutGrid
    },
    {
      id: 'bookings',
      label: 'Canchas',
      icon: Calendar
    },
    {
      id: 'tournaments',
      label: 'Torneos',
      icon: Trophy
    },
    {
      id: isPlayer ? 'open-matches' : 'shop',
      label: isPlayer ? 'Partidos' : 'Tienda',
      icon: isPlayer ? Swords : ShoppingBag
    },
    {
      id: 'profile',
      label: 'Mi Perfil',
      icon: User
    }
  ];

  const handleItemClick = (viewId: string) => {
    if (activeView !== viewId) {
      soundEffects.play('click');
      onNavigate(viewId);
    }
  };

  return (
    <nav 
      aria-label="Navegación Móvil Inferior"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-dark/95 backdrop-blur-lg border-t border-white/10 px-2 py-1.5 shadow-[0_-8px_20px_rgba(0,0,0,0.5)] safe-area-pb"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id || 
            (item.id === 'tournaments' && (activeView === 'tournament-detail' || activeView === 'tournaments-map'));

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[46px] rounded-xl py-1 px-2 transition-all duration-200 active:scale-90 relative ${
                isActive 
                  ? 'text-primary' 
                  : 'text-muted hover:text-white'
              }`}
            >
              <div className={`relative p-1 rounded-xl transition-all ${
                isActive ? 'bg-primary/10 shadow-sm shadow-primary/30' : ''
              }`}>
                <Icon size={20} className={isActive ? 'stroke-[2.5]' : 'stroke-2'} />
                {item.id === 'profile' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-dark animate-pulse" />
                )}
              </div>
              <span className={`text-[10px] tracking-tight font-medium mt-0.5 ${
                isActive ? 'font-bold text-white' : 'text-muted'
              }`}>
                {item.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 bg-primary rounded-full mt-0.5 shadow-sm shadow-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
