import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Trophy, Building2, Phone, CreditCard, Award, Info, Calendar, User, Users, Shield, Tag, Sparkles, MapPin, Eye, EyeOff, HelpCircle, Check, ArrowRight, ArrowLeft, GraduationCap, X } from 'lucide-react';
import { useToast } from './ui/Toast';
import { Institution } from '../types';
import { NUMERIC_CATEGORIES } from '../utils/categories';
import { calculateAge, getAgeCategoryLabel } from '../utils/demographics';
import { LocationSelector } from './LocationSelector';

interface AuthPageProps {
  onLoginSuccess: () => void;
  onDebugLogin?: () => void;
  initialClubId?: string;
  initialMode?: 'login' | 'register';
  initialRole?: 'player' | 'admin' | 'professor';
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
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [organizerAction, setOrganizerAction] = useState<'create_club' | 'join_club'>('join_club');
  const [registrationStep, setRegistrationStep] = useState<1 | 2 | 3>(1);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    // Auth & Access
    email: '',
    password: '',
    role: initialRole as 'player' | 'admin' | 'professor',

    // Personal / Contact Data
    name: '',
    lastname: '',
    phone: '',
    dni: '',

    // Location Data (User & Club)
    country: 'Argentina',
    province: '',
    city: '',

    // Promo Code
    promo_code: '',

    // Club Specific Fields
    club_name: '',
    club_country: 'Argentina',
    club_province: '',
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

