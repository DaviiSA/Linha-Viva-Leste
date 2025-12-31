
import React, { useState } from 'react';
import Home from './components/Home';
import AdminPanel from './components/AdminPanel';
import RequestForm from './components/RequestForm';
import { Layout } from './components/Layout';

type Screen = 'home' | 'admin' | 'request';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');

  const renderScreen = () => {
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
