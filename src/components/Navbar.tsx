import React from 'react';
import { User } from '../types.js';
import { FolderUp, LogOut, LayoutDashboard, User as UserIcon } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  onSignInClick: () => void;
  onSignOut: () => void;
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onSignInClick,
  onSignOut,
  currentPath,
  onNavigate
}) => {
  return (
    <nav className="w-full py-4 px-6 border-b border-slate-200 bg-surface sticky top-0 z-40 backdrop-blur-md bg-opacity-95 shadow-sm">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Brand/Logo */}
        <button 
          onClick={() => onNavigate('/')}
          className="flex items-center gap-2.5 font-bold text-xl text-slate-800 tracking-tight cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className="bg-accent text-white p-2 rounded-xl shadow-sm">
            <FolderUp className="size-5" />
          </div>
          <span>goshare<span className="text-accent">.lol</span></span>
        </button>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onNavigate('/')}
            className={`text-sm cursor-pointer transition-colors duration-150 ${currentPath === '/' ? 'text-accent font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Public Feed
          </button>

          {user ? (
            <div className="flex items-center gap-4">
              <button 
                onClick={() => onNavigate('/dashboard')}
                className={`flex items-center gap-1.5 text-sm cursor-pointer transition-colors duration-150 ${currentPath === '/dashboard' ? 'text-accent font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <LayoutDashboard className="size-4" />
                <span>Dashboard</span>
              </button>

              {user.username && (
                <button
                  onClick={() => onNavigate(`/${user.username}`)}
                  className={`flex items-center gap-1.5 text-sm cursor-pointer transition-colors duration-150 ${currentPath === `/${user.username}` ? 'text-accent font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <UserIcon className="size-4" />
                  <span>My Page</span>
                </button>
              )}

              {/* User Profile */}
              <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                {user.avatarUrl ? (
                  <img 
                    src={user.avatarUrl} 
                    alt={user.name} 
                    referrerPolicy="no-referrer"
                    className="size-8 rounded-full border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="size-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-semibold text-accent">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                
                <button
                  onClick={onSignOut}
                  className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={onSignInClick}
              className="text-sm bg-accent hover:bg-accent-hover text-white font-semibold px-5 py-2.5 rounded-full transition-all duration-150 ease-out-quart cursor-pointer shadow-lg shadow-accent/20"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
