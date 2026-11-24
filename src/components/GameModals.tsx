import React from 'react';
import { Color, GameStatus, PieceType } from '../engine/types';
import { ChessPieceIcon } from './ChessPieces';

interface PromotionModalProps {
  color: Color;
  onSelect: (piece: PieceType) => void;
  onCancel: () => void;
}

const PROMOTION_OPTIONS: { type: PieceType; label: string }[] = [
  { type: 'q', label: 'Dama' },
  { type: 'r', label: 'Torre' },
  { type: 'b', label: 'Bispo' },
  { type: 'n', label: 'Cavalo' },
];

export const PromotionModal: React.FC<PromotionModalProps> = ({ color, onSelect, onCancel }) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Promoção de peão"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="w-full max-w-sm bg-[#1A1F26] border border-[#F3EFE6]/16 rounded-xl p-6 shadow-2xl space-y-5">
        <div className="space-y-1 text-center">
          <h2 className="font-display text-2xl font-semibold text-[#F7F3EA]">Promover Peão</h2>
          <p className="text-sm text-[#B4ADA0]">Escolha a peça para a oitava fileira</p>
        </div>

        <div className="grid grid-cols-4 gap-2.5">
          {PROMOTION_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => onSelect(opt.type)}
              className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg bg-[#111418] hover:bg-[#2A313D] border border-[#F3EFE6]/12 hover:border-[#D4A24C]/60 transition-colors cursor-pointer min-h-[88px]"
            >
              <div className="w-11 h-11">
                <ChessPieceIcon color={color} type={opt.type} />
              </div>
              <span className="text-xs font-medium text-[#EFEAE0] whitespace-nowrap shrink-0">
                {opt.label}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="w-full min-h-[40px] py-2 px-4 rounded-lg border border-[#F3EFE6]/14 text-sm text-[#B4ADA0] hover:text-[#F3EFE6] hover:bg-[#F3EFE6]/5 transition-colors cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({ onResume, onRestart, onMainMenu }) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Partida pausada"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 p-4"
    >
      <div className="w-full max-w-sm bg-[#1A1F26] border border-[#F3EFE6]/16 rounded-xl p-6 shadow-2xl space-y-5">
        <div className="space-y-1 text-center">
          <h2 className="font-display text-2xl font-semibold text-[#F7F3EA]">Partida Pausada</h2>
          <p className="text-sm text-[#B4ADA0]">O relógio está temporariamente suspenso</p>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-lg bg-[#D4A24C] hover:bg-[#DFB262] text-[#111418] font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            Continuar Partida
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-lg bg-[#252C36] hover:bg-[#2F3744] text-[#F3EFE6] font-medium text-sm border border-[#F3EFE6]/10 transition-colors cursor-pointer whitespace-nowrap"
          >
            Reiniciar Partida
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-lg bg-transparent hover:bg-[#F3EFE6]/5 text-[#B4ADA0] hover:text-[#F3EFE6] font-medium text-sm border border-[#F3EFE6]/12 transition-colors cursor-pointer whitespace-nowrap"
          >
            Menu Principal
          </button>
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  status: GameStatus;
  winner: Color | 'draw' | null;
  totalMoves: number;
  whiteLabel: string;
  blackLabel: string;
  onPlayAgain: () => void;
  onMainMenu: () => void;
  onInspectBoard: () => void;
}

const STATUS_DESCRIPTIONS: Partial<Record<GameStatus, string>> = {
  checkmate: 'Por Xeque-Mate',
  stalemate: 'Empate por Afogamento',
  insufficient_material: 'Empate por Material Insuficiente',
  threefold_repetition: 'Empate por Repetição Tripla',
  fifty_move: 'Empate pela Regra dos 50 Lances',
  timeout: 'Por Tempo Esgotado',
  resigned: 'Por Desistência',
  draw_agreement: 'Empate por Acordo',
};

export const GameOverModal: React.FC<GameOverModalProps> = ({
  status,
  winner,
  totalMoves,
  whiteLabel,
  blackLabel,
  onPlayAgain,
  onMainMenu,
  onInspectBoard,
}) => {
  const headline =
    winner === 'draw'
      ? 'Empate'
      : winner === 'w'
        ? `Vitória das Brancas`
        : `Vitória das Pretas`;

  const winnerName = winner === 'w' ? whiteLabel : winner === 'b' ? blackLabel : 'Nenhum vencedor';
  const reasonText = STATUS_DESCRIPTIONS[status] || 'Partida Encerrada';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Resultado da partida"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 p-4"
    >
      <div className="w-full max-w-md bg-[#1A1F26] border border-[#F3EFE6]/16 rounded-xl p-6 sm:p-7 shadow-2xl space-y-6">
        <div className="space-y-2 text-center">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-[#D4A24C]">
            {reasonText}
          </div>
          <h2 className="font-display text-3xl font-semibold text-[#F7F3EA]">{headline}</h2>
          <p className="text-sm text-[#B4ADA0]">
            {winner === 'draw' ? 'A partida terminou igualada.' : `${winnerName} venceram o confronto.`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-[#111418] border border-[#F3EFE6]/8 text-sm">
          <div>
            <div className="text-xs text-[#8E877B]">Lances Jogados</div>
            <div className="font-mono-tabular text-lg font-semibold text-[#F3EFE6] mt-0.5">
              {Math.ceil(totalMoves / 2)}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#8E877B]">Total de Meios-Lances</div>
            <div className="font-mono-tabular text-lg font-semibold text-[#F3EFE6] mt-0.5">
              {totalMoves}
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onPlayAgain}
            className="w-full min-h-[46px] py-2.5 px-4 rounded-lg bg-[#D4A24C] hover:bg-[#DFB262] text-[#111418] font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            Jogar Novamente
          </button>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onInspectBoard}
              className="min-h-[42px] py-2 px-3 rounded-lg bg-[#252C36] hover:bg-[#2F3744] text-[#F3EFE6] font-medium text-sm border border-[#F3EFE6]/10 transition-colors cursor-pointer whitespace-nowrap"
            >
              Analisar Tabuleiro
            </button>
            <button
              type="button"
              onClick={onMainMenu}
              className="min-h-[42px] py-2 px-3 rounded-lg bg-transparent hover:bg-[#F3EFE6]/5 text-[#B4ADA0] hover:text-[#F3EFE6] font-medium text-sm border border-[#F3EFE6]/12 transition-colors cursor-pointer whitespace-nowrap"
            >
              Menu Principal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
