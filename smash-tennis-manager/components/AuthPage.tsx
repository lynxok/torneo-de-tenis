
import React, { useState } from 'react';
import { api } from '../services/api';
import { Trophy } from 'lucide-react';
import { useToast } from './ui/Toast';

interface AuthPageProps {
  onLoginSuccess: () => void;
  onDebugLogin?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess, onDebugLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    lastname: '',
    role: 'player'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const cleanEmail = formData.email.trim();
        const { error } = await api.auth.signIn(cleanEmail, formData.password);
        if (error) throw error;
        addToast('¡Bienvenido de nuevo!', 'success');
        onLoginSuccess();
      } else {
        const { error } = await api.auth.signUp(formData.email, formData.password, {
          name: formData.name,
          lastname: formData.lastname,
          role: formData.role
        });
        if (error) throw error;
        addToast('Registro exitoso. Revisa tu email.', 'success');
        setIsLogin(true);
      }
    } catch (err: any) {
      addToast(err.message || 'Error de autenticación', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/50 relative overflow-hidden">



        <div className="flex flex-col items-center mb-8">
          <img
            src="/Smash.png"
            alt="Smash Tennis"
            className="h-64 w-auto object-contain mb-2 drop-shadow-[0_0_15px_rgba(0,198,255,0.3)]"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Nombre"
                className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors"
                required
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
              <input
                type="text"
                placeholder="Apellido"
                className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors"
                required
                onChange={e => setFormData({ ...formData, lastname: e.target.value })}
              />
            </div>
          )}

          <input
            type="email"
            placeholder="Correo Electrónico"
            className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors"
            required
            onChange={e => setFormData({ ...formData, email: e.target.value })}
          />

          <input
            type="password"
            placeholder="Contraseña"
            className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors"
            required
            onChange={e => setFormData({ ...formData, password: e.target.value })}
          />

          {!isLogin && (
            <div className="flex items-center gap-2 p-3 bg-sidebar rounded-xl border border-white/10">
              <input
                type="checkbox"
                id="role-check"
                className="w-4 h-4 accent-primary"
                onChange={e => setFormData({ ...formData, role: e.target.checked ? 'admin' : 'player' })}
              />
              <label htmlFor="role-check" className="text-sm text-muted cursor-pointer select-none">
                Soy Organizador / Profesor
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-primary-hover text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/25 hover:translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Registrarse')}
          </button>
        </form>

        <div className="mt-6 text-center mb-8">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-muted hover:text-primary text-sm transition-colors"
          >
            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia Sesión'}
          </button>
        </div>

        {/* FOOTER */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
          <span className="text-sm text-muted">Desarrollado por</span>
          <img src="/lynx-logo-white.png" alt="Lynx Consulting" className="h-8 w-auto" />
        </div>
      </div>
    </div>
  );
};
