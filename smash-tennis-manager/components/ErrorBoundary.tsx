import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary Uncaught Exception]:', error, errorInfo);

    // Auto-recuperación si es un error de script desfasado o variable no encontrada
    const errorMessage = error?.message || '';
    const isChunkOrVariableError = 
      errorMessage.includes("Can't find variable") || 
      errorMessage.includes("Failed to fetch dynamically imported module") ||
      errorMessage.includes("is not defined");

    if (isChunkOrVariableError) {
      const autoRecoverKey = 'smash_auto_recovered_error';
      const lastRecover = sessionStorage.getItem(autoRecoverKey);
      // Auto-recargar una vez limpiando la caché si ocurrió hace más de 15 segundos
      if (!lastRecover || Date.now() - parseInt(lastRecover, 10) > 15000) {
        sessionStorage.setItem(autoRecoverKey, Date.now().toString());
        this.cleanCacheAndHardReload();
      }
    }
  }

  private cleanCacheAndHardReload = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          await reg.unregister().catch(() => {});
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch (e) {
      console.warn('Error clearing caches during recovery:', e);
    }
    // Hard reload con parámetro anti-caché
    const cleanUrl = window.location.origin + window.location.pathname + window.location.search;
    const separator = cleanUrl.includes('?') ? '&' : '?';
    window.location.replace(`${cleanUrl}${separator}_cb=${Date.now()}`);
  };

  private handleReset = () => {
    this.cleanCacheAndHardReload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[350px] w-full flex flex-col items-center justify-center p-6 text-center bg-card border border-red-500/20 rounded-2xl shadow-xl space-y-4 my-6">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <AlertTriangle size={28} />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-base font-bold text-white">
              {this.props.fallbackTitle || 'Ocurrió un error al mostrar esta sección'}
            </h3>
            <p className="text-xs text-slate-400">
              {this.state.error?.message || 'Error inesperado de ejecución en la aplicación.'}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-primary/20 transition-all cursor-pointer"
          >
            <RefreshCw size={14} /> Recargar pantalla
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
