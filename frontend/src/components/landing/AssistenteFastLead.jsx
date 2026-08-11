import { useState } from 'react';

const ACCENT = '#0A9D6C';

const RESPOSTAS = {
  'o-que-e-fastlead': {
    pergunta: 'O que é FastLead?',
    resposta: `FastLead é mídia em veículos de aplicativo com QR code exclusivo.

    Tablets no banco de trás mostram sua peça (display, vídeo ou interativo) para cada passageiro. Quando escaneia o QR, vira um lead — nome e telefone — direto no seu painel. Sem intermediário, sem estimativa.

    Você não paga por impressão: só pelo lead que realmente escaneou.`,
  },
  'ganhar-renda-extra': {
    pergunta: 'Como ganhar renda extra?',
    resposta: `Se você é motorista de aplicativo:

    1. Instale o tablet FastLead no banco de trás do seu carro
    2. A gente fornece campanhas diferentes toda semana
    3. Cada lead que o passageiro escaneia, você recebe uma comissão (em média R$ 30-150 por lead, depende da campanha)
    4. O dinheiro cai na sua conta automaticamente

    Funciona offline, sincroniza sozinho. Zero esforço — enquanto roda, ganha.`,
  },
  'ganhar-clientes': {
    pergunta: 'Como ganhar clientes?',
    resposta: `Se você é empresa ou agência:

    1. Monte uma campanha no simulador (escolha veículos, horários, cidades, público)
    2. A gente mostra seu anúncio exclusivamente naqueles carros — não há feed, não há concorrência na tela
    3. Cada lead que vira contato, você vê o nome e telefone na hora
    4. Paga só pelos leads que converteram em proposta/venda — sem taxa de impressão

    Ideal para: oferta local, lançamento de produto, e-commerce, SaaS, serviços.`,
  },
  'quanto-custa': {
    pergunta: 'Quanto custa?',
    resposta: `Planos a partir de R$ 266 por semana.

    - 10 veículos rodando em horários que você escolhe
    - Sem fidelidade mínima — cancela quando quiser
    - Você só paga pelos leads que viram contato (conversão)

    Use o simulador para ver a previsão de retorno baseado no seu público-alvo.`,
  },
  'como-funciona-offline': {
    pergunta: 'Como funciona se perder sinal?',
    resposta: `O tablet FastLead funciona 100% offline.

    - Todas as campanhas ficam salvas no tablet
    - QR codes e impressões são registrados mesmo em túnel ou área sem sinal
    - Quando volta o sinal, sincroniza automaticamente com o painel
    - Nenhum lead se perde — corrida em túnel completo fica rastreada normalmente.`,
  },
};

const PERGUNTAS_PADRAO = Object.keys(RESPOSTAS);

export default function AssistenteFastLead() {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState([
    {
      tipo: 'bot',
      texto: 'Oi! 👋 Sou o Assistente FastLead. Tem dúvidas?',
    },
  ]);

  const responder = (chave) => {
    const { pergunta, resposta } = RESPOSTAS[chave];

    setMensagens((prev) => [
      ...prev,
      { tipo: 'usuario', texto: pergunta },
      { tipo: 'bot', texto: resposta },
    ]);
  };

  const voltarAoInicio = () => {
    setMensagens([
      {
        tipo: 'bot',
        texto: 'Oi! 👋 Sou o Assistente FastLead. Tem dúvidas?',
      },
    ]);
  };

  const temPerguntaNaoRespondida = !mensagens.some(
    (m) => m.tipo === 'bot' && Object.values(RESPOSTAS).some((r) => r.resposta === m.texto)
  );

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setAberto(!aberto)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition hover:scale-110 active:scale-95"
        style={{ background: ACCENT }}
        aria-label="Assistente FastLead"
      >
        <span className="text-2xl">🤖</span>
      </button>

      {/* Chat flutuante */}
      {aberto && (
        <div
          className="fixed bottom-24 right-6 z-40 w-80 max-h-[500px] rounded-2xl bg-white shadow-xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4" style={{ background: ACCENT }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🤖</span>
                <div>
                  <p className="font-bold text-white text-sm">Assistente FastLead</p>
                  <p className="text-xs" style={{ color: '#e0f7f4' }}>Online agora</p>
                </div>
              </div>
              <button
                onClick={() => setAberto(false)}
                className="text-white hover:opacity-75"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-gray-50">
            {mensagens.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.tipo === 'usuario' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                    msg.tipo === 'usuario'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}
                >
                  {msg.texto}
                </div>
              </div>
            ))}
          </div>

          {/* Perguntas */}
          {temPerguntaNaoRespondida && (
            <div className="border-t border-gray-200 bg-white p-3 space-y-2 max-h-[180px] overflow-y-auto">
              {PERGUNTAS_PADRAO.map((chave) => (
                <button
                  key={chave}
                  onClick={() => responder(chave)}
                  className="w-full rounded-lg px-2 py-2 text-left text-xs font-medium transition hover:bg-gray-100 border border-gray-200"
                  style={{
                    color: ACCENT,
                    borderColor: ACCENT + '30',
                    backgroundColor: ACCENT + '08',
                  }}
                >
                  {RESPOSTAS[chave].pergunta}
                </button>
              ))}
            </div>
          )}

          {/* Botão de voltar */}
          {!temPerguntaNaoRespondida && (
            <div className="border-t border-gray-200 bg-white p-3">
              <button
                onClick={voltarAoInicio}
                className="w-full rounded-lg px-3 py-2 text-xs font-semibold transition hover:bg-gray-100"
                style={{ color: ACCENT }}
              >
                ← Fazer outra pergunta
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
