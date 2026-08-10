import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick, ...props }) => {
  return (
    <div
      {...props}
      onClick={onClick}
      className={`bg-card/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-lg hover:shadow-black/20 hover:-translate-y-1' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
