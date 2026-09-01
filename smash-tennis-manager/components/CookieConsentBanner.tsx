import React, { useEffect, useState } from 'react';
import { Cookie, ShieldCheck, Check, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { soundEffects } from '../services/soundEffects';

export const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Comprobar si ya existe consentimiento registrado
    try {
      const storedConsent = localStorage.getItem('smash_cookie_consent');
      if (storedConsent) return;

      // Comprobar también en cookies
      const cookies = document.cookie ? document.cookie.split(';') : [];
      const hasCookieConsent = cookies.some(c => c.trim().startsWith('smash_cookie_consent='));
      if (hasCookieConsent) return;

      // Mostrar el banner tras un breve retardo para una carga fluida
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1200);

      return () => clearTimeout(timer);
    } catch (e) {
      // Fallback silencioso en entornos restringidos
    }
  }, []);

  const saveConsent = (level: 'all' | 'essential') => {
    try {
      localStorage.setItem('smash_cookie_consent', level);
      localStorage.setItem('smash_cookie_consent_date', new Date().toISOString());

      // Guardar cookie válida por 1 año (365 días)
      const maxAge = 365 * 24 * 60 * 60;
      document.cookie = `smash_cookie_consent=${level}; max-age=${maxAge}; path=/; SameSite=Lax`;
    } catch (e) {}

    soundEffects.playScoreBeep();
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-lg z-[90] animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-950/95 backdrop-blur-xl border border-primary/30 hover:border-primary/50 rounded-2xl shadow-2xl shadow-black/80 p-4 sm:p-5 text-white space-y-3 relative overflow-hidden">
        
        {/* Glow de fondo */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/15 rounded-full blur-2xl pointer-events-none -z-0"></div>

        {/* Encabezado */}
        <div className="flex items-start gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0 shadow-md shadow-primary/10">
            <Cookie size={20} className="animate-pulse" />
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-white tracking-tight flex items-center gap-1.5">
                Privacidad y Cookies
              </h4>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                <ShieldCheck size={11} /> 100% Seguras
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Utilizamos cookies técnicas y almacenamiento local estrictamente necesarios para mantener tu sesión segura, recordar tus preferencias y avisarte de mejoras en la plataforma.
            </p>
          </div>
        </div>

        {/* Desplegable de Detalles / Transparencia */}
        {showDetails && (
          <div className="p-3 bg-black/40 border border-white/10 rounded-xl text-[11px] text-slate-300 space-y-2 animate-in fade-in duration-200">
            <div className="flex items-start gap-2">
              <Lock size={13} className="text-primary shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Cookies Esenciales:</strong> Autenticación en Supabase, seguridad de cuenta y sincronización de estado de partidos en tiempo real.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Check size={13} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Preferencias & Novedades:</strong> Guardar si ya viste los avisos semanales de torneos para no interrumpirte.
              </div>
            </div>
            <p className="text-[10px] text-slate-400 pt-1 border-t border-white/5 italic">
              * No utilizamos cookies de terceros para publicidad invasiva ni comercializamos datos personales.
            </p>
          </div>
        )}

        {/* Botones de Acción */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1 relative z-10">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-[11px] text-slate-400 hover:text-primary transition-colors flex items-center gap-1 self-start sm:self-center font-medium"
          >
            {showDetails ? (
              <>Ocultar detalles <ChevronUp size={13} /></>
            ) : (
              <>Ver qué cookies usamos <ChevronDown size={13} /></>
            )}
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => saveConsent('essential')}
              className="flex-1 sm:flex-none px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-center"
            >
              Solo esenciales
            </button>
            <button
              onClick={() => saveConsent('all')}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black text-slate-950 bg-primary hover:bg-primary-hover shadow-lg shadow-primary/25 hover:brightness-110 transition-all text-center flex items-center justify-center gap-1.5"
            >
              <Check size={14} /> Aceptar todas
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
