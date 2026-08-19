/**
 * Paginação das listas do admin.
 *
 * Some quando há uma página só: um controle que não faz nada é ruído na tela.
 */
export default function Paginacao({ pagina, paginas, onMudar }) {
  if (paginas <= 1) return null;

  const janela = Array.from({ length: Math.min(5, paginas) }, (_, i) => {
    // Mantém a página atual no meio da janela sempre que possível.
    const inicio = Math.min(Math.max(1, pagina - 2), Math.max(1, paginas - 4));
    return inicio + i;
  }).filter((p) => p <= paginas);

  const botao =
    'rounded-xl border border-black/10 bg-white px-3.5 py-2 text-sm font-medium text-ink/60 transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="mt-6 flex items-center justify-center gap-2">
      <button className={botao} disabled={pagina === 1} onClick={() => onMudar(pagina - 1)}>
        Anterior
      </button>

      {janela.map((p) => (
        <button
          key={p}
          onClick={() => onMudar(p)}
          className="h-9 w-9 rounded-xl text-sm font-semibold transition-colors"
          style={
            p === pagina
              ? { background: '#2563FF', color: '#fff' }
              : { background: '#fff', color: 'rgba(11,29,58,0.55)', border: '1px solid rgba(0,0,0,0.10)' }
          }
        >
          {p}
        </button>
      ))}

      <button className={botao} disabled={pagina === paginas} onClick={() => onMudar(pagina + 1)}>
        Próxima
      </button>
    </div>
  );
}
