"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 mx-auto mb-6 bg-slate-800 rounded-full flex items-center justify-center">
          <svg className="w-12 h-12 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2">Sem Conexão</h1>
        <p className="text-slate-400 mb-6">
          Você está offline. Algumas funcionalidades podem não estar disponíveis até que a conexão seja restaurada.
        </p>
        
        <div className="bg-slate-800 rounded-lg p-4 text-left mb-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-2">O que você pode fazer:</h2>
          <ul className="text-sm text-slate-400 space-y-2">
            <li className="flex items-center gap-2">
              <span className="text-emerald-500">✓</span>
              Ver mensagens em cache
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-500">✓</span>
              Visualizar tickets salvos
            </li>
            <li className="flex items-center gap-2">
              <span className="text-yellow-500">⏳</span>
              Enviar mensagens (será enviado quando online)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-yellow-500">⏳</span>
              Criar tickets (será enviado quando online)
            </li>
          </ul>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition"
        >
          Tentar Novamente
        </button>
      </div>
    </div>
  );
}
