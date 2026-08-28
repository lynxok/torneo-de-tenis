import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Trophy, Building2, Phone, CreditCard, Award, Info, Calendar, User, Users, Shield, Tag, Sparkles, MapPin } from 'lucide-react';
import { useToast } from './ui/Toast';
import { Institution } from '../types';
import { NUMERIC_CATEGORIES } from '../utils/categories';
import { calculateAge, getAgeCategoryLabel } from '../utils/demographics';

interface AuthPageProps {
  onLoginSuccess: () => void;
  onDebugLogin?: () => void;
  initialClubId?: string;
  initialMode?: 'login' | 'register';
  initialRole?: 'player' | 'admin';
  onBackToLanding?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ 
  onLoginSuccess, 
  onDebugLogin, 
  initialClubId,
  initialMode,
  initialRole = 'player',
  onBackToLanding 
}) => {
  const [isLogin, setIsLogin] = useState(initialMode ? initialMode === 'login' : false);
  const [loading, setLoading] = useState(false);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    // Auth & Access
    email: '',
    password: '',
    role: initialRole as 'player' | 'admin',

    // Personal / Contact Data
    name: '',
    lastname: '',
    phone: '',
    dni: '',

    // Promo Code
    promo_code: '',

    // Club Specific Fields
    club_name: '',
    club_city: '',
    club_address: '',
    club_role_title: 'Capitán de Tenis',
    club_courts_count: 3,
    club_surface: 'Polvo de ladrillo',

    // Player Specific Fields
    gender: 'masculino',
    birth_date: '',
    category: '',
    institution_id: initialClubId || ''
  });

  useEffect(() => {
    // Check URL parameters for club or mode
    const params = new URLSearchParams(window.location.search);
    const clubParam = params.get('club') || initialClubId;
    const modeParam = params.get('mode') || initialMode;
    const roleParam = params.get('role') || initialRole;

    if (roleParam === 'admin' || roleParam === 'player') {
      setFormData(prev => ({ ...prev, role: roleParam }));
    }

    if (clubParam) {
      setFormData(prev => ({ ...prev, institution_id: clubParam, role: 'player' }));
      setIsLogin(false); // If arriving via club invite link, prioritize registration
    } else if (modeParam === 'login') {
      setIsLogin(true);
    } else if (modeParam === 'register') {
      setIsLogin(false);
    } else {
      setIsLogin(true);
    }

    api.institutions.getAll().then(setInstitutions).catch(err => console.error("Error loading clubs", err));
  }, [initialClubId, initialMode, initialRole]);

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

    // --- REGISTRATION: CLUB / ORGANIZADOR ---
    if (formData.role === 'admin') {
      const cleanClubName = formData.club_name.trim();
      const cleanClubCity = formData.club_city.trim();
      const cleanName = formData.name.trim();
      const cleanLastname = formData.lastname.trim();
      const cleanPhone = formData.phone.trim();
      const cleanEmail = formData.email.trim();
      const cleanPromo = formData.promo_code.trim().toUpperCase();

      if (!cleanClubName || cleanClubName.length < 3) {
        addToast('Por favor ingresa el Nombre del Club o Complejo (mínimo 3 letras).', 'error');
        return;
      }

      if (!cleanClubCity || cleanClubCity.length < 3) {
        addToast('Por favor ingresa la Ciudad y Provincia del Club.', 'error');
        return;
      }

      if (!cleanName || cleanName.length < 2) {
        addToast('Por favor ingresa el Nombre del Responsable.', 'error');
        return;
      }

      if (!cleanLastname || cleanLastname.length < 2) {
        addToast('Por favor ingresa el Apellido del Responsable.', 'error');
        return;
      }

      if (!cleanPhone || cleanPhone.length < 6) {
        addToast('Por favor ingresa el WhatsApp / Teléfono de contacto oficial.', 'error');
        return;
      }

      setLoading(true);
      try {
        let isApprovedImmediately = false;
        let promoValidation: any = null;

        // 1. Validar código promocional si fue provisto
        if (cleanPromo) {
          promoValidation = await api.promoCodes.validatePromoCode(cleanPromo);
          if (promoValidation.valid) {
            isApprovedImmediately = true;
          }
        }

        // 2. Crear usuario Administrador con el estado de aprobación correspondiente
        const { data: authData, error: authError } = await api.auth.signUp(cleanEmail, formData.password, {
          name: cleanName,
          lastname: cleanLastname,
          phone: cleanPhone,
          role: 'admin',
          is_approved: isApprovedImmediately,
          is_member: true,
          member_status: isApprovedImmediately ? 'active' : 'pending'
        });

        if (authError) throw authError;
        const newUserId = authData?.user?.id;

        // 3. Crear Institución en Base de Datos
        let createdInstId: string | null = null;
        try {
          const newInst = await api.institutions.create({
            name: cleanClubName,
            city: cleanClubCity,
            address: formData.club_address.trim() || undefined,
            phone: cleanPhone,
            email: cleanEmail
          });
          if (newInst?.id) {
            createdInstId = newInst.id;
          }
        } catch (instErr) {
          console.warn("Institution creation warning:", instErr);
        }

        // 4. Vincular institución creada al perfil del administrador
        if (newUserId && createdInstId) {
          try {
            await api.auth.updateProfile(newUserId, {
              institution_id: createdInstId,
              is_approved: isApprovedImmediately,
              member_status: isApprovedImmediately ? 'active' : 'pending',
              role: 'admin'
            });
          } catch (linkErr) {
            console.warn("Profile institution link warning:", linkErr);
          }
        }

        // 5. Canjear código promocional (uso único) si fue válido
        if (newUserId && cleanPromo && promoValidation?.valid) {
          try {
            await api.promoCodes.redeemPromoCode(cleanPromo, newUserId);
            addToast(`🎉 ¡Código ${cleanPromo} activado! Tu club ha sido habilitado de inmediato.`, 'success');
          } catch (promoErr: any) {
            console.warn("Promo code redemption error:", promoErr);
          }
        } else if (cleanPromo && !promoValidation?.valid) {
          addToast(`Aviso: ${promoValidation?.message || 'Código inválido o ya utilizado'}. Tu club fue creado y quedó pendiente de aprobación por el equipo de Smash.`, 'info');
        } else {
          addToast('📋 ¡Solicitud de club recibida! Como no ingresaste código de invitación, tu sede será revisada y aprobada por nuestro equipo a la brevedad.', 'success');
        }

        setIsLogin(true);
      } catch (err: any) {
        addToast(err.message || 'Error al registrar el club', 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    // --- REGISTRATION: JUGADOR / TENISTA ---
    const cleanName = formData.name.trim();
    const cleanLastname = formData.lastname.trim();
    const cleanDni = formData.dni.trim();
    const cleanPhone = formData.phone.trim();
    const cleanEmail = formData.email.trim();
    const cleanPromo = formData.promo_code.trim().toUpperCase();

    if (!cleanName || cleanName.length < 2) {
      addToast('Por favor ingresa tu Nombre (mínimo 2 letras).', 'error');
      return;
    }

    if (!cleanLastname || cleanLastname.length < 2) {
      addToast('Por favor ingresa tu Apellido.', 'error');
      return;
    }

    if (!cleanDni || cleanDni.length < 6) {
      addToast('Por favor ingresa tu DNI o documento válido.', 'error');
      return;
    }

    if (!cleanPhone || cleanPhone.length < 6) {
      addToast('Por favor ingresa tu número de WhatsApp / Teléfono.', 'error');
      return;
    }

    if (!formData.birth_date) {
      addToast('Por favor ingresa tu Fecha de Nacimiento.', 'error');
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
      const { data: authData, error } = await api.auth.signUp(cleanEmail, formData.password, {
        name: cleanName,
        lastname: cleanLastname,
        phone: cleanPhone,
        dni: cleanDni,
        gender: formData.gender || 'masculino',
        birth_date: formData.birth_date || null,
        category: formData.category,
        institution_id: selectedClubId,
        role: 'player',
        is_approved: false,
        is_member: false,
        member_status: selectedClubId ? 'pending' : 'active'
      });
      if (error) throw error;

      // Canje opcional de código si es jugador
      if (authData?.user?.id && cleanPromo) {
        try {
          await api.promoCodes.redeemPromoCode(cleanPromo, authData.user.id);
        } catch (ign) {}
      }

      addToast('¡Registro exitoso! Tu solicitud y categoría han sido enviadas para su validación.', 'success');
      setIsLogin(true);
    } catch (err: any) {
      addToast(err.message || 'Error de autenticación', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark flex flex-col items-center justify-center p-4">
      {onBackToLanding && (
        <button
          onClick={onBackToLanding}
          className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
        >
          ← Volver a la página principal / Conocer Smash
        </button>
      )}
      
      <div className="w-full max-w-lg bg-card border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/50 relative overflow-hidden my-4">

        <div className="flex flex-col items-center mb-6">
          <img
            src="/Smash.png"
            alt="Smash Tennis"
            className="h-28 sm:h-36 w-auto object-contain mb-2 drop-shadow-[0_0_15px_rgba(0,198,255,0.3)]"
          />
        </div>

        {/* ROLE SELECTOR TABS WHEN REGISTERING */}
        {!isLogin && (
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-sidebar border border-white/10 rounded-2xl">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'admin' })}
                className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  formData.role === 'admin'
                    ? 'bg-[#e15b34] text-white shadow-md shadow-[#e15b34]/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shield size={16} />
                <span>🛡️ Registrar mi Club</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'player' })}
                className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  formData.role === 'player'
                    ? 'bg-[#ccff00] text-slate-950 shadow-md shadow-[#ccff00]/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Trophy size={16} />
                <span>🏆 Soy Jugador</span>
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && formData.role === 'admin' && (
            /* --- FORMULARIO DE REGISTRO DE CLUB --- */
            <div className="space-y-3.5 animate-fade-in">
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
                <div className="text-[11px] font-bold text-[#e15b34] uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 size={14} /> 1. Datos del Club o Sede
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                    Nombre del Club / Complejo *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Club Tenis Parque España"
                    className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors text-sm"
                    required
                    value={formData.club_name}
                    onChange={e => setFormData({ ...formData, club_name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                      <MapPin size={12} className="text-primary" /> Ciudad y Provincia *
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Paraná, Entre Ríos"
                      className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors text-sm"
                      required
                      value={formData.club_city}
                      onChange={e => setFormData({ ...formData, club_city: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                      Dirección (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Av. Costanera 450"
                      className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors text-sm"
                      value={formData.club_address}
                      onChange={e => setFormData({ ...formData, club_address: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                      Cant. Canchas
                    </label>
                    <select
                      className="w-full bg-sidebar border border-white/10 rounded-xl p-2.5 text-white focus:border-primary focus:outline-none text-xs cursor-pointer"
                      value={formData.club_courts_count}
                      onChange={e => setFormData({ ...formData, club_courts_count: Number(e.target.value) })}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 16, 20].map(n => (
                        <option key={n} value={n}>{n} {n === 1 ? 'Cancha' : 'Canchas'}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                      Superficie Principal
                    </label>
                    <select
                      className="w-full bg-sidebar border border-white/10 rounded-xl p-2.5 text-white focus:border-primary focus:outline-none text-xs cursor-pointer"
                      value={formData.club_surface}
                      onChange={e => setFormData({ ...formData, club_surface: e.target.value })}
                    >
                      <option value="Polvo de ladrillo">Polvo de ladrillo</option>
                      <option value="Cemento / Rápida">Cemento / Rápida</option>
                      <option value="Césped sintético">Césped sintético</option>
                      <option value="Pádel Cristal / Muro">Pádel Cristal / Muro</option>
                      <option value="Mixto (Tenis + Pádel)">Mixto (Tenis + Pádel)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
                <div className="text-[11px] font-bold text-[#ccff00] uppercase tracking-wider flex items-center gap-1.5">
                  <User size={14} /> 2. Datos del Responsable / Organizador
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Martín"
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
                      placeholder="Ej: González"
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
                      Cargo / Función
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Capitán de Tenis"
                      className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors text-sm"
                      value={formData.club_role_title}
                      onChange={e => setFormData({ ...formData, club_role_title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                      WhatsApp Oficial *
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

                {/* CÓDIGO PROMOCIONAL PARA CLUBES */}
                <div>
                  <label className="block text-[11px] font-semibold text-purple-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Tag size={12} className="text-purple-400" /> Código Promocional / Convenio (Opcional)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ej: LANZAMIENTO2026, LYNXCLUB"
                      className="w-full bg-sidebar border border-purple-500/30 focus:border-purple-400 rounded-xl p-3 text-white focus:outline-none transition-colors text-sm font-mono uppercase"
                      value={formData.promo_code}
                      onChange={e => setFormData({ ...formData, promo_code: e.target.value })}
                    />
                    <Sparkles size={14} className="absolute right-3.5 top-3.5 text-purple-400 pointer-events-none" />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Si tu club tiene un código de invitación o convenio, ingrésalo aquí para activar beneficios exclusivos.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isLogin && formData.role === 'player' && (
            /* --- FORMULARIO DE REGISTRO DE JUGADOR --- */
            <div className="space-y-3.5 animate-fade-in">
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

              {/* Rama / Género y Fecha de Nacimiento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                    <User size={13} className="text-primary" /> Rama / Género *
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-sidebar border border-white/10 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, gender: 'masculino' })}
                      className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                        formData.gender === 'masculino'
                          ? 'bg-blue-500 text-white shadow-md shadow-blue-500/25'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Masculino
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, gender: 'femenino' })}
                      className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                        formData.gender === 'femenino'
                          ? 'bg-pink-500 text-white shadow-md shadow-pink-500/25'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Femenino
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1"><Calendar size={13} className="text-primary" /> F. Nacimiento *</span>
                    {formData.birth_date && (
                      <span className="text-[10px] text-green-400 font-bold">
                        {getAgeCategoryLabel(formData.birth_date)}
                      </span>
                    )}
                  </label>
                  <input
                    type="date"
                    className="w-full bg-sidebar border border-white/10 rounded-xl p-2.5 text-white focus:border-primary focus:outline-none transition-colors text-xs"
                    required
                    value={formData.birth_date}
                    onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
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
                    La categoría seleccionada es de referencia y será validada por el organizador del club.
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

              {/* CÓDIGO PROMOCIONAL PARA JUGADORES */}
              <div>
                <label className="block text-[11px] font-semibold text-purple-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Tag size={12} className="text-purple-400" /> Código Promocional (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: BIENVENIDA"
                  className="w-full bg-sidebar border border-purple-500/30 focus:border-purple-400 rounded-xl p-3 text-white focus:outline-none transition-colors text-sm font-mono uppercase"
                  value={formData.promo_code}
                  onChange={e => setFormData({ ...formData, promo_code: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* CREDENCIALES COMUNES: EMAIL Y PASSWORD */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                Correo Electrónico *
              </label>
              <input
                type="email"
                placeholder="tuemail@ejemplo.com"
                className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors text-sm"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                Contraseña *
              </label>
              <input
                type="password"
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors text-sm"
                required
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full font-bold py-3.5 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
              !isLogin && formData.role === 'admin'
                ? 'bg-gradient-to-r from-[#e15b34] to-[#ff7c4d] text-white shadow-[#e15b34]/30 hover:scale-[1.01]'
                : !isLogin && formData.role === 'player'
                ? 'bg-[#ccff00] hover:bg-[#b8e600] text-slate-950 shadow-[#ccff00]/25 hover:scale-[1.01]'
                : 'bg-gradient-to-r from-primary to-primary-hover text-white shadow-primary/25 hover:scale-[1.01]'
            }`}
          >
            {loading 
              ? 'Procesando...' 
              : isLogin 
              ? 'Iniciar Sesión' 
              : formData.role === 'admin' 
              ? 'Crear Club Gratis' 
              : 'Registrarme como Jugador'}
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
          <img src="/lynx-logo-blanco.png" alt="Lynx Consulting" className="h-6 w-auto" />
        </div>
      </div>
    </div>
  );
};
