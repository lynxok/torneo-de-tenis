import React, { useState } from 'react';
import { UserProfile } from '../types';
import { AvatarPreviewModal } from './AvatarPreviewModal';

export interface UserAvatarProps {
  user?: Partial<UserProfile> | null;
  name?: string;
  lastname?: string;
  imageUrl?: string | null;
  category?: string;
  institution?: string;
  role?: string;
  isVerified?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shape?: 'circle' | 'rounded';
  isCurrentUser?: boolean;
  clickable?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

const SIZE_MAP = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-24 h-24 text-3xl'
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  name,
  lastname,
  imageUrl,
  category,
  institution,
  role,
  isVerified,
  size = 'md',
  shape = 'circle',
  isCurrentUser = false,
  clickable = true,
  className = '',
  onClick
}) => {
  const [showPreview, setShowPreview] = useState(false);

  // Extract properties prioritizing explicit props or user object
  const resolvedName = name || user?.name || 'Usuario';
  const resolvedLastname = lastname || user?.lastname || '';
  const resolvedImage = imageUrl || user?.profile_picture_url || (user as any)?.avatar_url || null;
  const resolvedCategory = category || user?.category;
  const resolvedInstitution = institution || user?.institution;
  const resolvedRole = role || user?.role;
  const resolvedVerified = isVerified !== undefined ? isVerified : Boolean(user?.is_approved);

  const initial = (resolvedName.trim() || 'U').charAt(0).toUpperCase();
  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.md;
  const roundedClasses = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick(e);
      return;
    }
    if (clickable) {
      e.stopPropagation();
      setShowPreview(true);
    }
  };

  const hasPhoto = Boolean(resolvedImage && typeof resolvedImage === 'string' && resolvedImage.trim().length > 0);

  return (
    <>
      <div
        onClick={handleClick}
        className={`relative inline-flex shrink-0 select-none items-center justify-center ${sizeClasses} ${roundedClasses} ${
          clickable ? 'cursor-pointer group/avatar' : ''
        } ${className}`}
        title={clickable ? `Click para ver foto de ${resolvedName}` : undefined}
      >
        {hasPhoto ? (
          <img
            src={resolvedImage!}
            alt={resolvedName}
            className={`w-full h-full rounded-[inherit] object-cover border transition-all duration-200 ${
              isCurrentUser
                ? 'border-primary ring-2 ring-primary/40'
                : 'border-white/10 group-hover/avatar:border-primary/50 group-hover/avatar:scale-105'
            } shadow-sm`}
          />
        ) : (
          <div
            className={`w-full h-full rounded-[inherit] flex items-center justify-center font-bold border transition-all duration-200 ${
              isCurrentUser
                ? 'bg-primary text-dark border-primary'
                : 'bg-gradient-to-br from-slate-700 to-slate-600 text-white border-white/10 group-hover/avatar:border-primary/40 group-hover/avatar:scale-105'
            } shadow-sm`}
          >
            {initial}
          </div>
        )}

        {/* Small verified badge if verified */}
        {resolvedVerified && size !== 'xs' && (
          <div
            className={`absolute -bottom-0.5 -right-0.5 bg-green-500 border-2 border-slate-900 rounded-full z-10 ${
              size === 'sm' ? 'w-2.5 h-2.5' : size === 'md' ? 'w-3 h-3' : size === 'lg' ? 'w-3.5 h-3.5' : 'w-4 h-4'
            }`}
            title="Verificado Oficial"
          />
        )}
      </div>

      {showPreview && (
        <AvatarPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          name={resolvedName}
          lastname={resolvedLastname}
          imageUrl={resolvedImage}
          category={resolvedCategory}
          institution={resolvedInstitution}
          role={resolvedRole}
          isVerified={resolvedVerified}
        />
      )}
    </>
  );
};
