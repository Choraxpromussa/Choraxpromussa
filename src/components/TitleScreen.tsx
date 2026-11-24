import React, { useEffect, useState } from 'react';
import { Difficulty, GameMode, GameSettings, SidePreference, TimeControlId } from '../engine/types';

interface TitleScreenProps {
  settings: GameSettings;
  onUpdateSettings: (next: GameSettings) => void;
  onStartGame: () => void;
}

const KEY_ART_URL = '/src/assets/images/chess_parlor_keyart_1795518119377.jpg';

export const TitleScreen: React.FC<TitleScreenProps> = ({
  settings,
  onUpdateSettings,
  onStartGame,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'BUTTON') return;
        e.preventDefault();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onStartGame]);

  const setMode = (mode: GameMode) => onUpdateSettings({ ...settings, mode });
  const setDifficulty = (difficulty: Difficulty) => onUpdateSettings({ ...settings, difficulty });
  const setSide = (playerSide: SidePreference) => onUpdateSettings({ ...settings, playerSide });
  const setTimeControl = (timeControl: TimeControlId) =>
    onUpdateSettings({ ...settings, timeControl });

  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden bg-[#0E1115] text-[#F3EFE6] flex items-center">
      {/* Backdrop Key Art */}
      {!imgFailed ? (
        <img
          src={KEY_ART_URL}
          alt="Tabuleiro de xadrez em nogueira e bordo sobre mesa de ardósia"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_72%_48%,#2a231c_0%,#12161b_55%,#0b0d10_100%)]"
        />
      )}

      {/* Measured contrast scrim */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-[#0C0F13]/96 via-[#0C0F13]/82 to-[#0C0F13]/30"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-[#0C0F13]/85 via-transparent to-[#0C0F13]/40"
      />

      {/* Content Container */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-6 sm:px-12 py-10 flex flex-col justify-between min-h-[min(100vh,780px)]">
        <div className="max-w-lg space-y-8">
          {/* Bespoke SVG Title Lockup */}
          <div className="space-y-4">
            <div className="flex items-center gap-3.5">
              <svg
                viewBox="0 0 40 40"
                className="w-10 h-10 shrink-0 text-[#D4A24C]"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="2"
                  y="2"
                  width="36"
                  height="36"
                  rx="6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeOpacity="0.45"
                />
                <path
                  d="M20 7.5V12M17.5 9.75H22.5M14.5 17C14.5 14 17 12.25 20 12.25C23 12.25 25.5 14 25.5 17C25.5 19.5 23.2 21.5 22.8 25.5H17.2C16.8 21.5 14.5 19.5 14.5 17ZM13 28.5H27L28.5 31.5H11.5L13 28.5Z"
                  stroke="currentColor"
                  strokeWidth="1.65"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-xs font-medium tracking-[0.16em] uppercase text-[#D4A24C]">
                Regras Oficiais FIDE
              </span>
            </div>

            <h1 className="font-display text-5xl sm:text-6xl font-semibold tracking-tight text-[#F7F3EA] leading-[1.05] text-balance">
              Xadrez Soberano
            </h1>
            <p className="text-base text-[#C5BEB0] leading-relaxed max-w-md">
              Partidas completas contra inteligência artificial tática ou em modo local. Roque,
              en passant, promoção, controle de tempo e notação algébrica.
            </p>
          </div>

          {/* Setup Controls */}
          <section
            aria-label="Configuração da partida"
            className="bg-[#151920]/90 border border-[#F3EFE6]/12 rounded-xl p-5 space-y-5 shadow-2xl"
          >
            {/* Mode */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-[#A9A294]">Modo de Jogo</div>
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#0E1115] rounded-lg border border-[#F3EFE6]/8">
                {(
                  [
                    { id: 'ai', label: 'Contra IA' },
                    { id: 'local', label: '2 Jogadores' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMode(item.id)}
                    className={`min-h-[40px] px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      settings.mode === item.id
                        ? 'bg-[#D4A24C] text-[#111418] font-semibold'
                        : 'text-[#C5BEB0] hover:text-[#F3EFE6] hover:bg-[#F3EFE6]/5'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {settings.mode === 'ai' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Difficulty */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-[#A9A294]">Nível da IA</div>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-[#0E1115] rounded-lg border border-[#F3EFE6]/8">
                    {(
                      [
                        { id: 'iniciante', label: 'Iniciante' },
                        { id: 'tatico', label: 'Tático' },
                        { id: 'mestre', label: 'Mestre' },
                      ] as const
                    ).map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDifficulty(d.id)}
                        className={`min-h-[40px] px-2 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          settings.difficulty === d.id
                            ? 'bg-[#2A313D] text-[#F7F3EA] border border-[#D4A24C]/50'
                            : 'text-[#A9A294] hover:text-[#F3EFE6]'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Player Side */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-[#A9A294]">Suas Peças</div>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-[#0E1115] rounded-lg border border-[#F3EFE6]/8">
                    {(
                      [
                        { id: 'w', label: 'Brancas' },
                        { id: 'random', label: 'Sorteio' },
                        { id: 'b', label: 'Pretas' },
                      ] as const
                    ).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSide(s.id)}
                        className={`min-h-[40px] px-2 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          settings.playerSide === s.id
                            ? 'bg-[#2A313D] text-[#F7F3EA] border border-[#D4A24C]/50'
                            : 'text-[#A9A294] hover:text-[#F3EFE6]'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Time Control */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-[#A9A294]">Controle de Tempo</div>
              <div className="grid grid-cols-3 gap-2 p-1 bg-[#0E1115] rounded-lg border border-[#F3EFE6]/8">
                {(
                  [
                    { id: 'unlimited', label: 'Sem Relógio' },
                    { id: 'rapid_10', label: '10 min' },
                    { id: 'blitz_5_3', label: '5 min + 3s' },
                  ] as const
                ).map((tc) => (
                  <button
                    key={tc.id}
                    type="button"
                    onClick={() => setTimeControl(tc.id)}
                    className={`min-h-[40px] px-2.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      settings.timeControl === tc.id
                        ? 'bg-[#2A313D] text-[#F7F3EA] border border-[#D4A24C]/50'
                        : 'text-[#A9A294] hover:text-[#F3EFE6]'
                    }`}
                  >
                    {tc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Start CTA */}
            <button
              type="button"
              onClick={onStartGame}
              className="w-full min-h-[48px] px-6 py-3 rounded-lg bg-[#D4A24C] hover:bg-[#DFB262] active:bg-[#C2903D] text-[#111418] font-semibold text-base transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A24C]"
            >
              Iniciar Partida
            </button>
          </section>
        </div>

        {/* Single flat control-hint line */}
        <p className="mt-8 text-xs text-[#9D9689] tracking-wide">
          Clique ou arraste peças · Z Desfazer · H Dica · F Girar · M Som · Esc Pausa
        </p>
      </main>
    </div>
  );
};
