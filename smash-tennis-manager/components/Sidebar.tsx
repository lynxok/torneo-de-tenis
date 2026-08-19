
import React from 'react';
import {
  LayoutGrid,
  Trophy,
  Users,
  Mail,
  Calendar,
  Settings,
  LogOut,
  UserCircle,
  BookOpen,
  Sliders,
  Smartphone
} from 'lucide-react';
import { UserRole } from '../types';
import packageInfo from '../package.json';
import { formatPlayerName } from '../utils/formatters';
import { triggerPWAInstall } from './PWAInstallPrompt';

interface SidebarProps {
  role: UserRole;
  activeView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  unreadCount?: number;
  userName?: string;
  userAvatar?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ role, activeView, onNavigate, onLogout, unreadCount = 0, userName, userAvatar }) => {

  const NavButton = ({ view, icon: Icon, label, id, badge }: { view: string; icon: any; label: string; id?: string, badge?: number }) => (
    <button
      id={id}
      onClick={() => onNavigate(view)}
      className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200 text-sm font-medium relative
        ${activeView === view
          ? 'bg-gradient-to-br from-primary to-primary-hover text-white shadow-lg shadow-primary/20 font-bold'
          : 'text-muted hover:bg-white/5 hover:text-primary hover:translate-x-1'
        }`}
    >
      <Icon size={20} />
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg shadow-red-500/20 animate-pulse">
          {badge > 9 ? '+9' : badge}
        </span>
      )}
    </button>
  );

  return (
    <aside className="flex flex-col w-64 bg-sidebar border-r border-white/10 h-screen sticky top-0 p-6">
      <div className="flex items-center justify-center mb-8 pt-2">
        <img
          src="/Smash.png"
          alt="Smash Tennis"
          className="h-32 w-auto object-contain drop-shadow-[0_0_10px_rgba(0,198,255,0.3)]"
        />
      </div>

      {/* User Avatar Section */}
      {userName && (
        <div
          onClick={() => onNavigate('profile')}
          className="flex items-center gap-3 p-3 mb-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center border-2 border-primary/30 group-hover:border-primary transition-colors">
            {userAvatar ? (
              <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-white">{userName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white truncate">{formatPlayerName(userName)}</div>
            <div className="text-[10px] text-muted capitalize">{role}</div>
          </div>
        </div>
      )}

      <nav className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
        <NavButton view="dashboard" icon={LayoutGrid} label="Panel General" />
        <NavButton view="profile" icon={UserCircle} label="Mi Perfil" />

        <div className="pt-4 pb-2">
          <p className="px-3 text-xs font-semibold text-muted uppercase tracking-wider mb-2">Competición</p>
          <NavButton view="tournaments" icon={Trophy} label="Torneos" id="nav-tournaments" />
          <NavButton view="rankings" icon={Trophy} label="Ranking" />
        </div>

        <div className="pt-2 pb-2">
          <p className="px-3 text-xs font-semibold text-muted uppercase tracking-wider mb-2">Social</p>
          <NavButton view="players" icon={Users} label="Jugadores" id="nav-players" />
          <NavButton view="messages" icon={Mail} label="Mensajes" badge={unreadCount} />
        </div>

        <div className="pt-2">
          <NavButton view="bookings" icon={Calendar} label="Reservas" id="nav-bookings" />
        </div>

        {(role === 'admin' || role === 'superadmin' || role === 'professor') && (
          <div className="pt-4 mt-4 border-t border-white/10">
            <p className="px-3 text-xs font-semibold text-muted uppercase tracking-wider mb-2">Administración</p>
            {(role === 'superadmin' || role === 'admin') && (
              <NavButton view="admin-users" icon={Users} label="Usuarios" />
            )}
            <NavButton view="admin-institutions" icon={Settings} label="Instituciones" />
            {role === 'superadmin' && (
              <NavButton view="admin-settings" icon={Sliders} label="Ajustes Globales" />
            )}
          </div>
        )}
      </nav>

      <div className="mt-auto pt-6 border-t border-white/10 space-y-3">
        <button
          onClick={triggerPWAInstall}
          className="flex items-center gap-3 w-full p-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary hover:text-white transition-all text-xs font-bold border border-primary/25 shadow-sm group"
        >
          <Smartphone size={18} className="text-primary group-hover:scale-110 transition-transform" />
          <span>Instalar App en Celular</span>
        </button>

        <NavButton view="tutorials" icon={BookOpen} label="Tutoriales / Ayuda" />

        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full p-3 rounded-xl text-muted hover:bg-red-500/10 hover:text-red-500 transition-colors text-sm font-medium"
        >
          <LogOut size={20} />
          Cerrar Sesión
        </button>

        <div className="flex flex-col items-center justify-center gap-1 pt-2">
          <div className="flex items-center gap-2 opacity-40 hover:opacity-80 transition-opacity">
            <span className="text-xs text-muted">Desarrollado por</span>
            <img src="/lynx-logo-white.png" alt="Lynx" className="h-6 w-auto" />
          </div>
          <span className="text-[10px] font-mono text-primary/70 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
            v{packageInfo.version}
          </span>
        </div>
      </div>
    </aside>
  );
};
