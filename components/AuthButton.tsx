import React from 'react';
import firebase from 'firebase/compat/app';
import { LogIn, LogOut, Cloud, CloudOff, CheckCircle } from 'lucide-react';

interface AuthButtonProps {
  user: firebase.User | null;
  onLogin: () => void;
  onLogout: () => void;
  loading?: boolean;
  syncStatus?: 'synced' | 'syncing' | 'offline';
}

export const AuthButton: React.FC<AuthButtonProps> = ({ user, onLogin, onLogout, loading, syncStatus }) => {
  if (loading) {
    return (
      <div className="bg-pink-100/50 rounded-full w-8 h-8 flex items-center justify-center text-pink-400 animate-pulse">
        ...
      </div>
    );
  }

  // Helper to render sync dot
  const SyncIndicator = () => {
    if (!syncStatus) return null;
    return (
      <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 border border-slate-100 shadow-sm">
         {syncStatus === 'synced' && <CheckCircle className="w-3 h-3 text-green-500 fill-green-100" />}
         {syncStatus === 'syncing' && <Cloud className="w-3 h-3 text-blue-400 fill-blue-50 animate-bounce" />}
         {syncStatus === 'offline' && <CloudOff className="w-3 h-3 text-slate-400" />}
      </div>
    );
  }

  if (user) {
    return (
      <button
        onClick={onLogout}
        className="flex items-center space-x-2 bg-white hover:bg-red-50 text-slate-600 pl-1 pr-3 py-1 rounded-full border border-slate-200 transition-all text-xs font-bold shadow-sm hover:shadow-md group"
        title="Sign Out"
      >
        <div className="relative">
            <img 
            src={user.photoURL || `https://api.dicebear.com/9.x/glass/svg?seed=${user.uid}`} 
            alt="Avatar" 
            className="w-7 h-7 rounded-full border border-pink-200 bg-pink-50"
            />
            <SyncIndicator />
        </div>
        <span className="hidden sm:inline text-slate-600 max-w-[60px] truncate">{user.displayName?.split(' ')[0] || 'Doc'}</span>
      </button>
    );
  }

  return (
    <button
      onClick={onLogin}
      className="flex items-center space-x-1.5 bg-pink-500 hover:bg-pink-600 text-white px-3 py-1.5 rounded-full transition-all text-xs font-bold shadow-md shadow-pink-200 hover:shadow-lg hover:-translate-y-0.5"
    >
      <LogIn className="w-3.5 h-3.5" />
      <span className="hidden xs:inline">Login to Save</span>
      <span className="xs:hidden">Login</span>
    </button>
  );
};