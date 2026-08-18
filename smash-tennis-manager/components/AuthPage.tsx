
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Trophy, Building2, Phone, CreditCard, Award, Info } from 'lucide-react';
import { useToast } from './ui/Toast';
import { Institution } from '../types';
import { NUMERIC_CATEGORIES } from '../utils/categories';

interface AuthPageProps {
  onLoginSuccess: () => void;
  onDebugLogin?: () => void;
  initialClubId?: string;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess, onDebugLogin, initialClubId }) => {
  const [isLogin, setIsLogin] = useState(false);
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
    category: '',
    institution_id: initialClubId || '',
    role: 'player'
  });

  useEffect(() => {
    // Check URL parameters for club or mode
    const params = new URLSearchParams(window.location.search);
    const clubParam = params.get('club') || initialClubId;
    const modeParam = params.get('mode');

    if (clubParam) {
      setFormData(prev => ({ ...prev, institution_id: clubParam }));
      setIsLogin(false); // If arriving via club invite link, prioritize registration
    } else if (modeParam === 'login') {
      setIsLogin(true);
    } else if (modeParam === 'register') {
      setIsLogin(false);
    } else {
      setIsLogin(true);
    }

    api.institutions.getAll().then(setInstitutions).catch(err => console.error("Error loading clubs", err));
  }, [initialClubId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLogin) {
      const cleanEmail = formData.email.trim();
      if (!cleanEmail || !formData.password) {
        addToast('Por favor completa todos los campos.', 'error');
        return;
      }
      setLoading(true);
      try {
        const { error } = await api.auth.signIn(cleanEmail, formData.password);
        if (error) throw error;
        addToast('¡Bienvenido de nuevo!', 'success');
        onLoginSuccess();
      } catch (err: any) {
        addToast(err.message || 'Error de autenticación', 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    // REGISTRATION VALIDATIONS
    const cleanName = formData.name.trim();
    const cleanLastname = formData.lastname.trim();
    const cleanDni = formData.dni.trim();
    const cleanPhone = formData.phone.trim();
    const cleanEmail = formData.email.trim();

    if (!cleanName || cleanName.length < 2) {
      addToast('Por favor ingresa tu Nombre (mínimo 2 letras).', 'error');
      return;
    }

    if (!cleanLastname || cleanLastname.length < 2) {
      addToast('Por favor ingresa tu Apellido en el campo correspondiente.', 'error');
      return;
    }

    if (!cleanDni || cleanDni.length < 6) {
      addToast('Por favor ingresa un DNI o documento válido.', 'error');
      return;
    }

    if (!cleanPhone || cleanPhone.length < 6) {
      addToast('Por favor ingresa tu número de WhatsApp / Teléfono.', 'error');
      return;
    }

    if (!formData.category) {
      addToast('Por favor selecciona tu Categoría actual estimada.', 'error');
      return;
    }

    if (!formData.institution_id) {
      addToast('Por favor indica tu Club Principal o selecciona "Jugador Independiente".', 'error');
      return;
    }

    const selectedClubId = formData.institution_id === 'none' ? null : formData.institution_id;

    setLoading(true);
    try {
      const { error } = await api.auth.signUp(cleanEmail, formData.password, {
        name: cleanName,
        lastname: cleanLastname,
        phone: cleanPhone,
        dni: cleanDni,
        category: formData.category,
        institution_id: selectedClubId,
        role: 'player',
        is_approved: false,
        is_member: false,
        member_status: selectedClubId ? 'pending' : 'active'
      });
      if (error) throw error;
      addToast('¡Registro exitoso! Tu solicitud y categoría han sido enviadas para su validación.', 'success');
      setIsLogin(true);
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
                <div>
                  <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Carlos"
                    className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors text-sm"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                    Apellido *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Gómez"
                    className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors text-sm"
                    required
                    value={formData.lastname}
                    onChange={e => setFormData({ ...formData, lastname: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                    DNI / Documento *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 38450123"
                    className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors text-sm"
                    required
                    value={formData.dni}
                    onChange={e => setFormData({ ...formData, dni: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                    WhatsApp / Teléfono *
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej: 3434123456"
                    className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors text-sm"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              {/* Categoría Selector */}
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Award size={14} className="text-primary" /> Tu Categoría de Juego *
                </label>
                <select
                  className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors text-sm cursor-pointer"
                  required
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="" disabled>-- Selecciona tu Categoría Inicial * --</option>
                  {NUMERIC_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {cat} Categoría
                    </option>
                  ))}
                </select>
                <div className="flex items-start gap-1.5 mt-1.5 text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg">
                  <Info size={14} className="shrink-0 mt-0.5" />
                  <span>
                    La categoría seleccionada es de referencia y será validada/homologada oficialmente por el organizador del torneo o administrador del club.
                  </span>
                </div>
              </div>

              {/* Institution / Club Selector */}
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Building2 size={14} className="text-primary" /> Tu Club Principal *
                </label>
                <select
                  className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors text-sm cursor-pointer"
                  required
                  value={formData.institution_id}
                  onChange={e => setFormData({ ...formData, institution_id: e.target.value })}
                >
                  <option value="" disabled>-- Selecciona tu Club o Condición * --</option>
                  <option value="none">🎾 Jugador Independiente / Sin Club</option>
                  {institutions.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.city})
                    </option>
                  ))}
                </select>
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
