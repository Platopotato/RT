import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  titleClassName?: string;
  actions?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ children, className = '', title, titleClassName = '', actions }) => {
  return (
    <div className={`bg-neutral-900/70 border border-neutral-700 rounded-lg shadow-lg overflow-hidden flex flex-col ${className}`}>
      {title && (
        <div className={`p-4 border-b border-neutral-700 flex justify-between items-center ${titleClassName}`}>
          <h3 className="text-lg font-bold text-amber-400 tracking-wider">{title}</h3>
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div className="p-4 flex-grow">
        {children}
      </div>
    </div>
  );
};

export default Card;
