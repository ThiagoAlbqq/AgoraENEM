import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import UploaderView from './components/UploaderView';
import RedacoesTableView from './components/RedacoesTableView';
import ConfigView from './components/ConfigView';
import RankingView from './components/RankingView';
import ModalDetalhesRedacao from './components/ModalDetalhesRedacao';
import LoginView from './components/LoginView';
import ProjetoAgoraLandingView from './components/ProjetoAgoraLandingView';
import { db, deleteRedacao } from './db/db';
import { syncOfflineDocuments } from './services/syncService';
import { AuthProvider, useAuth } from './context/AuthContext';
import { authService } from './services/authService';
import { X, Award, Loader2 } from 'lucide-react';

function AppContent() {
  const { user, isAuthenticated, isAdmin, isEstudante, loading: authLoading } = useAuth();
  
  // Initialize activeView from URL Hash (e.g. #tabela, #dashboard, #ranking, #novo, #config)
  const getInitialView = () => {
    const hash = window.location.hash.replace('#', '');
    const validViews = ['dashboard', 'ranking', 'novo', 'tabela', 'sem_nome', 'config'];
    return validViews.includes(hash) ? hash : 'dashboard';
  };

  const [activeView, setActiveView] = useState(getInitialView);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [redacoes, setRedacoes] = useState([]);
  const [rankingRedacoes, setRankingRedacoes] = useState([]);
  const [isLoadingRedacoes, setIsLoadingRedacoes] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedRedacao, setSelectedRedacao] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('todas');

  const handleSetActiveView = (view) => {
    setActiveView(view);
    window.location.hash = `#${view}`;
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const validViews = ['dashboard', 'ranking', 'novo', 'tabela', 'sem_nome', 'config'];
      if (validViews.includes(hash)) {
        setActiveView(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const loadRedacoes = async (silent = false) => {
    if (!silent) setIsLoadingRedacoes(true);
    try {
      // 1. Busca redações da nuvem e dados completos de ranking em paralelo
      const [cloudDocsRes, rankingDocsRes] = await Promise.all([
        authService.fetchCloudRedacoes(),
        authService.fetchRankingRedacoes()
      ]);

      const cloudDocs = Array.isArray(cloudDocsRes) ? cloudDocsRes : [];
      const rankingDocs = Array.isArray(rankingDocsRes) ? rankingDocsRes : [];

      if (!isAdmin && user && user.role === 'ESTUDANTE') {
        // Para Estudante: Não carregar 51 redações locais de outros alunos (evita piscar!)
        // Mostrar apenas as redações validadas do próprio estudante logado
        const cleanName = (user.nome || '').toLowerCase().trim();
        const studentCloudDocs = cloudDocs.filter(r =>
          (r.user_id && Number(r.user_id) === Number(user.id)) ||
          (cleanName && r.nome_aluno && r.nome_aluno.toLowerCase().trim() === cleanName)
        );

        setRedacoes(studentCloudDocs);
        setRankingRedacoes(rankingDocs.length > 0 ? rankingDocs : cloudDocs);
      } else {
        // Para Admin / Professor: Carregar nuvem + locais
        const localDocs = await db.redacoes.orderBy('data_captura').reverse().toArray();
        const combined = [...cloudDocs];
        for (const local of localDocs) {
          const isAlreadyInCloud = cloudDocs.some(c =>
            String(c.id) === String(local.id) ||
            String(c.id) === String(local.cloud_id) ||
            (c.nome_aluno && local.nome_aluno && c.nome_aluno.trim().toLowerCase() === local.nome_aluno.trim().toLowerCase() && c.data_captura === local.data_captura)
          );
          if (!isAlreadyInCloud) {
            combined.unshift(local);
          }
        }
        setRedacoes(combined);
        setRankingRedacoes(rankingDocs.length > 0 ? rankingDocs : combined);
      }
    } catch (error) {
      console.error('Falha ao carregar redações:', error);
      if (isAdmin) {
        const localDocs = await db.redacoes.orderBy('data_captura').reverse().toArray();
        setRedacoes(localDocs);
        setRankingRedacoes(localDocs);
      } else {
        setRedacoes([]);
        setRankingRedacoes([]);
      }
    } finally {
      if (!silent) setIsLoadingRedacoes(false);
    }
  };


  useEffect(() => {
    loadRedacoes();
  }, [refreshTrigger, user]);

  const handleRedacaoSaved = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await syncOfflineDocuments();
      loadRedacoes(true);
      if (res && res.message) {
        showToast(res.message, res.errorCount > 0 ? 'warning' : 'success');
      } else {
        showToast('Correção de redações concluída com sucesso!');
      }
    } catch (error) {
      console.error('Erro na sincronização:', error);
      showToast(`Falha na correção: ${error.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteRedacao = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta redação?')) {
      // 1. Atualização Otimista Imediata (0ms): Remove o card na hora sem sumir com os outros
      const previousRedacoes = [...redacoes];
      setRedacoes(prev => prev.filter(r => String(r.id) !== String(id) && String(r.cloud_id) !== String(id)));
      showToast('Redação excluída com sucesso!', 'success');

      try {
        // 2. Exclui no IndexedDB local e no Supabase (em background)
        await Promise.all([
          deleteRedacao(id).catch(() => {}),
          authService.deleteCloudRedacao(id).catch(err => {
            console.warn('Aviso ao excluir na nuvem:', err.message);
          })
        ]);
        // 3. Atualiza estado de fundo silenciosamente (sem travar nem piscar os cards)
        await loadRedacoes(true);
      } catch (error) {
        console.error('Erro ao excluir redação:', error);
        // Em caso de erro, reverte a exclusão na tela
        setRedacoes(previousRedacoes);
        showToast(`Erro ao excluir: ${error.message}`, 'error');
      }
    }
  };

  const pendingCount = redacoes.filter(r => !r.is_synced).length;
  const unidentifiedCount = redacoes.filter(r => r.is_synced && (!r.nome_detectado || !r.nome_aluno)).length;

  return (
    <div className="h-screen h-[100dvh] w-screen bg-[#f7f7f4] text-[#26251e] font-sans flex overflow-hidden select-none">
      
      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 md:hidden animate-fadeIn"
        />
      )}

      {/* Enterprise Navigation Sidebar */}
      {isAuthenticated && (
        <Sidebar
          activeView={activeView}
          setActiveView={(view) => {
            handleSetActiveView(view);
            setIsMobileMenuOpen(false);
            if (view === 'sem_nome') setFilterTab('sem_nome');
            else if (view === 'tabela') setFilterTab('todas');
          }}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          pendingCount={pendingCount}
          unidentifiedCount={unidentifiedCount}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen h-[100dvh] overflow-hidden">
        
        {/* Enterprise Top Header */}
        <Header
          pendingCount={pendingCount}
          isSyncing={isSyncing}
          onSync={handleSync}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
        />

        {/* Global Toast Feedback Notification Banner */}
        {toast && (
          <div className="px-6 pt-4 animate-fadeIn">
            <div
              className={`p-3.5 rounded-lg border text-xs font-medium flex items-center justify-between shadow-sm ${
                toast.type === 'error'
                  ? 'bg-[#dfa88f] border-[#dfa88f] text-[#26251e]'
                  : toast.type === 'warning'
                  ? 'bg-[#dfa88f]/60 border-[#dfa88f] text-[#26251e]'
                  : 'bg-[#9fc9a2] border-[#9fc9a2] text-[#26251e]'
              }`}
            >
              <span>{toast.message}</span>
              <button
                onClick={() => setToast(null)}
                className="ml-4 font-mono text-xs hover:underline cursor-pointer opacity-80 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Page Content Body */}
        <main className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          
          {authLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-[#26251e] space-y-3 animate-fadeIn">
              <div className="bg-[#f54e00] p-3.5 rounded-2xl text-white shadow-md">
                <Award className="w-7 h-7" />
              </div>
              <div className="font-semibold text-sm tracking-tight text-[#26251e]">Ágora ENEM</div>
              <div className="text-xs text-[#807d72] font-mono flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#f54e00]" />
                Carregando ambiente...
              </div>
            </div>
          ) : !isAuthenticated ? (
            <ProjetoAgoraLandingView onOpenLoginModal={() => setIsLoginModalOpen(true)} />
          ) : (
            <>
              {activeView === 'dashboard' && (
                <DashboardView
                  redacoes={redacoes}
                  isLoading={isLoadingRedacoes}
                  onSelectRedacao={(r) => setSelectedRedacao(r)}
                  onNavigateToUpload={() => handleSetActiveView('novo')}
                  onNavigateToRanking={() => handleSetActiveView('ranking')}
                />
              )}

              {activeView === 'ranking' && (
                <RankingView
                  redacoes={rankingRedacoes.length > 0 ? rankingRedacoes : redacoes}
                  onSelectRedacao={(r) => setSelectedRedacao(r)}
                />
              )}

              {activeView === 'novo' && (
                <UploaderView onRedacaoSaved={handleRedacaoSaved} onSync={handleSync} />
              )}

              {(activeView === 'tabela' || activeView === 'sem_nome') && (
                <RedacoesTableView
                  redacoes={redacoes}
                  isLoading={isLoadingRedacoes}
                  filterTab={activeView === 'sem_nome' ? 'sem_nome' : filterTab}
                  setFilterTab={setFilterTab}
                  onSelectRedacao={(r) => setSelectedRedacao(r)}
                  onDeleteRedacao={handleDeleteRedacao}
                  searchQuery={searchQuery}
                />
              )}

              {activeView === 'config' && (
                <ConfigView />
              )}
            </>
          )}

        </main>
      </div>

      {/* Login Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 bg-[#26251e]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md">
            <button
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute top-4 right-4 text-[#807d72] hover:text-[#26251e] p-1.5 rounded-md bg-[#ffffff] border border-[#e6e5e0] z-10 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
            <LoginView onLoginSuccess={() => setIsLoginModalOpen(false)} />
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedRedacao && (
        <ModalDetalhesRedacao
          redacao={selectedRedacao}
          onClose={() => setSelectedRedacao(null)}
          onUpdated={() => {
            loadRedacoes();
            setSelectedRedacao(null);
          }}
        />
      )}

    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
