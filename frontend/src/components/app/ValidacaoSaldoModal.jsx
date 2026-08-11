import { useNavigate } from 'react-router-dom';

export default function ValidacaoSaldoModal({ isOpen, requiredAmount, currentBalance, onClose }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm mx-4">
        <div className="text-center mb-6">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <svg
              className="h-6 w-6 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </span>
        </div>

        <h3 className="font-grotesk text-xl font-bold text-ink text-center mb-2">
          Saldo insuficiente
        </h3>

        <p className="text-center text-ink/60 mb-4">
          Você precisa de R$ {requiredAmount.toFixed(2).replace('.', ',')} mas tem apenas R${' '}
          {currentBalance.toFixed(2).replace('.', ',')}
        </p>

        <p className="text-center text-sm text-ink/50 mb-6">
          Adicione crédito à sua carteira para publicar este anúncio.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/app/empresa/carteira')}
            className="bg-brand text-white font-bold py-3 rounded-lg hover:bg-[#1d51d8] transition"
          >
            Adicionar crédito agora
          </button>
          <button
            onClick={onClose}
            className="border border-ink/[0.07] text-ink font-semibold py-3 rounded-lg hover:bg-ink/[0.02] transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
