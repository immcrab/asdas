import React from 'react';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="mt-auto px-6 py-8 border-t border-slate-200 bg-surface shadow-inner">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h3 className="font-display text-xs uppercase tracking-wider text-slate-400 font-bold">Legal</h3>
          <ul className="mt-2 flex gap-4">
            <li>
              <button 
                onClick={() => onNavigate('/privacy')}
                className="text-xs text-slate-500 hover:text-accent font-medium transition-colors cursor-pointer"
              >
                Privacy
              </button>
            </li>
            <li>
              <button 
                onClick={() => onNavigate('/terms')}
                className="text-xs text-slate-500 hover:text-accent font-medium transition-colors cursor-pointer"
              >
                Terms
              </button>
            </li>
          </ul>
        </div>
        <div className="flex flex-col items-center md:items-end gap-1.5 text-center md:text-right">
          <p className="font-sans text-xs text-slate-500 font-medium">© 2026 goshare.lol</p>
          <p className="font-sans text-[10px] text-slate-400">Secure, encrypted, instant file delivery and creator hubs.</p>
        </div>
      </div>
    </footer>
  );
};
