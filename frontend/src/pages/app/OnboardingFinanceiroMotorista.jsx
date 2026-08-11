import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormRegistroBanco from '../../components/app/FormRegistroBanco';

export default function OnboardingFinanceiroMotorista() {
  const navigate = useNavigate();
  const [completed, setCompleted] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4F6FA] to-white px-4 py-12">
      <div className="mx-auto max-w-2xl">
        {!completed ? (
          <>
            <div className="text-center mb-10">
              <h1 className="font-grotesk text-4xl font-bold text-ink mb-2">
                Como você vai receber seus ganhos?
              </h1>
              <p className="text-ink/60 text-lg">
                Registre sua conta bancária para receber os leads convertidos automaticamente
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-ink/[0.07] shadow-lg p-8">
              <FormRegistroBanco onSuccess={() => setCompleted(true)} />

              <div className="mt-8 text-center text-sm text-ink/50">
                <p>🔒 Seus dados bancários são criptografados</p>
                <p>Você controla quando e como os dados são usados</p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center bg-white rounded-2xl border border-ink/[0.07] shadow-lg p-8">
            <div className="mb-6">
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </div>

            <h2 className="font-grotesk text-2xl font-bold text-ink mb-2">
              Conta bancária confirmada!
            </h2>
            <p className="text-ink/60 mb-6">Agora você receberá automaticamente os leads que converter</p>

            <button
              onClick={() => navigate('/app/motorista')}
              className="bg-[#00A86B] text-white font-bold px-8 py-3 rounded-lg hover:bg-[#00915c] transition"
            >
              Ir para o painel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
