import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import UploaderView from './components/UploaderView';
import RedacoesTableView from './components/RedacoesTableView';
import ConfigView from './components/ConfigView';
import ModalDetalhesRedacao from './components/ModalDetalhesRedacao';
import { db, deleteRedacao } from './db/db';
import { syncOfflineDocuments } from './services/syncService';

function App() {
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' | 'novo' | 'tabela' | 'sem_nome' | 'config'
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [redacoes, setRedacoes] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedRedacao, setSelectedRedacao] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('todas');

  const loadRedacoes = async () => {
    try {
      const allDocs = await db.redacoes.orderBy('data_captura').reverse().toArray();
      setRedacoes(allDocs);
    } catch (error) {
      console.error('Falha ao carregar redações:', error);
    }
  };

  useEffect(() => {
    loadRedacoes();
  }, [refreshTrigger]);

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
      loadRedacoes();
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
      await deleteRedacao(id);
      loadRedacoes();
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
      <Sidebar
        activeView={activeView}
        setActiveView={(view) => {
          setActiveView(view);
          setIsMobileMenuOpen(false);
          if (view === 'sem_nome') setFilterTab('sem_nome');
          else if (view === 'tabela') setFilterTab('todas');
        }}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        pendingCount={pendingCount}
        unidentifiedCount={unidentifiedCount}
      />

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
          
          {activeView === 'dashboard' && (
            <DashboardView
              redacoes={redacoes}
              onSelectRedacao={(r) => setSelectedRedacao(r)}
              onNavigateToUpload={() => setActiveView('novo')}
            />
          )}

          {activeView === 'novo' && (
            <UploaderView onRedacaoSaved={handleRedacaoSaved} />
          )}

          {(activeView === 'tabela' || activeView === 'sem_nome') && (
            <RedacoesTableView
              redacoes={redacoes}
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

        </main>
      </div>

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

export default App;
