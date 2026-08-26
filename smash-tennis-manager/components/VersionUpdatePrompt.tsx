import React, { useEffect, useState } from 'react';
import { Sparkles, RefreshCw, X } from 'lucide-react';
import packageInfo from '../package.json';

export const VersionUpdatePrompt: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersion, setNewVersion] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const checkRemoteVersion = async () => {
    try {
      // Fetch version.json bypassing browser and HTTP cache
      const res = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.version && data.version !== packageInfo.version) {
          console.log(`🎾 [Smash PWA] Nueva versión detectada: v${data.version} (Actual: v${packageInfo.version})`);
          setNewVersion(data.version);
          setUpdateAvailable(true);
        }
      }
    } catch (e) {
      // Network check failed (silent offline fallback)
    }
  };

  useEffect(() => {
    // 1. Immediate initial check after 400ms
    const initialTimer = setTimeout(() => {
      checkRemoteVersion();
    }, 400);

    // 2. Periodic check every 20 seconds (fast update detection)
    const interval = setInterval(() => {
      checkRemoteVersion();
    }, 20 * 1000);

    // 3. Check whenever the user returns to the app / tab (crucial for mobile phones)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkRemoteVersion();
        // Also trigger service worker update check if supported
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistration().then(reg => {
            if (reg) reg.update();
          });
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 4. Listen for Service Worker updatefound event
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('🎾 [Smash PWA] Service Worker actualizado.');
      });
    }

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleApplyUpdate = async () => {
    setIsUpdating(true);
    try {
      // 1. Ask active service workers to skip waiting
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          await reg.update().catch(() => {});
        }
      }

      // 2. Clear old browser cache storage
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(key => caches.delete(key)));
      }

      // 3. Force clean reload with cache-busting timestamp
      window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
    } catch (err) {
      console.error("Error applying update:", err);
      window.location.reload();
    }
  };

  if (!updateAvailable || dismissed) return null;

  return (
    <aside
      aria-label="Notificación de actualización"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
    >
      <div className="bg-slate-900/95 border-2 border-primary/60 backdrop-blur-xl text-white p-3.5 rounded-2xl shadow-2xl shadow-primary/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
            <Sparkles size={18} className="text-primary animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
              <span>¡Nueva versión disponible!</span>
              <span className="text-[10px] font-mono bg-primary text-white px-1.5 py-0.2 rounded-full font-extrabold">
                v{newVersion || 'actualizada'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 truncate">
              Toca para cargar las últimas mejoras
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleApplyUpdate}
            disabled={isUpdating}
            className="px-3.5 py-2 bg-gradient-to-r from-primary to-primary-hover hover:brightness-110 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-primary/30 flex items-center gap-1.5 transition-all"
          >
            <RefreshCw size={13} className={isUpdating ? 'animate-spin' : ''} />
            {isUpdating ? 'Actualizando...' : 'Actualizar'}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            title="Posponer"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
