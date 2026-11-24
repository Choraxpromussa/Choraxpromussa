import React from 'react';
import { Color, PieceType } from '../engine/types';
import { ChessPieceIcon } from './ChessPieces';

interface PlayerStripProps {
  name: string;
  subtitle: string;
  color: Color;
  isActiveTurn: boolean;
  isThinking?: boolean;
  capturedPieces: PieceType[];
  materialAdvantage: number;
  timeMs: number | null;
  isLowTime: boolean;
}

export function formatClock(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const PlayerStrip: React.FC<PlayerStripProps> = ({
  name,
  subtitle,
  color,
  isActiveTurn,
  isThinking = false,
  capturedPieces,
  materialAdvantage,
  timeMs,
  isLowTime,
}) => {
  const opponentColor: Color = color === 'w' ? 'b' : 'w';

  return (
    <div
      className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border transition-colors ${
        isActiveTurn
          ? 'bg-[#1D232B] border-[#D4A24C]/55'
          : 'bg-[#161A20] border-[#F3EFE6]/10'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Piece emblem */}
        <div
          className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 border ${
            color === 'w'
              ? 'bg-[#EAE0CE] border-[#F3EFE6]/30'
              : 'bg-[#2B241E] border-[#F3EFE6]/15'
          }`}
        >
          <div className="w-7 h-7">
            <ChessPieceIcon color={color} type="k" />
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#F7F3EA] truncate">{name}</span>
            {isActiveTurn && (
              <span className="text-xs font-medium text-[#D4A24C] whitespace-nowrap shrink-0">
                {isThinking ? '· Pensando...' : '· Sua vez'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 min-h-[18px] mt-0.5">
            {capturedPieces.length > 0 ? (
              <div className="flex items-center flex-wrap gap-0.5">
                {capturedPieces.map((pt, idx) => (
                  <div key={`${pt}-${idx}`} className="w-4 h-4">
                    <ChessPieceIcon color={opponentColor} type={pt} />
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-xs text-[#8E877B] truncate">{subtitle}</span>
            )}

            {materialAdvantage > 0 && (
              <span className="text-xs font-mono-tabular font-semibold text-[#D4A24C] ml-1 whitespace-nowrap">
                +{materialAdvantage}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Clock */}
      {timeMs !== null && (
        <div
          aria-label={`Relógio ${name}`}
          className={`px-3 py-1.5 rounded-md font-mono-tabular text-base sm:text-lg font-semibold tracking-tight shrink-0 border ${
            isLowTime && isActiveTurn
              ? 'bg-[#7F1D1D]/45 text-[#FCA5A5] border-[#EF4444]/50'
              : isActiveTurn
                ? 'bg-[#111418] text-[#F7F3EA] border-[#D4A24C]/45'
                : 'bg-[#111418]/70 text-[#9D9689] border-[#F3EFE6]/8'
          }`}
        >
          {formatClock(timeMs)}
        </div>
      )}
    </div>
  );
};
