
import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentScreen: string;
  onBack: () => void;
}

const BucketTruckLogo: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    {/* Base Chassis */}
    <path d="M2 16h20" />
    <path d="M2 16l1-4h13l1 4" />
    {/* Cabin */}
    <path d="M17 12l1-4h4v8h-5" />
    {/* Wheels */}
    <circle cx="6" cy="18" r="2" />
    <circle cx="16" cy="18" r="2" />
    {/* Bucket Arm (Cesto Elevatório) */}
    <path d="M8 12l4-8h4" />
    <rect x="15" y="2" width="5" height="4" rx="1" fill="currentColor" fillOpacity="0.2" />
    {/* Outriggers (Sapatas) - small detail */}
    <path d="M4 16v2" />
    <path d="M12 16v2" />
  </svg>
);

export const Layout: React.FC<LayoutProps> = ({ children, currentScreen, onBack }) => {
  return (
    <div className="min-h-screen flex flex-col selection:bg-energisa-orange/30">
      <header className="bg-energisa-blue text-white p-4 shadow-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentScreen !== 'home' && (
              <button 
                onClick={onBack}
                aria-label="Voltar"
                className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-95"
              >
                <ArrowLeft size={24} />
              </button>
            )}
            <div className="bg-white p-2 rounded-xl shadow-inner flex items-center justify-center text-energisa-blue">
              <BucketTruckLogo size={28} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight leading-none">Linha Viva Leste</h1>
              <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mt-1">Gestão de Equipamentos</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <div className="h-8 w-1 bg-energisa-orange rounded-full"></div>
            <span className="text-xs font-bold uppercase tracking-tighter opacity-80">
              Controle de Materiais
            </span>
          </div>
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
        {children}
      </main>

      <footer className="bg-white p-6 border-t border-slate-200 text-center text-slate-400 text-[10px] uppercase tracking-widest font-bold">
        &copy; {new Date().getFullYear()} Linha Viva Leste &bull; Sistema de Gestão de Estoque
      </footer>
    </div>
  );
};
