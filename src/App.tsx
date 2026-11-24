import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Handshake,
  Lightbulb,
  Pause,
  RotateCcw,
  RotateCw,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { soundEngine } from './audio/soundEngine';
import { ChessBoard } from './components/ChessBoard';
import { ChessPieceIcon } from './components/ChessPieces';
import { GameOverModal, PauseModal, PromotionModal } from './components/GameModals';
import { PlayerStrip } from './components/PlayerStrip';
import { TitleScreen } from './components/TitleScreen';
import { chooseAIMove, getBestHintMove } from './engine/chessAI';
import {
  applyMove,
  createInitialState,
  getLegalMovesForSquare,
  getMaterialSummary,
  oppositeColor,
  undoMoves,
} from './engine/chessEngine';
import {
  ChessState,
  Color,
  GameSettings,
  Move,
  PieceType,
  ScreenState,
  TimeControlConfig,
  TimeControlId,
} from './engine/types';

const TIME_CONTROLS: Record<TimeControlId, TimeControlConfig> = {
  unlimited: { id: 'unlimited', label: 'Sem Relógio', initialMs: 0, incrementMs: 0 },
  rapid_10: { id: 'rapid_10', label: '10 min', initialMs: 10 * 60 * 1000, incrementMs: 0 },
  blitz_5_3: { id: 'blitz_5_3', label: '5 min + 3s', initialMs: 5 * 60 * 1000, incrementMs: 3000 },
};

const DIFFICULTY_LABELS = {
  iniciante: 'IA Iniciante',
  tatico: 'IA Tática',
  mestre: 'IA Mestre',
} as const;

