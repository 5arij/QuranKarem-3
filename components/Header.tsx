import React from 'react';
import { Radio } from 'lucide-react';
import { APP_STRINGS } from '../constants';

export const Header: React.FC = () => {
  return (
    <div className="text-center space-y-2 relative z-10">
      <div className="inline-flex items-center justify-center p-3 mb-4 bg-emerald-800/30 rounded-full border border-emerald-700/50 backdrop-blur-md">
        <Radio className="text-amber-400 animate-pulse" size={24} />
        <span className="mr-2 text-sm font-bold text-amber-400 tracking-wide uppercase">
          {APP_STRINGS.live}
        </span>
      </div>
      
      <h1 className="text-4xl md:text-5xl font-bold font-amiri text-transparent bg-clip-text bg-gradient-to-b from-white to-emerald-200 drop-shadow-sm">
        {APP_STRINGS.title}
      </h1>
      <p className="text-lg text-emerald-300/90 font-light">
        {APP_STRINGS.subtitle}
      </p>
    </div>
  );
};