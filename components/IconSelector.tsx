


import React from 'react';
import { TRIBE_ICONS } from '../constants';

interface IconSelectorProps {
  selectedIcon: string;
  onSelect: (iconKey: string) => void;
}

const IconSelector: React.FC<IconSelectorProps> = ({ selectedIcon, onSelect }) => {

  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">Choose Your Tribe's Icon</label>
      <div className="flex justify-center items-center flex-wrap gap-4 p-3 bg-slate-700/50 rounded-lg">
        {Object.entries(TRIBE_ICONS).map(([key, icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={`w-16 h-16 flex items-center justify-center rounded-full transition-all duration-200 ${
              selectedIcon === key 
              ? 'bg-amber-600 text-white ring-2 ring-offset-2 ring-offset-slate-800 ring-amber-500' 
              : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
              {icon}
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
};

export default IconSelector;