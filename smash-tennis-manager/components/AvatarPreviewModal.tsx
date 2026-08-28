import React from 'react';
import { X, Building, Award, CheckCircle2 } from 'lucide-react';
import { formatPlayerName } from '../utils/formatters';

export interface AvatarPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  lastname?: string;
  imageUrl?: string | null;
  category?: string;
  institution?: string;
  role?: string;
  isVerified?: boolean;
}

export const AvatarPreviewModal: React.FC<AvatarPreviewModalProps> = ({
  isOpen,
  onClose,
  name,
  lastname,
  imageUrl,
  category,
  institution,
  role,
  isVerified = false,
}) => {
  if (!isOpen) return null;

  const formattedName = formatPlayerName(name, lastname);
  const hasImage = Boolean(imageUrl && typeof imageUrl === 'string' && imageUrl.trim().length > 0);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Floating Close Button */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={onClose}
            className="p-2.5 bg-black/50 hover:bg-black/80 rounded-full text-white/80 hover:text-white transition-all backdrop-blur-sm"
            title="Cerrar vista previa"
          >
            <X size={20} />
          </button>
        </div>

        {/* Image Preview Container (Protected from Drag/Right Click) */}
        <div 
          className="relative w-full aspect-square bg-slate-950 flex items-center justify-center overflow-hidden select-none"
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10 pointer-events-none" />

          {hasImage ? (
            <img
              src={imageUrl!}
              alt={formattedName}
              draggable={false}
              className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-white select-none">
              <div className="w-32 h-32 rounded-full bg-primary/20 text-primary border-2 border-primary/30 flex items-center justify-center text-5xl font-black shadow-2xl mb-4">
                {(name || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-muted font-semibold uppercase tracking-wider">
                Sin foto oficial cargada
              </span>
            </div>
          )}
        </div>

        {/* Player Details Footer */}
        <div className="p-6 bg-slate-900 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-2xl font-bold text-white leading-tight">
                {formattedName}
              </h3>
              {isVerified && (
                <CheckCircle2 size={18} className="text-green-400 shrink-0" title="Verificado Oficial" />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 mt-2">
              {category && (
                <span className="px-2.5 py-1 rounded-lg bg-primary/20 text-primary border border-primary/30 font-bold flex items-center gap-1">
                  <Award size={13} /> {category.includes('Cat') || category === 'Open' ? category : `Cat. ${category}`}
                </span>
              )}
              {institution && (
                <span className="px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/10 flex items-center gap-1">
                  <Building size={13} className="text-muted" /> {institution}
                </span>
              )}
              {role && role !== 'player' && (
                <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold uppercase text-[10px]">
                  {role}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center border-t border-white/10">
            <button
              onClick={onClose}
              className="w-full py-2.5 px-5 rounded-xl font-bold text-xs transition-all text-dark bg-primary hover:bg-primary-hover shadow-lg shadow-primary/20"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
