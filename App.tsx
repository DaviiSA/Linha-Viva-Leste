
import React, { useState, useEffect } from 'react';
import Home from './components/Home';
import AdminPanel from './components/AdminPanel';
import RequestForm from './components/RequestForm';
import { Layout } from './components/Layout';
import { storage } from './services/storage';

type Screen = 'home' | 'admin' | 'request';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [isSyncing, setIsSyncing] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      try {
        setIsSyncing(true);
        // Tenta sincronizar, mas continua mesmo se falhar
        await storage.fetchInventoryFromCloud();
      } catch (err) {
        console.warn("Falha na sincronização inicial, entrando em modo offline.");
      } finally {
        setIsSyncing(false);
      }
    };
    initApp();
  }, []);

  const renderScreen = () => {
    if (isSyncing) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="w-12 h-12 border-4 border-energisa-blue border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold animate-pulse uppercase text-[10px] tracking-widest">Conectando ao Neon Database...</p>
        </div>
      );
    }

    switch (currentScreen) {
      case 'home':
        return <Home onNavigate={setCurrentScreen} />;
      case 'admin':
        return <AdminPanel onBack={() => setCurrentScreen('home')} />;
      case 'request':
        return <RequestForm onBack={() => setCurrentScreen('home')} />;
      default:
        return <Home onNavigate={setCurrentScreen} />;
    }
  };

  return (
    <Layout currentScreen={currentScreen} onBack={() => setCurrentScreen('home')}>
      {renderScreen()}
    </Layout>
  );
};

export default App;
