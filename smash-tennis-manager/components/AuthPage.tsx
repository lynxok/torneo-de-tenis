
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Trophy, Building2, Phone, CreditCard } from 'lucide-react';
import { useToast } from './ui/Toast';
import { Institution } from '../types';

interface AuthPageProps {
  onLoginSuccess: () => void;
  onDebugLogin?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess, onDebugLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    lastname: '',
    phone: '',
    dni: '',
    institution_id: '',
    role: 'player'
  });

  useEffect(() => {
    api.institutions.getAll().then(setInstitutions).catch(err => console.error("Error loading clubs", err));
  }, []);

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
          phone: formData.phone,
          dni: formData.dni,
          institution_id: formData.institution_id || null,
          role: formData.role,
          is_approved: false,
          is_member: false,
          member_status: formData.institution_id ? 'pending' : 'active'
        });
        if (error) throw error;
        addToast('¡Registro exitoso! Tu solicitud ha sido enviada al club para su aprobación.', 'success');
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
      <div className="w-full max-w-md bg-card border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/50 relative overflow-hidden my-8">

        <div className="flex flex-col items-center mb-6">
          <img
            src="/Smash.png"
            alt="Smash Tennis"
            className="h-44 w-auto object-contain mb-2 drop-shadow-[0_0_15px_rgba(0,198,255,0.3)]"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Nombre"
                  className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors text-sm"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Apellido"
                  className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors text-sm"
                  required
                  value={formData.lastname}
                  onChange={e => setFormData({ ...formData, lastname: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="DNI"
                    className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors text-sm"
                    required
                    value={formData.dni}
                    onChange={e => setFormData({ ...formData, dni: e.target.value })}
                  />
                </div>
                <div className="relative">
                  <input
                    type="tel"
                    placeholder="WhatsApp / Teléfono"
                    className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors text-sm"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              {/* Institution / Club Selector */}
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Building2 size={14} className="text-primary" /> Tu Club Principal
                </label>
                <select
                  className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors text-sm cursor-pointer"
                  value={formData.institution_id}
                  onChange={e => setFormData({ ...formData, institution_id: e.target.value })}
                >
                  <option value="">-- Sin Club / Independiente --</option>
                  {institutions.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.city})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted mt-1">
                  Si perteneces a un club, el administrador validará tu membresía y categoría oficial.
                </p>
              </div>
            </>
          )}

          <input
            type="email"
            placeholder="Correo Electrónico"
            className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors text-sm"
            required
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
          />

          <input
            type="password"
            placeholder="Contraseña"
            className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors text-sm"
            required
            value={formData.password}
            onChange={e => setFormData({ ...formData, password: e.target.value })}
          />

          {!isLogin && (
            <div className="flex items-center gap-2 p-3 bg-sidebar rounded-xl border border-white/10">
              <input
                type="checkbox"
                id="role-check"
                className="w-4 h-4 accent-primary cursor-pointer"
                onChange={e => setFormData({ ...formData, role: e.target.checked ? 'admin' : 'player' })}
              />
              <label htmlFor="role-check" className="text-xs text-muted cursor-pointer select-none">
                Soy Organizador de Torneo / Profesor
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-primary-hover text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/25 hover:translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
          </button>
        </form>

        <div className="mt-6 text-center mb-8">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-muted hover:text-primary text-sm transition-colors"
          >
            {isLogin ? '¿No tienes cuenta? Regístrate aquí' : '¿Ya tienes cuenta? Inicia Sesión'}
          </button>
        </div>

        {/* FOOTER */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
          <span className="text-xs text-muted">Desarrollado por</span>
          <img src="/lynx-logo-white.png" alt="Lynx Consulting" className="h-6 w-auto" />
        </div>
      </div>
    </div>
  );
};
