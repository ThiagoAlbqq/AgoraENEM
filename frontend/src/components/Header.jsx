import React from 'react';
import { Sparkles, RefreshCw, Search, Menu, LogOut, LogIn, Award } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useAuth } from '../context/AuthContext';

export default function Header({
  pendingCount,
  isSyncing,
  onSync,
  searchQuery,
  setSearchQuery,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  onOpenLoginModal
}) {
  const isOnline = useNetworkStatus();
  const { user, logout, isAdmin } = useAuth();

  return (
    <header className="bg-[#f7f7f4] border-b border-[#e6e5e0] sticky top-0 z-20 px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4 shrink-0">

      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Mobile Menu Hambúrguer Button */}
        {user && (
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-md bg-[#ffffff] border border-[#e6e5e0] hover:bg-[#e6e5e0] text-[#26251e] md:hidden cursor-pointer shrink-0"
            title="Abrir Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Search Input - Render on sm screens and larger when user is logged in */}
        {user ? (
          <div className="hidden sm:block relative w-full max-w-xs sm:max-w-sm md:w-80">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#807d72] absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#ffffff] border border-[#e6e5e0] rounded-md pl-8 sm:pl-9 pr-2.5 py-1.5 sm:py-2 text-xs text-[#26251e] placeholder-[#a09c92] focus:outline-none focus:border-[#26251e] transition-colors"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="bg-[#f54e00] p-1.5 rounded-md text-white shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 min-w-0">
              <span className="font-normal text-sm sm:text-base text-[#26251e] tracking-tight whitespace-nowrap">Ágora ENEM</span>
              <span className="hidden sm:inline text-xs text-[#807d72] font-mono whitespace-nowrap">• Projeto Ágora Escolar</span>
            </div>
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">

        {/* Corrigir Button (Admin only) - Styled with light orange background and border */}
        {isAdmin && (
          <button
            type="button"
            disabled={!isOnline || isSyncing || pendingCount === 0}
            onClick={onSync}
            className={`h-8 sm:h-10 px-2.5 sm:px-4 rounded-md text-xs font-medium flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap ${
              isOnline && pendingCount > 0
                ? 'border border-[#dfa88f] bg-[#dfa88f]/20 hover:bg-[#dfa88f]/40 text-[#f54e00]'
                : 'bg-[#e6e5e0] text-[#a09c92] border border-[#e6e5e0] cursor-not-allowed'
            }`}
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Avaliando...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span className="sm:hidden font-medium">({pendingCount})</span>
                <span className="hidden sm:inline">Corrigir ({pendingCount})</span>
              </>
            )}
          </button>
        )}

        {/* Logout / Login Button */}
        {user ? (
          <button
            type="button"
            onClick={logout}
            className="p-2 rounded-md hover:bg-red-50 hover:text-red-700 text-[#807d72] transition-colors cursor-pointer"
            title="Sair da Conta"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenLoginModal}
            className="h-8 sm:h-10 px-3.5 rounded-md text-xs font-medium bg-[#f54e00] hover:bg-[#d04200] text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Entrar</span>
          </button>
        )}

      </div>

    </header>
  );
}

