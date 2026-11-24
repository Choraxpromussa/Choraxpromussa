import React, { useCallback, useEffect, useRef, useState } from 'react';
import { sqToRowCol } from '../engine/chessEngine';
import { Move, Piece, Square } from '../engine/types';
import { ChessPieceIcon } from './ChessPieces';

interface ChessBoardProps {
  board: Square[];
  flipped: boolean;
  interactive: boolean;
  selectedSquare: number | null;
  legalMovesForSelected: Move[];
  lastMove: Move | null;
  kingInCheckSquare: number | null;
  hintMove: Move | null;
  onSquareSelect: (sq: number) => void;
  onExecuteMove: (move: Move) => void;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

interface DragState {
  fromSq: number;
  piece: Piece;
  startX: number;
  startY: number;
  currX: number;
  currY: number;
  active: boolean;
  squareSize: number;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  board,
  flipped,
  interactive,
  selectedSquare,
  legalMovesForSelected,
  lastMove,
  kingInCheckSquare,
  hintMove,
  onSquareSelect,
  onExecuteMove,
}) => {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;

  const legalMap = new Map<number, Move[]>();
  for (const m of legalMovesForSelected) {
    const arr = legalMap.get(m.to) || [];
    arr.push(m);
    legalMap.set(m.to, arr);
  }

  const getSquareFromCoords = useCallback(
    (clientX: number, clientY: number): number | null => {
      const el = boardRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        return null;
      }
      const colVisual = Math.min(7, Math.max(0, Math.floor(((clientX - rect.left) / rect.width) * 8)));
      const rowVisual = Math.min(7, Math.max(0, Math.floor(((clientY - rect.top) / rect.height) * 8)));
      const row = flipped ? 7 - rowVisual : rowVisual;
      const col = flipped ? 7 - colVisual : colVisual;
      return row * 8 + col;
    },
    [flipped]
  );

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const curr = dragRef.current;
      if (!curr) return;
      const dx = e.clientX - curr.startX;
      const dy = e.clientY - curr.startY;
      const movedEnough = curr.active || Math.hypot(dx, dy) > 6;
      setDrag({
        ...curr,
        currX: e.clientX,
        currY: e.clientY,
        active: movedEnough,
      });
    };

    const handlePointerUp = (e: PointerEvent) => {
      const curr = dragRef.current;
      if (!curr) return;
      if (curr.active) {
        const dropSq = getSquareFromCoords(e.clientX, e.clientY);
        if (dropSq !== null && dropSq !== curr.fromSq) {
          const matching = legalMovesForSelected.filter(
            (m) => m.from === curr.fromSq && m.to === dropSq
          );
          if (matching.length > 0) {
            onExecuteMove(matching[0]);
          }
        }
      }
      setDrag(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [getSquareFromCoords, legalMovesForSelected, onExecuteMove]);

  const handleSquarePointerDown = (e: React.PointerEvent, sq: number) => {
    if (!interactive) return;

    // If clicking a legal destination for already-selected piece
    const matchingTarget = legalMap.get(sq);
    if (selectedSquare !== null && selectedSquare !== sq && matchingTarget && matchingTarget.length > 0) {
      onExecuteMove(matchingTarget[0]);
      return;
    }

    onSquareSelect(sq);

    const piece = board[sq];
    if (piece && boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      setDrag({
        fromSq: sq,
        piece,
        startX: e.clientX,
        startY: e.clientY,
        currX: e.clientX,
        currY: e.clientY,
        active: false,
        squareSize: rect.width / 8,
      });
    }
  };

  // Build visual order of 64 squares
  const visualSquares: number[] = [];
  for (let vr = 0; vr < 8; vr++) {
    for (let vc = 0; vc < 8; vc++) {
      const r = flipped ? 7 - vr : vr;
      const c = flipped ? 7 - vc : vc;
      visualSquares.push(r * 8 + c);
    }
  }

  return (
    <div className="relative select-none p-2 sm:p-3 rounded-xl bg-[#241D17] border border-[#F3EFE6]/14 shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
      <div
        ref={boardRef}
        role="grid"
        aria-label="Tabuleiro de xadrez"
        className="grid grid-cols-8 grid-rows-8 w-[min(88vw,74vh,608px)] h-[min(88vw,74vh,608px)] min-w-[352px] min-h-[352px] rounded-md overflow-hidden border border-[#120E0A]"
      >
        {visualSquares.map((sq, idx) => {
          const [r, c] = sqToRowCol(sq);
          const isLight = (r + c) % 2 === 0;
          const piece = board[sq];
          const isSelected = selectedSquare === sq;
          const isLastFrom = lastMove?.from === sq;
          const isLastTo = lastMove?.to === sq;
          const isCheck = kingInCheckSquare === sq;
          const isHint = hintMove && (hintMove.from === sq || hintMove.to === sq);
          const legalTargets = legalMap.get(sq);
          const isLegalQuiet = Boolean(legalTargets && legalTargets.length > 0 && !piece && !legalTargets[0].isEnPassant);
          const isLegalCapture = Boolean(
            legalTargets && legalTargets.length > 0 && (piece || legalTargets[0].isEnPassant)
          );
          const isDraggingSource = drag?.active && drag.fromSq === sq;

          const vr = Math.floor(idx / 8);
          const vc = idx % 8;
          const showRankLabel = vc === 0;
          const showFileLabel = vr === 7;

          let bgClass = isLight ? 'bg-[#EAE0CE]' : 'bg-[#7D5E44]';
          if (isLastFrom || isLastTo) {
            bgClass = isLight ? 'bg-[#E3CE8D]' : 'bg-[#9E7C44]';
          }
          if (isSelected) {
            bgClass = isLight ? 'bg-[#D7C072]' : 'bg-[#B08A43]';
          }

          return (
            <button
              key={sq}
              type="button"
              onPointerDown={(e) => handleSquarePointerDown(e, sq)}
              aria-label={`Casa ${FILES[c]}${RANKS[r]}${piece ? `, peça` : ''}`}
              className={`relative flex items-center justify-center p-0 m-0 border-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D4A24C] ${bgClass} ${
                interactive ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              {/* Check highlight */}
              {isCheck && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-[radial-gradient(circle,rgba(220,38,38,0.85)_0%,rgba(185,28,28,0.45)_58%,transparent_78%)] pointer-events-none"
                />
              )}

              {/* Hint highlight */}
              {isHint && (
                <span
                  aria-hidden="true"
                  className="absolute inset-1 rounded-sm border-2 border-[#38BDF8] shadow-[inset_0_0_8px_rgba(56,189,248,0.5)] pointer-events-none z-10"
                />
              )}

              {/* Rank coordinate */}
              {showRankLabel && (
                <span
                  aria-hidden="true"
                  className={`absolute top-1 left-1.5 text-[10px] sm:text-[11px] font-mono-tabular font-semibold leading-none pointer-events-none ${
                    isLight ? 'text-[#6A4F38]' : 'text-[#E7DAC4]'
                  }`}
                >
                  {RANKS[r]}
                </span>
              )}

              {/* File coordinate */}
              {showFileLabel && (
                <span
                  aria-hidden="true"
                  className={`absolute bottom-1 right-1.5 text-[10px] sm:text-[11px] font-mono-tabular font-semibold leading-none pointer-events-none ${
                    isLight ? 'text-[#6A4F38]' : 'text-[#E7DAC4]'
                  }`}
                >
                  {FILES[c]}
                </span>
              )}

              {/* Piece */}
              {piece && !isDraggingSource && (
                <div className="w-[82%] h-[82%] transition-transform duration-150 ease-out pointer-events-none z-[2]">
                  <ChessPieceIcon color={piece.color} type={piece.type} />
                </div>
              )}

              {/* Legal quiet move dot */}
              {isLegalQuiet && (
                <span
                  aria-hidden="true"
                  className="w-[26%] h-[26%] rounded-full bg-[#14171C]/35 ring-1 ring-[#F3EFE6]/25 pointer-events-none z-[3]"
                />
              )}

              {/* Legal capture ring */}
              {isLegalCapture && (
                <span
                  aria-hidden="true"
                  className="absolute inset-[6%] rounded-full border-[4px] border-[#14171C]/45 pointer-events-none z-[3]"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Floating dragged piece */}
      {drag?.active && (
        <div
          aria-hidden="true"
          className="fixed top-0 left-0 pointer-events-none z-50"
          style={{
            width: drag.squareSize * 0.92,
            height: drag.squareSize * 0.92,
            transform: `translate3d(${drag.currX - (drag.squareSize * 0.92) / 2}px, ${
              drag.currY - (drag.squareSize * 0.92) / 2
            }px, 0) scale(1.08)`,
          }}
        >
          <ChessPieceIcon color={drag.piece.color} type={drag.piece.type} />
        </div>
      )}
    </div>
  );
};