const TERMINAL_STATUSES = new Set([
  'checkmate',
  'stalemate',
  'insufficient_material',
  'threefold_repetition',
  'fifty_move',
  'timeout',
  'resigned',
  'draw_agreement',
]);

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('TITLE_MENU');
  const [settings, setSettings] = useState<GameSettings>({
    mode: 'ai',
    difficulty: 'tatico',
    playerSide: 'w',
    timeControl: 'rapid_10',
  });

  const [humanSide, setHumanSide] = useState<Color>('w');
  const [flipped, setFlipped] = useState(false);
  const [chess, setChess] = useState<ChessState>(() => createInitialState());
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: number; to: number } | null>(
    null
  );
  const [hintMove, setHintMove] = useState<Move | null>(null);
  const [viewPly, setViewPly] = useState<number | null>(null);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [inspectingBoard, setInspectingBoard] = useState(false);

  const [clocks, setClocks] = useState<{ w: number | null; b: number | null }>({
    w: null,
    b: null,
  });

  const aiTimeoutRef = useRef<number | null>(null);
  const historyListRef = useRef<HTMLDivElement | null>(null);

  const isTerminal = TERMINAL_STATUSES.has(chess.status);

  const clearAITimer = useCallback(() => {
    if (aiTimeoutRef.current !== null) {
      window.clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }
    setIsAIThinking(false);
  }, []);

  const startNewGame = useCallback(
    (overrideSettings?: GameSettings) => {
      clearAITimer();
      const activeSettings = overrideSettings || settings;
      let resolvedHuman: Color = 'w';
      if (activeSettings.mode === 'ai') {
        if (activeSettings.playerSide === 'random') {
          resolvedHuman = Math.random() < 0.5 ? 'w' : 'b';
        } else {
          resolvedHuman = activeSettings.playerSide;
        }
      }

      const tc = TIME_CONTROLS[activeSettings.timeControl];
      const initialClock = tc.id === 'unlimited' ? null : tc.initialMs;

      setHumanSide(resolvedHuman);
      setFlipped(activeSettings.mode === 'ai' && resolvedHuman === 'b');
      setChess(createInitialState());
      setSelectedSquare(null);
      setPendingPromotion(null);
      setHintMove(null);
      setViewPly(null);
      setInspectingBoard(false);
      setClocks({ w: initialClock, b: initialClock });
      setScreen('PLAYING');
    },
    [clearAITimer, settings]
  );

  // Clean up AI timer on unmount
  useEffect(() => {
    return () => clearAITimer();
  }, [clearAITimer]);

  // Scroll move history to bottom when a new move arrives
  useEffect(() => {
    if (historyListRef.current && viewPly === null) {
      historyListRef.current.scrollTop = historyListRef.current.scrollHeight;
    }
  }, [chess.history.length, viewPly]);

  // Play sound & transition to GAME_OVER when reaching a terminal state
  const commitMove = useCallback(
    (move: Move) => {
      setHintMove(null);
      setSelectedSquare(null);
      setPendingPromotion(null);
      setViewPly(null);

      setChess((prev) => {
        if (TERMINAL_STATUSES.has(prev.status)) return prev;
        const movingColor = prev.turn;
        const next = applyMove(prev, move, true);

        // Apply increment if timed
        const tc = TIME_CONTROLS[settings.timeControl];
        if (tc.incrementMs > 0) {
          setClocks((c) => ({
            ...c,
            [movingColor]: c[movingColor] !== null ? (c[movingColor] as number) + tc.incrementMs : null,
          }));
        }

        // Audio feedback
        if (next.status === 'checkmate') {
          const humanWon = settings.mode === 'local' || next.winner === humanSide;
          soundEngine.playGameEnd(humanWon);
        } else if (TERMINAL_STATUSES.has(next.status)) {
          soundEngine.playGameEnd(false);
        } else if (next.status === 'check') {
          soundEngine.playCheck();
        } else if (move.promotion) {
          soundEngine.playPromote();
        } else if (move.isCastle) {
          soundEngine.playCastle();
        } else if (move.captured || move.isEnPassant) {
          soundEngine.playCapture();
        } else {
          soundEngine.playMove();
        }

        if (TERMINAL_STATUSES.has(next.status)) {
          setScreen('GAME_OVER');
        }

        return next;
      });
    },
    [humanSide, settings.mode, settings.timeControl]
  );

  // Trigger AI move when it's AI's turn
  useEffect(() => {
    if (screen !== 'PLAYING' || isTerminal) return;
    if (settings.mode !== 'ai') return;
    const aiColor = oppositeColor(humanSide);
    if (chess.turn !== aiColor) return;

    setIsAIThinking(true);
    const delay = settings.difficulty === 'iniciante' ? 380 : 520;
    aiTimeoutRef.current = window.setTimeout(() => {
      const move = chooseAIMove(chess, settings.difficulty);
      setIsAIThinking(false);
      if (move) {
        commitMove(move);
      }
    }, delay);

    return () => {
      if (aiTimeoutRef.current !== null) {
        window.clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
      setIsAIThinking(false);
    };
  }, [chess, commitMove, humanSide, isTerminal, screen, settings.difficulty, settings.mode]);

  // Clock countdown loop
  useEffect(() => {
    if (screen !== 'PLAYING' || isTerminal) return;
    if (settings.timeControl === 'unlimited') return;

    let lastTick = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(now - lastTick, 250);
      lastTick = now;

      setClocks((prev) => {
        const active = chess.turn;
        const currentVal = prev[active];
        if (currentVal === null) return prev;
        const nextVal = Math.max(0, currentVal - dt);

        if (nextVal === 0) {
          window.clearInterval(interval);
          setChess((c) => {
            if (TERMINAL_STATUSES.has(c.status)) return c;
            soundEngine.playGameEnd(false);
            return {
              ...c,
              status: 'timeout',
              winner: oppositeColor(active),
            };
          });
          setScreen('GAME_OVER');
        }

        return {
          ...prev,
          [active]: nextVal,
        };
      });
    }, 100);

    return () => window.clearInterval(interval);
  }, [chess.turn, isTerminal, screen, settings.timeControl]);

  // Displayed board state (supports inspecting historical plies)
  const displayedBoard = useMemo(() => {
    if (viewPly === null) return chess.board;
    if (viewPly === 0) return createInitialState().board;
    return chess.history[viewPly - 1]?.boardAfter || chess.board;
  }, [chess.board, chess.history, viewPly]);

  const displayedLastMove = useMemo(() => {
    if (viewPly === null) {
      return chess.history.length > 0 ? chess.history[chess.history.length - 1].move : null;
    }
    if (viewPly === 0) return null;
    return chess.history[viewPly - 1]?.move || null;
  }, [chess.history, viewPly]);

  const displayedKingCheckSq = useMemo(() => {
    if (viewPly === null) return chess.kingInCheckSquare;
    if (viewPly === 0) return null;
    return chess.history[viewPly - 1]?.kingInCheckSquare ?? null;
  }, [chess.history, chess.kingInCheckSquare, viewPly]);

  const isViewingLive = viewPly === null;
  const isHumanTurn =
    screen === 'PLAYING' &&
    !isTerminal &&
    isViewingLive &&
    (settings.mode === 'local' || chess.turn === humanSide);

  const legalMovesForSelected = useMemo(() => {
    if (selectedSquare === null || !isHumanTurn) return [];
    return getLegalMovesForSquare(chess, selectedSquare);
  }, [chess, isHumanTurn, selectedSquare]);

  const handleSquareSelect = useCallback(
    (sq: number) => {
      if (!isHumanTurn) return;
      const piece = chess.board[sq];
      if (piece && piece.color === chess.turn) {
        setSelectedSquare(sq);
      } else {
        setSelectedSquare(null);
      }
    },
    [chess.board, chess.turn, isHumanTurn]
  );

  const handleExecuteMove = useCallback(
    (move: Move) => {
      if (!isHumanTurn) return;
      if (move.promotion) {
        setPendingPromotion({ from: move.from, to: move.to });
        return;
      }
      commitMove(move);
    },
    [commitMove, isHumanTurn]
  );

  const handlePromotionPick = useCallback(
    (pieceType: PieceType) => {
      if (!pendingPromotion) return;
      const legal = getLegalMovesForSquare(chess, pendingPromotion.from);
      const match = legal.find(
        (m) => m.to === pendingPromotion.to && m.promotion === pieceType
      );
      if (match) {
        commitMove(match);
      } else {
        setPendingPromotion(null);
      }
    },
    [chess, commitMove, pendingPromotion]
  );

  const handleUndo = useCallback(() => {
    if (chess.history.length === 0 || isTerminal) return;
    clearAITimer();
    setHintMove(null);
    setSelectedSquare(null);
    setPendingPromotion(null);
    setViewPly(null);

    if (settings.mode === 'ai') {
      const aiColor = oppositeColor(humanSide);
      const plies = chess.turn === aiColor ? 1 : Math.min(2, chess.history.length);
      setChess((prev) => undoMoves(prev, plies));
    } else {
      setChess((prev) => undoMoves(prev, 1));
    }
  }, [chess.history.length, chess.turn, clearAITimer, humanSide, isTerminal, settings.mode]);

  const handleHint = useCallback(() => {
    if (!isHumanTurn) return;
    const best = getBestHintMove(chess);
    if (best) {
      setHintMove(best);
      setSelectedSquare(best.from);
    }
  }, [chess, isHumanTurn]);

  const handleResign = useCallback(() => {
    if (isTerminal) return;
    clearAITimer();
    const loser = settings.mode === 'ai' ? humanSide : chess.turn;
    soundEngine.playGameEnd(false);
    setChess((prev) => ({
      ...prev,
      status: 'resigned',
      winner: oppositeColor(loser),
    }));
    setInspectingBoard(false);
    setScreen('GAME_OVER');
  }, [chess.turn, clearAITimer, humanSide, isTerminal, settings.mode]);

  const handleDrawAgreement = useCallback(() => {
    if (isTerminal) return;
    clearAITimer();
    soundEngine.playGameEnd(false);
    setChess((prev) => ({
      ...prev,
      status: 'draw_agreement',
      winner: 'draw',
    }));
    setInspectingBoard(false);
    setScreen('GAME_OVER');
  }, [clearAITimer, isTerminal]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  // Keyboard shortcuts during gameplay
  useEffect(() => {
    if (screen === 'TITLE_MENU') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (pendingPromotion) {
          setPendingPromotion(null);
          return;
        }
        if (screen === 'PLAYING') setScreen('PAUSED');
        else if (screen === 'PAUSED') setScreen('PLAYING');
        return;
      }
      if (screen !== 'PLAYING') return;
      const lower = e.key.toLowerCase();
      if (lower === 'z') handleUndo();
      else if (lower === 'h') handleHint();
      else if (lower === 'f') setFlipped((f) => !f);
      else if (lower === 'm') toggleMute();
      else if (e.key === 'ArrowLeft') {
        setViewPly((p) => {
          const cur = p === null ? chess.history.length : p;
          return Math.max(0, cur - 1);
        });
      } else if (e.key === 'ArrowRight') {
        setViewPly((p) => {
          if (p === null) return null;
          const next = p + 1;
          return next >= chess.history.length ? null : next;
        });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [chess.history.length, handleHint, handleUndo, pendingPromotion, screen, toggleMute]);

  const material = useMemo(() => getMaterialSummary(displayedBoard), [displayedBoard]);

  // Move pairs for 2-column algebraic display
  const movePairs = useMemo(() => {
    const pairs: { moveNumber: number; white?: string; black?: string; wPly: number; bPly?: number }[] = [];
    for (let i = 0; i < chess.history.length; i += 2) {
      pairs.push({
        moveNumber: i / 2 + 1,
        white: chess.history[i]?.san,
        black: chess.history[i + 1]?.san,
        wPly: i + 1,
        bPly: chess.history[i + 1] ? i + 2 : undefined,
      });
    }
    return pairs;
  }, [chess.history]);

  if (screen === 'TITLE_MENU') {
    return (
      <TitleScreen
        settings={settings}
        onUpdateSettings={setSettings}
        onStartGame={() => startNewGame()}
      />
    );
  }

  const whiteLabel =
    settings.mode === 'ai'
      ? humanSide === 'w'
        ? 'Você'
        : DIFFICULTY_LABELS[settings.difficulty]
      : 'Jogador 1 (Brancas)';
  const blackLabel =
    settings.mode === 'ai'
      ? humanSide === 'b'
        ? 'Você'
        : DIFFICULTY_LABELS[settings.difficulty]
      : 'Jogador 2 (Pretas)';

  const topColor: Color = flipped ? 'w' : 'b';
  const bottomColor: Color = flipped ? 'b' : 'w';

  const getPlayerProps = (c: Color) => {
    const isWhite = c === 'w';
    const isBot = settings.mode === 'ai' && c !== humanSide;
    return {
      name: isWhite ? whiteLabel : blackLabel,
      subtitle: isWhite ? 'Peças Brancas' : 'Peças Pretas',
      color: c,
      isActiveTurn: !isTerminal && isViewingLive && chess.turn === c,
      isThinking: isBot && isAIThinking,
      capturedPieces: isWhite ? material.capturedByWhite : material.capturedByBlack,
      materialAdvantage: isWhite
        ? Math.max(0, material.whiteAdvantage)
        : Math.max(0, -material.whiteAdvantage),
      timeMs: clocks[c],
      isLowTime: clocks[c] !== null && (clocks[c] as number) <= 30000,
    };
  };

  const statusText = (() => {
    if (chess.status === 'check') {
      return `Xeque às ${chess.turn === 'w' ? 'Brancas' : 'Pretas'}`;
    }
    if (chess.status === 'checkmate') {
      return `Xeque-Mate · Vitória das ${chess.winner === 'w' ? 'Brancas' : 'Pretas'}`;
    }
    if (isTerminal) {
      return chess.winner === 'draw'
        ? 'Partida Empatada'
        : `Vitória das ${chess.winner === 'w' ? 'Brancas' : 'Pretas'}`;
    }
    if (!isViewingLive) {
      return `Inspecionando lance ${viewPly} de ${chess.history.length}`;
    }
    return `Lance ${chess.fullmoveNumber} · Vez das ${chess.turn === 'w' ? 'Brancas' : 'Pretas'}`;
  })();

  return (
    <div className="w-full min-h-screen bg-[#111418] text-[#F3EFE6] flex items-center justify-center p-3 sm:p-5 lg:p-6">
      <div className="w-full max-w-[1200px] flex flex-col lg:flex-row items-center lg:items-stretch justify-center gap-5 lg:gap-7">
        {/* Left/Center: Board Column (unobstructed primary playfield) */}
        <div className="flex flex-col items-center gap-2.5 shrink-0">
          <div className="w-full max-w-[632px]">
            <PlayerStrip {...getPlayerProps(topColor)} />
          </div>

          <ChessBoard
            board={displayedBoard}
            flipped={flipped}
            interactive={isHumanTurn}
            selectedSquare={isViewingLive ? selectedSquare : null}
            legalMovesForSelected={legalMovesForSelected}
            lastMove={displayedLastMove}
            kingInCheckSquare={displayedKingCheckSq}
            hintMove={isViewingLive ? hintMove : null}
            onSquareSelect={handleSquareSelect}
            onExecuteMove={handleExecuteMove}
          />

          <div className="w-full max-w-[632px]">
            <PlayerStrip {...getPlayerProps(bottomColor)} />
          </div>
        </div>

        {/* Right: Structured Parlor Control & Notation Panel */}
        <aside
          aria-label="Painel da partida"
          className="w-full max-w-[632px] lg:w-[360px] lg:max-h-[756px] flex flex-col bg-[#161A20] border border-[#F3EFE6]/12 rounded-xl overflow-hidden shadow-xl"
        >
          {/* Compact Match Header */}
          <div className="px-4 py-3.5 border-b border-[#F3EFE6]/10 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-display text-lg font-semibold text-[#F7F3EA] leading-tight truncate">
                Xadrez Soberano
              </div>
              <div
                className={`text-xs mt-0.5 truncate ${
                  chess.status === 'check' || chess.status === 'checkmate'
                    ? 'text-[#FCA5A5] font-medium'
                    : 'text-[#A9A294]'
                }`}
              >
                {statusText}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={toggleMute}
                title={muted ? 'Ativar som (M)' : 'Silenciar som (M)'}
                aria-label={muted ? 'Ativar som' : 'Silenciar som'}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#111418] hover:bg-[#252C36] border border-[#F3EFE6]/10 text-[#C5BEB0] hover:text-[#F7F3EA] transition-colors cursor-pointer"
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setScreen('PAUSED')}
                title="Pausar (Esc)"
                aria-label="Pausar partida"
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#111418] hover:bg-[#252C36] border border-[#F3EFE6]/10 text-[#C5BEB0] hover:text-[#F7F3EA] transition-colors cursor-pointer"
              >
                <Pause className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Move History Table */}
          <div className="flex-1 min-h-[180px] flex flex-col overflow-hidden">
            <div className="px-4 py-2 bg-[#12161B] border-b border-[#F3EFE6]/8 flex items-center justify-between text-xs font-medium text-[#8E877B]">
              <span>Histórico de Lances</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={chess.history.length === 0 || viewPly === 0}
                  onClick={() =>
                    setViewPly((p) => {
                      const cur = p === null ? chess.history.length : p;
                      return Math.max(0, cur - 1);
                    })
                  }
                  aria-label="Lance anterior"
                  className="p-1.5 rounded hover:bg-[#F3EFE6]/8 disabled:opacity-30 cursor-pointer disabled:cursor-default"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={viewPly === null}
                  onClick={() =>
                    setViewPly((p) => {
                      if (p === null) return null;
                      return p + 1 >= chess.history.length ? null : p + 1;
                    })
                  }
                  aria-label="Próximo lance"
                  className="p-1.5 rounded hover:bg-[#F3EFE6]/8 disabled:opacity-30 cursor-pointer disabled:cursor-default"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              ref={historyListRef}
              className="flex-1 overflow-y-auto chess-scroll px-3 py-2 space-y-0.5"
            >
              {movePairs.length === 0 ? (
                <div className="h-full min-h-[130px] flex flex-col items-center justify-center text-center px-4 text-xs text-[#7D766A] space-y-1.5">
                  <div className="w-8 h-8 opacity-45">
                    <ChessPieceIcon color="w" type="n" />
                  </div>
                  <span>As Brancas iniciam a partida.</span>
                </div>
              ) : (
                movePairs.map((pair) => {
                  const activePly = viewPly === null ? chess.history.length : viewPly;
                  return (
                    <div
                      key={pair.moveNumber}
                      className="grid grid-cols-[36px_1fr_1fr] items-center gap-1 text-sm font-mono-tabular"
                    >
                      <span className="text-xs text-[#7D766A] pl-1">{pair.moveNumber}.</span>
                      <button
                        type="button"
                        onClick={() =>
                          setViewPly(pair.wPly === chess.history.length ? null : pair.wPly)
                        }
                        className={`text-left px-2.5 py-1.5 rounded transition-colors cursor-pointer ${
                          activePly === pair.wPly
                            ? 'bg-[#D4A24C]/22 text-[#F7F3EA] font-semibold'
                            : 'text-[#D6CFC2] hover:bg-[#F3EFE6]/6'
                        }`}
                      >
                        {pair.white}
                      </button>
                      {pair.black && pair.bPly ? (
                        <button
                          type="button"
                          onClick={() =>
                            setViewPly(pair.bPly === chess.history.length ? null : pair.bPly!)
                          }
                          className={`text-left px-2.5 py-1.5 rounded transition-colors cursor-pointer ${
                            activePly === pair.bPly
                              ? 'bg-[#D4A24C]/22 text-[#F7F3EA] font-semibold'
                              : 'text-[#D6CFC2] hover:bg-[#F3EFE6]/6'
                          }`}
                        >
                          {pair.black}
                        </button>
                      ) : (
                        <span />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {!isViewingLive && (
              <div className="px-3 py-2 bg-[#1E242D] border-t border-[#D4A24C]/30 flex items-center justify-between gap-2">
                <span className="text-xs text-[#D4A24C]">Modo de inspeção</span>
                <button
                  type="button"
                  onClick={() => setViewPly(null)}
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-[#D4A24C] text-[#111418] cursor-pointer whitespace-nowrap"
                >
                  Voltar ao Atual
                </button>
              </div>
            )}
          </div>

          {/* Primary Tactical Actions */}
          <div className="p-3.5 border-t border-[#F3EFE6]/10 bg-[#12161B] space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={chess.history.length === 0 || isTerminal}
                title="Desfazer lance (Z)"
                className="min-h-[42px] px-2.5 py-2 rounded-lg bg-[#1C222A] hover:bg-[#262E39] disabled:opacity-40 text-xs font-medium text-[#EFEAE0] border border-[#F3EFE6]/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:cursor-default whitespace-nowrap shrink-0"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Desfazer</span>
              </button>

              <button
                type="button"
                onClick={handleHint}
                disabled={!isHumanTurn}
                title="Sugerir melhor lance (H)"
                className="min-h-[42px] px-2.5 py-2 rounded-lg bg-[#1C222A] hover:bg-[#262E39] disabled:opacity-40 text-xs font-medium text-[#EFEAE0] border border-[#F3EFE6]/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:cursor-default whitespace-nowrap shrink-0"
              >
                <Lightbulb className="w-3.5 h-3.5 text-[#D4A24C]" />
                <span>Dica</span>
              </button>

              <button
                type="button"
                onClick={() => setFlipped((f) => !f)}
                title="Girar tabuleiro (F)"
                className="min-h-[42px] px-2.5 py-2 rounded-lg bg-[#1C222A] hover:bg-[#262E39] text-xs font-medium text-[#EFEAE0] border border-[#F3EFE6]/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Girar</span>
              </button>
            </div>

            {!isTerminal ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDrawAgreement}
                  className="min-h-[42px] px-3 py-2 rounded-lg bg-transparent hover:bg-[#F3EFE6]/5 text-xs font-medium text-[#B4ADA0] hover:text-[#F3EFE6] border border-[#F3EFE6]/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Handshake className="w-3.5 h-3.5" />
                  <span>Empatar</span>
                </button>
                <button
                  type="button"
                  onClick={handleResign}
                  className="min-h-[42px] px-3 py-2 rounded-lg bg-transparent hover:bg-[#7F1D1D]/30 text-xs font-medium text-[#FCA5A5]/85 hover:text-[#FCA5A5] border border-[#EF4444]/20 flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Desistir</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => startNewGame()}
                className="w-full min-h-[42px] px-4 py-2 rounded-lg bg-[#D4A24C] hover:bg-[#DFB262] text-sm font-semibold text-[#111418] flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Jogar Novamente</span>
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* Promotion Modal */}
      {pendingPromotion && (
        <PromotionModal
          color={chess.turn}
          onSelect={handlePromotionPick}
          onCancel={() => setPendingPromotion(null)}
        />
      )}

      {/* Pause Modal */}
      {screen === 'PAUSED' && (
        <PauseModal
          onResume={() => setScreen('PLAYING')}
          onRestart={() => startNewGame()}
          onMainMenu={() => {
            clearAITimer();
            setScreen('TITLE_MENU');
          }}
        />
      )}

      {/* Game Over Modal */}
      {screen === 'GAME_OVER' && !inspectingBoard && (
        <GameOverModal
          status={chess.status}
          winner={chess.winner}
          totalMoves={chess.history.length}
          whiteLabel={whiteLabel}
          blackLabel={blackLabel}
          onPlayAgain={() => startNewGame()}
          onInspectBoard={() => {
            setInspectingBoard(true);
            setScreen('PLAYING');
          }}
          onMainMenu={() => {
            clearAITimer();
            setScreen('TITLE_MENU');
          }}
        />
      )}
    </div>
  );
}