    if (roleParam === 'admin' || roleParam === 'player' || roleParam === 'professor') {
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

    api.institutions.getAll().then(data => {
      setInstitutions(data.filter(i => i.is_active !== false));
    }).catch(err => console.error("Error loading clubs", err));
  }, [initialClubId, initialMode, initialRole]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = formData.email.trim();
    if (!cleanEmail) {
      addToast('Ingresá tu correo electrónico para recuperar tu cuenta.', 'error');
      return;
    }
    setLoading(true);
    try {
      const { error } = await api.auth.resetPasswordForEmail(cleanEmail);
      if (error) throw error;
      setResetSent(true);
      addToast('Te enviamos un enlace de recuperación a tu correo.', 'success');
    } catch (err: any) {
      addToast(err.message || 'Error al solicitar recuperación', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isForgotPassword) {
      return handleForgotPassword(e);
    }

    if (isLogin) {
      const cleanEmail = formData.email.trim();
      if (!cleanEmail || !formData.password) {
        addToast('Por favor completá todos los campos.', 'error');
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
      const cleanName = formData.name.trim();
      const cleanLastname = formData.lastname.trim();
      const cleanPhone = formData.phone.trim();
      const cleanEmail = formData.email.trim();

      if (!cleanName || cleanName.length < 2) {
        addToast('Por favor ingresa tu Nombre (mínimo 2 letras).', 'error');
        return;
      }

      if (!cleanLastname || cleanLastname.length < 2) {
        addToast('Por favor ingresa tu Apellido.', 'error');
        return;
      }

      if (!cleanPhone || cleanPhone.length < 6) {
        addToast('Por favor ingresa el WhatsApp / Teléfono de contacto oficial.', 'error');
        return;
      }

      if (!cleanEmail || !formData.password || formData.password.length < 6) {
        addToast('Por favor ingresa un Email válido y una Contraseña de al menos 6 caracteres.', 'error');
        return;
      }

      // CASO A: SUMARSE COMO ORGANIZADOR A UN CLUB EXISTENTE
      if (organizerAction === 'join_club') {
        if (!formData.institution_id) {
          addToast('Por favor selecciona el Club o Institución al que perteneces.', 'error');
          return;
        }

        const targetClub = institutions.find(i => i.id === formData.institution_id);
        const targetClubName = targetClub?.name || 'la institución seleccionada';

        setLoading(true);
        try {
          const { error: authError } = await api.auth.signUp(cleanEmail, formData.password, {
            name: cleanName,
            lastname: cleanLastname,
            phone: cleanPhone,
            role: 'admin',
            institution_id: formData.institution_id,
            is_approved: false, // Debe ser validado y aprobado por el responsable de esa institución
            is_member: true,
            member_status: 'pending'
          });

          if (authError) throw authError;

          addToast(`📋 ¡Solicitud enviada! El responsable principal de "${targetClubName}" debe autorizar tu acceso desde su panel de control.`, 'success');
          setIsLogin(true);
        } catch (err: any) {
          addToast(err.message || 'Error al enviar la solicitud de organizador', 'error');
        } finally {
          setLoading(false);
        }
        return;
      }

      // CASO B: CREAR NUEVA INSTITUCIÓN / CLUB (FUNDADOR)
      const cleanClubName = formData.club_name.trim();
      const cleanClubCountry = (formData.club_country || formData.country || 'Argentina').trim();
      const cleanClubProvince = formData.club_province.trim();
      const cleanClubCity = formData.club_city.trim();
      const cleanPromo = formData.promo_code.trim().toUpperCase();

      if (!cleanClubName || cleanClubName.length < 3) {
        addToast('Por favor ingresa el Nombre del Club o Complejo (mínimo 3 letras).', 'error');
        return;
      }

      if (!cleanClubProvince || !cleanClubCity) {
        addToast('Por favor selecciona País, Provincia y Ciudad del Club.', 'error');
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
          country: cleanClubCountry,
          province: cleanClubProvince,
          city: cleanClubCity,
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
            country: cleanClubCountry,
            province: cleanClubProvince,
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

    // --- REGISTRATION: JUGADOR / TENISTA / PROFESOR ---
    const cleanName = formData.name.trim();
    const cleanLastname = formData.lastname.trim();
    const cleanDni = formData.dni.trim();
    const cleanPhone = formData.phone.trim();
    const cleanEmail = formData.email.trim();
    const cleanCountry = (formData.country || 'Argentina').trim();
    const cleanProvince = formData.province.trim();
    const cleanCity = formData.city.trim();
    const cleanPromo = formData.promo_code.trim().toUpperCase();

    if (!cleanName || cleanName.length < 2) {
      addToast('Por favor ingresá tu Nombre (mínimo 2 letras).', 'error');
      return;
    }

    if (!cleanLastname || cleanLastname.length < 2) {
      addToast('Por favor ingresá tu Apellido.', 'error');
      return;
    }

    if (!cleanEmail || !formData.password) {
      addToast('Por favor ingresá tu correo y contraseña.', 'error');
      return;
    }

    if (formData.password.length < 6) {
      addToast('La contraseña debe tener al menos 6 caracteres.', 'error');
      return;
    }

    if (formData.role === 'player') {
      if (!formData.birth_date) {
        addToast('Por favor ingresá tu Fecha de Nacimiento.', 'error');
        return;
      }

      if (!formData.category) {
        addToast('Por favor seleccioná tu Categoría actual estimada.', 'error');
        return;
      }
    }

    if (!cleanProvince || !cleanCity) {
      addToast('Por favor seleccioná País, Provincia y Ciudad / Localidad.', 'error');
      return;
    }

    if (!formData.institution_id) {
      addToast(formData.role === 'professor' ? 'Por favor indicá tu Club o Sede donde das clases.' : 'Por favor indicá tu Club Principal o seleccioná "Jugador Independiente".', 'error');
      return;
    }

    const selectedClubId = formData.institution_id === 'none' ? null : formData.institution_id;
    const targetRole = formData.role === 'professor' ? 'professor' : 'player';

    setLoading(true);
    try {
      const { data: authData, error } = await api.auth.signUp(cleanEmail, formData.password, {
        name: cleanName,
        lastname: cleanLastname,
        phone: cleanPhone || undefined,
        dni: cleanDni || undefined,
        country: cleanCountry,
        province: cleanProvince,
        city: cleanCity,
        gender: formData.gender || 'masculino',
        birth_date: formData.birth_date || null,
        category: formData.category || '4ta',
        institution_id: selectedClubId,
        role: targetRole,
        is_approved: false,
        is_member: false,
        member_status: selectedClubId ? 'pending' : 'active'
      });
      if (error) throw error;

      // Canje opcional de código si fue provisto
      if (authData?.user?.id && cleanPromo) {
        try {
          await api.promoCodes.redeemPromoCode(cleanPromo, authData.user.id);
        } catch (ign) {}
      }

      if (targetRole === 'professor') {
        addToast('¡Solicitud de profesor enviada! La administración de tu club validará tu perfil.', 'success');
      } else {
        addToast('¡Registro exitoso! Ya podés acceder a tu panel de jugador.', 'success');
      }
      setIsLogin(true);
      setRegistrationStep(1);
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
            <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-sidebar border border-white/10 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, role: 'admin' });
                  setRegistrationStep(1);
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  formData.role === 'admin'
                    ? 'bg-[#e15b34] text-white shadow-md shadow-[#e15b34]/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shield size={14} className="shrink-0" />
                <span className="truncate">Organizador</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, role: 'professor' });
                  setRegistrationStep(1);
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  formData.role === 'professor'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <GraduationCap size={14} className="shrink-0" />
                <span className="truncate">Profesor</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, role: 'player' });
                  setRegistrationStep(1);
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  formData.role === 'player'
                    ? 'bg-[#ccff00] text-slate-950 shadow-md shadow-[#ccff00]/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Trophy size={14} className="shrink-0" />
                <span className="truncate">Jugador</span>
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && formData.role === 'admin' && (
            /* --- FORMULARIO DE REGISTRO DE ORGANIZADOR / CLUB --- */
            <div className="space-y-3.5 animate-fade-in">
              {/* Sub-selector: Sumarme a Club Existente (Default) vs Crear Nueva Institución */}
              <div className="flex p-1 bg-black/40 rounded-xl border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setOrganizerAction('join_club')}
                  className={`flex-1 py-2 px-2.5 rounded-lg font-bold transition-all text-center ${
                    organizerAction === 'join_club'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🤝 Sumarme a Club Existente
                </button>
                <button
                  type="button"
                  onClick={() => setOrganizerAction('create_club')}
                  className={`flex-1 py-2 px-2.5 rounded-lg font-bold transition-all text-center ${
                    organizerAction === 'create_club'
                      ? 'bg-[#e15b34] text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ➕ Crear Nueva Institución
                </button>
              </div>

              {organizerAction === 'join_club' ? (
                /* --- CASO 1: SUMARME A CLUB EXISTENTE --- */
                <div className="p-3.5 bg-white/[0.02] border border-purple-500/30 rounded-2xl space-y-3">
                  <div className="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 size={14} /> 1. Selecciona el Club o Institución
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                      Club / Sede Oficial *
                    </label>
                    <select
                      required
                      className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-purple-400 focus:outline-none transition-colors text-sm"
                      value={formData.institution_id}
                      onChange={e => setFormData({ ...formData, institution_id: e.target.value })}
                    >
                      <option value="">-- Selecciona el Club / Institución --</option>
                      {institutions.map(inst => (
                        <option key={inst.id} value={inst.id}>
                          {inst.name} {inst.city ? `(${inst.city})` : ''}
                        </option>
                      ))}
                    </select>

                    {/* Botón de redirección si el club no figura en la lista */}
                    <div className="mt-2.5 p-2 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">¿Tu club no figura en la lista?</span>
                      <button
                        type="button"
                        onClick={() => setOrganizerAction('create_club')}
                        className="text-[#e15b34] font-bold hover:underline cursor-pointer"
                      >
                        + Crear Nueva Institución
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] font-bold text-[#ccff00] uppercase tracking-wider flex items-center gap-1.5 pt-2 border-t border-white/5">
                    <User size={14} /> 2. Tus Datos de Organizador
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Martín"
                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-purple-400 focus:outline-none transition-colors text-sm"
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
                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-purple-400 focus:outline-none transition-colors text-sm"
                        required
                        value={formData.lastname}
                        onChange={e => setFormData({ ...formData, lastname: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                        Cargo / Rol en el Club
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Planillero / Co-Organizador"
                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-purple-400 focus:outline-none transition-colors text-sm"
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
                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-purple-400 focus:outline-none transition-colors text-sm"
                        required
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-200 leading-relaxed">
                    🛡️ <strong>Aprobación requerida:</strong> Al sumarte a un club existente, el responsable / administrador principal de la institución deberá validar tu solicitud desde su panel de control para habilitar tus permisos de organizador.
                  </div>
                </div>
              ) : (
                /* --- CASO 2: CREAR NUEVA INSTITUCIÓN (FUNDADOR) --- */
                <>
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
                    <div className="text-[11px] font-bold text-[#e15b34] uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 size={14} /> 1. Datos de la Nueva Institución
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

                    <LocationSelector
                      country={formData.club_country}
                      province={formData.club_province}
                      city={formData.club_city}
                      required
                      onChange={({ country, province, city }) => {
                        setFormData({
                          ...formData,
                          club_country: country,
                          club_province: province,
                          club_city: city
                        });
                      }}
                    />

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
                      <User size={14} /> 2. Datos del Responsable Principal
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
                          placeholder="Ej: Presidente / Capitán"
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
                        Si tu club tiene un código de invitación o convenio, ingrésalo aquí para activar beneficios exclusivos y alta inmediata.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {!isLogin && (formData.role === 'player' || formData.role === 'professor') && (
            /* --- FORMULARIO DE REGISTRO EN 3 PASOS (JUGADOR / PROFESOR) --- */
            <div className="space-y-4 animate-fade-in">
              {/* Step indicator header */}
              <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    registrationStep === 1 ? 'bg-primary text-white' : 'bg-primary/20 text-primary'
                  }`}>1</span>
                  <span className={registrationStep === 1 ? 'text-white' : 'text-slate-400'}>Cuenta</span>
                </div>
                <div className="w-8 h-px bg-white/10" />
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    registrationStep === 2 ? 'bg-primary text-white' : registrationStep > 2 ? 'bg-primary/20 text-primary' : 'bg-white/10 text-slate-500'
                  }`}>2</span>
                  <span className={registrationStep === 2 ? 'text-white' : 'text-slate-400'}>
                    {formData.role === 'professor' ? 'Perfil' : 'Categoría'}
                  </span>
                </div>
                <div className="w-8 h-px bg-white/10" />
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    registrationStep === 3 ? 'bg-primary text-white' : 'bg-white/10 text-slate-500'
                  }`}>3</span>
                  <span className={registrationStep === 3 ? 'text-white' : 'text-slate-400'}>Club & Sede</span>
                </div>
              </div>

              {/* PASO 1: Nombre, Apellido, Email, Contraseña */}
              {registrationStep === 1 && (
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

                  <div>
                    <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      placeholder="tuemail@ejemplo.com"
                      autoComplete="username email"
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
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        autoComplete="new-password"
                        className="w-full bg-sidebar border border-white/10 rounded-xl p-3 pr-10 text-white focus:border-primary focus:outline-none transition-colors text-sm"
                        required
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white p-1 rounded-lg transition-colors"
                        title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!formData.name.trim() || formData.name.trim().length < 2) {
                        addToast('Por favor ingresá tu Nombre.', 'error');
                        return;
                      }
                      if (!formData.lastname.trim() || formData.lastname.trim().length < 2) {
                        addToast('Por favor ingresá tu Apellido.', 'error');
                        return;
                      }
                      if (!formData.email.trim() || !formData.email.includes('@')) {
                        addToast('Por favor ingresá un correo electrónico válido.', 'error');
                        return;
                      }
                      if (!formData.password || formData.password.length < 6) {
                        addToast('La contraseña debe tener al menos 6 caracteres.', 'error');
                        return;
                      }
                      setRegistrationStep(2);
                    }}
                    className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2 text-sm mt-4 cursor-pointer"
                  >
                    <span>Siguiente: {formData.role === 'professor' ? 'Datos del Perfil' : 'Categoría y Rama'}</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}

              {/* PASO 2: Categoría + Ayuda "¿No sabés tu categoría?", Rama y Fecha de Nacimiento */}
              {registrationStep === 2 && (
                <div className="space-y-3.5 animate-fade-in">
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
                        <span className="flex items-center gap-1"><Calendar size={13} className="text-primary" /> F. Nacimiento (dd/mm/aaaa) *</span>
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

                  {/* Categoría Selector con Modal de Ayuda */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5">
                        <Award size={14} className="text-primary" /> {formData.role === 'professor' ? 'Tu Nivel de Juego Referencial' : 'Tu Categoría de Juego *'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowCategoryModal(true)}
                        className="text-xs text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <HelpCircle size={13} />
                        <span>¿No sabés tu categoría?</span>
                      </button>
                    </div>

                    <select
                      className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors text-sm cursor-pointer"
                      required={formData.role === 'player'}
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="" disabled>-- Seleccioná tu Categoría Inicial * --</option>
                      {NUMERIC_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>
                          {cat} Categoría
                        </option>
                      ))}
                    </select>

                    <div className="flex items-start gap-1.5 mt-1.5 text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg">
                      <Info size={14} className="shrink-0 mt-0.5" />
                      <span>
                        La categoría seleccionada es orientativa y será validada por el fiscalizador o tu profesor en el primer torneo.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setRegistrationStep(1)}
                      className="py-3 px-4 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-white/5 border border-white/10 flex items-center gap-1.5"
                    >
                      <ArrowLeft size={14} /> Atrás
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (formData.role === 'player' && !formData.birth_date) {
                          addToast('Por favor ingresá tu fecha de nacimiento.', 'error');
                          return;
                        }
                        if (formData.role === 'player' && !formData.category) {
                          addToast('Por favor seleccioná tu categoría inicial.', 'error');
                          return;
                        }
                        setRegistrationStep(3);
                      }}
                      className="flex-1 py-3.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2 text-sm cursor-pointer"
                    >
                      <span>Siguiente: Club y Ubicación</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* PASO 3: Club, Ubicación y Envío */}
              {registrationStep === 3 && (
                <div className="space-y-3.5 animate-fade-in">
                  {/* País, Provincia y Ciudad */}
                  <LocationSelector
                    country={formData.country}
                    province={formData.province}
                    city={formData.city}
                    required
                    onChange={({ country, province, city }) => {
                      setFormData({
                        ...formData,
                        country,
                        province,
                        city
                      });
                    }}
                  />

                  {/* Institution / Club Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Building2 size={14} className="text-primary" /> {formData.role === 'professor' ? 'Club o Sede donde das clases *' : 'Tu Club Principal *'}
                    </label>
                    <select
                      className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors text-sm cursor-pointer"
                      required
                      value={formData.institution_id}
                      onChange={e => setFormData({ ...formData, institution_id: e.target.value })}
                    >
                      <option value="" disabled>-- Seleccioná tu Club o Condición * --</option>
                      {formData.role === 'player' && (
                        <option value="none">🎾 Jugador Independiente / Sin Club</option>
                      )}
                      {institutions.map(inst => (
                        <option key={inst.id} value={inst.id}>
                          {inst.name} ({inst.city})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* CÓDIGO PROMOCIONAL OPCIONAL */}
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

                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-[11px] text-slate-300 leading-relaxed">
                    💡 <strong>Registro ágil:</strong> Tu DNI y teléfono se pedirán únicamente al inscribirte a tu primer torneo oficial.
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setRegistrationStep(2)}
                      className="py-3 px-4 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-white/5 border border-white/10 flex items-center gap-1.5"
                    >
                      <ArrowLeft size={14} /> Atrás
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className={`flex-1 font-bold py-3.5 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
                        formData.role === 'professor'
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25'
                          : 'bg-[#ccff00] hover:bg-[#b8e600] text-slate-950 shadow-[#ccff00]/25'
                      }`}
                    >
                      {loading
                        ? 'Creando cuenta...'
                        : formData.role === 'professor'
                        ? 'Completar Registro de Profesor'
                        : 'Completar Registro de Jugador'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CREDENCIALES COMUNES PARA LOGIN Y RECUPERACIÓN */}
          {(isLogin || (!isLogin && formData.role === 'admin')) && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  placeholder="tuemail@ejemplo.com"
                  autoComplete="username email"
                  className="w-full bg-sidebar border border-white/10 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors text-sm"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              {!isForgotPassword && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider">
                      Contraseña *
                    </label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setResetSent(false);
                        }}
                        className="text-[11px] text-primary hover:underline font-medium"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      autoComplete={isLogin ? 'current-password' : 'new-password'}
                      className="w-full bg-sidebar border border-white/10 rounded-xl p-3 pr-10 text-white focus:border-primary focus:outline-none transition-colors text-sm"
                      required
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white p-1 rounded-lg transition-colors"
                      title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {isForgotPassword && resetSent && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs">
                  ¡Listo! Revisá tu casilla de correo para restablecer tu contraseña.
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full font-bold py-3.5 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
                  isForgotPassword
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/25 hover:scale-[1.01]'
                    : !isLogin && formData.role === 'admin'
                    ? 'bg-gradient-to-r from-[#e15b34] to-[#ff7c4d] text-white shadow-[#e15b34]/30 hover:scale-[1.01]'
                    : 'bg-gradient-to-r from-primary to-primary-hover text-white shadow-primary/25 hover:scale-[1.01]'
                }`}
              >
                {loading 
                  ? 'Procesando...' 
                  : isForgotPassword
                  ? 'Enviar enlace de recuperación'
                  : isLogin 
                  ? 'Iniciar Sesión' 
                  : 'Crear Club Gratis'}
              </button>
            </div>
          )}
        </form>

        {/* MODAL DE AYUDA: ¿NO SABÉS TU CATEGORÍA? */}
        {showCategoryModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-card border border-white/15 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-primary/20 text-primary">
                    <Award size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Guía de Categorías</h3>
                    <p className="text-xs text-muted">Elegí la que mejor describe tu nivel actual</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 custom-scrollbar text-xs">
                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="font-bold text-primary text-sm mb-0.5">1ra y 2da Categoría</div>
                  <p className="text-slate-300">Jugadores de alto rendimiento, ex-profesionales o federados de máxima exigencia. Ritmo muy alto y control total de efectos.</p>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="font-bold text-emerald-400 text-sm mb-0.5">3ra y 4ta Categoría</div>
                  <p className="text-slate-300">Jugadores avanzados / intermedios con experiencia competitiva sólida, técnica regular en todos los golpes y buena consistencia.</p>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="font-bold text-amber-400 text-sm mb-0.5">5ta y 6ta Categoría</div>
                  <p className="text-slate-300">Nivel intermedio recreativo. Pelotean con regularidad, dominan el saque básico y juegan torneos de club frecuentemente.</p>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="font-bold text-sky-400 text-sm mb-0.5">7ma Categoría / Inicial</div>
                  <p className="text-slate-300">Iniciación deportiva y primeros torneos. Perfecto si recién empezás a competir en partidos de singles o dobles.</p>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 text-center mb-8 space-y-2">
          {isForgotPassword ? (
            <button
              onClick={() => setIsForgotPassword(false)}
              className="text-muted hover:text-primary text-sm transition-colors"
            >
              ← Volver al inicio de sesión
            </button>
          ) : (
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setIsForgotPassword(false);
              }}
              className="text-muted hover:text-primary text-sm transition-colors"
            >
              {isLogin ? '¿No tenés cuenta? Registrate acá' : '¿Ya tenés cuenta? Iniciá Sesión'}
            </button>
          )}
        </div>

        {/* FOOTER */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
          <span className="text-xs text-muted">Desarrollado por</span>
          <a href="https://www.lnx.com.ar" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity inline-flex items-center">
            <img src="/lynx-logo-blanco.png" alt="LYNX" className="h-6 w-auto object-contain" />
          </a>
        </div>
      </div>
    </div>
  );
};
