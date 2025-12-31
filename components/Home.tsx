
import React from 'react';
import { ShieldCheck, ClipboardList } from 'lucide-react';

interface HomeProps {
  onNavigate: (screen: 'admin' | 'request') => void;
}

const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-6 flex flex-col items-center justify-center min-h-[60vh]">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Bem-vindo ao Sistema</h2>
        <p className="text-slate-500 font-medium">Selecione uma opção para continuar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        <button
          onClick={() => onNavigate('admin')}
          className="group relative overflow-hidden bg-white p-10 rounded-[2rem] border-2 border-slate-100 shadow-sm hover:shadow-2xl hover:border-energisa-blue transition-all text-left active:scale-[0.98]"
        >
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
            <ShieldCheck size={120} />
          </div>
          <div className="bg-energisa-blue/10 p-5 rounded-2xl w-fit mb-6 group-hover:bg-energisa-blue group-hover:text-white transition-all">
            <ShieldCheck size={40} />
          </div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">Administrador</h3>
          <p className="text-slate-500 mt-2 font-medium">Controle de estoque, saldo e aprovação de solicitações.</p>
        </button>

        <button
          onClick={() => onNavigate('request')}
          className="group relative overflow-hidden bg-white p-10 rounded-[2rem] border-2 border-slate-100 shadow-sm hover:shadow-2xl hover:border-energisa-orange transition-all text-left active:scale-[0.98]"
        >
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
            <ClipboardList size={120} />
          </div>
          <div className="bg-energisa-orange/10 p-5 rounded-2xl w-fit mb-6 group-hover:bg-energisa-orange group-hover:text-white transition-all">
            <ClipboardList size={40} />
          </div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">Solicitação de Material</h3>
          <p className="text-slate-500 mt-2 font-medium">Formulário para viaturas solicitarem itens do estoque.</p>
        </button>
      </div>
    </div>
  );
};

export default Home;
