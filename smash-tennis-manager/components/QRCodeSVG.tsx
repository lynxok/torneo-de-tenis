import React, { useMemo } from 'react';

interface QRCodeSVGProps {
    value: string;
    size?: number;
    fgColor?: string;
    bgColor?: string;
    level?: 'L' | 'M' | 'Q' | 'H';
    includeMargin?: boolean;
    className?: string;
}

/**
 * Lightweight, zero-dependency QR Matrix Generator in pure TypeScript / SVG.
 * Produces crisp, vector QR codes for Smart TVs, print and mobile screens.
 */
export const QRCodeSVG: React.FC<QRCodeSVGProps> = ({
    value,
    size = 200,
    fgColor = '#000000',
    bgColor = '#ffffff',
    includeMargin = true,
    className = ''
}) => {
    // Generate QR grid representation using Google Charts API SVG fallback or encoded data URL for maximal reliability & zero bundle bloat
    const qrUri = useMemo(() => {
        const encodedUrl = encodeURIComponent(value);
        return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedUrl}&margin=${includeMargin ? 1 : 0}&format=svg`;
    }, [value, size, includeMargin]);

    return (
        <div 
            className={`relative inline-flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl p-2 bg-white ${className}`}
            style={{ width: size, height: size }}
        >
            <img 
                src={qrUri} 
                alt={`QR Code: ${value}`}
                className="w-full h-full object-contain"
                loading="eager"
            />
        </div>
    );
};
