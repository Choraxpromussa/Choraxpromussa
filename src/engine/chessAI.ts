import { applyMove, generateLegalMoves, sqToRowCol } from './chessEngine';
import { ChessState, Difficulty, Move, PieceType } from './types';

const AI_PIECE_VALUES: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-Square Tables (White perspective, row 0 = rank 8, row 7 = rank 1)
const PAWN_PST = [
  0, 0, 0, 0, 0, 0, 0, 0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5, 5, 10, 25, 25, 10, 5, 5,
  0, 0, 0, 22, 22, 0, 0, 0,
  5, -5, -10, 0, 0, -10, -5, 5,
  5, 10, 10, -20, -20, 10, 10, 5,
  0, 0, 0, 0, 0, 0, 0, 0,
];

const KNIGHT_PST = [
  -50, -40, -30, -30, -30, -30, -40, -50,
  -40, -20, 0, 0, 0, 0, -20, -40,
  -30, 0, 10, 15, 15, 10, 0, -30,
  -30, 5, 15, 20, 20, 15, 5, -30,
  -30, 0, 15, 20, 20, 15, 0, -30,
  -30, 5, 10, 15, 15, 10, 5, -30,
  -40, -20, 0, 5, 5, 0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50,
];

const BISHOP_PST = [
  -20, -10, -10, -10, -10, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 10, 10, 5, 0, -10,
  -10, 5, 5, 10, 10, 5, 5, -10,
  -10, 0, 10, 10, 10, 10, 0, -10,
  -10, 10, 10, 10, 10, 10, 10, -10,
  -10, 5, 0, 0, 0, 0, 5, -10,
  -20, -10, -10, -10, -10, -10, -10, -20,
];

const ROOK_PST = [
  0, 0, 0, 0, 0, 0, 0, 0,
  5, 10, 10, 10, 10, 10, 10, 5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  0, 0, 0, 5, 5, 0, 0, 0,
];

const QUEEN_PST = [
  -20, -10, -10, -5, -5, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 5, 5, 5, 0, -10,
  -5, 0, 5, 5, 5, 5, 0, -5,
  0, 0, 5, 5, 5, 5, 0, -5,
  -10, 5, 5, 5, 5, 5, 0, -10,
  -10, 0, 5, 0, 0, 0, 0, -10,
  -20, -10, -10, -5, -5, -10, -10, -20,
];

const KING_MID_PST = [
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -20, -30, -30, -40, -40, -30, -30, -20,
  -10, -20, -20, -20, -20, -20, -20, -10,
  20, 20, 0, 0, 0, 0, 20, 20,
  20, 30, 10, 0, 0, 10, 30, 20,
];

const KING_END_PST = [
  -50, -40, -30, -20, -20, -30, -40, -50,
  -30, -20, -10, 0, 0, -10, -20, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -30, 0, 0, 0, 0, -30, -30,
  -50, -30, -30, -30, -30, -30, -30, -50,
];

function evaluateBoard(state: ChessState): number {
  if (state.status === 'checkmate') {
    return state.winner === 'w' ? 99999 : -99999;
  }
  if (
    state.status === 'stalemate' ||
    state.status === 'insufficient_material' ||
    state.status === 'threefold_repetition' ||
    state.status === 'fifty_move'
  ) {
    return 0;
  }

  let nonPawnMaterial = 0;
  for (let i = 0; i < 64; i++) {
    const p = state.board[i];
    if (p && p.type !== 'p' && p.type !== 'k') {
      nonPawnMaterial += AI_PIECE_VALUES[p.type];
    }
  }
  const isEndgame = nonPawnMaterial <= 2600;

  let score = 0;
  for (let i = 0; i < 64; i++) {
    const p = state.board[i];
    if (!p) continue;
    const [r, c] = sqToRowCol(i);
    const pstIdx = p.color === 'w' ? r * 8 + c : (7 - r) * 8 + c;

    let pst = 0;
    switch (p.type) {
      case 'p':
        pst = PAWN_PST[pstIdx];
        break;
      case 'n':
        pst = KNIGHT_PST[pstIdx];
        break;
      case 'b':
        pst = BISHOP_PST[pstIdx];
        break;
      case 'r':
        pst = ROOK_PST[pstIdx];
        break;
      case 'q':
        pst = QUEEN_PST[pstIdx];
        break;
      case 'k':
        pst = isEndgame ? KING_END_PST[pstIdx] : KING_MID_PST[pstIdx];
        break;
    }

    const total = AI_PIECE_VALUES[p.type] + pst;
    score += p.color === 'w' ? total : -total;
  }

  return score;
}

function scoreMoveForOrdering(move: Move): number {
  let s = 0;
  if (move.promotion) {
    s += AI_PIECE_VALUES[move.promotion] * 10;
  }
  if (move.captured) {
    // MVV-LVA
    s += 10 * AI_PIECE_VALUES[move.captured.type] - AI_PIECE_VALUES[move.piece.type];
  }
  if (move.isCastle) {
    s += 60;
  }
  return s;
}

function orderMoves(moves: Move[]): Move[] {
  return moves.slice().sort((a, b) => scoreMoveForOrdering(b) - scoreMoveForOrdering(a));
}

function quiescence(
  state: ChessState,
  alpha: number,
  beta: number,
  maximizing: boolean,
  qDepth: number
): number {
  const standPat = evaluateBoard(state);
  if (qDepth <= 0) return standPat;

  if (maximizing) {
    if (standPat >= beta) return beta;
    let a = Math.max(alpha, standPat);
    const captures = orderMoves(
      generateLegalMoves(state.board, state.turn, state.castling, state.epSquare).filter(
        (m) => m.captured || m.promotion
      )
    );
    for (const move of captures) {
      const next = applyMove(state, move, false);
      const val = quiescence(next, a, beta, false, qDepth - 1);
      if (val >= beta) return beta;
      if (val > a) a = val;
    }
    return a;
  } else {
    if (standPat <= alpha) return alpha;
    let b = Math.min(beta, standPat);
    const captures = orderMoves(
      generateLegalMoves(state.board, state.turn, state.castling, state.epSquare).filter(
        (m) => m.captured || m.promotion
      )
    );
    for (const move of captures) {
      const next = applyMove(state, move, false);
      const val = quiescence(next, alpha, b, true, qDepth - 1);
      if (val <= alpha) return alpha;
      if (val < b) b = val;
    }
    return b;
  }
}

function minimax(
  state: ChessState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  useQuiescence: boolean
): number {
  if (
    state.status === 'checkmate' ||
    state.status === 'stalemate' ||
    state.status === 'insufficient_material' ||
    state.status === 'threefold_repetition' ||
    state.status === 'fifty_move'
  ) {
    const base = evaluateBoard(state);
    // Prefer faster checkmates
    if (state.status === 'checkmate') {
      return state.winner === 'w' ? base + depth * 10 : base - depth * 10;
    }
    return base;
  }

  if (depth <= 0) {
    return useQuiescence
      ? quiescence(state, alpha, beta, maximizing, 2)
      : evaluateBoard(state);
  }

  const moves = orderMoves(
    generateLegalMoves(state.board, state.turn, state.castling, state.epSquare)
  );

  if (moves.length === 0) {
    return evaluateBoard(state);
  }

  if (maximizing) {
    let maxEval = -Infinity;
    let a = alpha;
    for (const move of moves) {
      const next = applyMove(state, move, false);
      const val = minimax(next, depth - 1, a, beta, false, useQuiescence);
      if (val > maxEval) maxEval = val;
      if (val > a) a = val;
      if (beta <= a) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    let b = beta;
    for (const move of moves) {
      const next = applyMove(state, move, false);
      const val = minimax(next, depth - 1, alpha, b, true, useQuiescence);
      if (val < minEval) minEval = val;
      if (val < b) b = val;
      if (b <= alpha) break;
    }
    return minEval;
  }
}

export function chooseAIMove(state: ChessState, difficulty: Difficulty): Move | null {
  const legal = orderMoves(
    generateLegalMoves(state.board, state.turn, state.castling, state.epSquare)
  );
  if (legal.length === 0) return null;

  const maximizing = state.turn === 'w';
  const depth = difficulty === 'iniciante' ? 1 : difficulty === 'tatico' ? 2 : 3;
  const useQuiescence = difficulty !== 'iniciante';

  const scored: { move: Move; score: number }[] = [];

  for (const move of legal) {
    const next = applyMove(state, move, false);
    // Slight tie-breaker jitter so identical lines feel varied
    const jitter = difficulty === 'iniciante' ? (Math.random() - 0.5) * 45 : (Math.random() - 0.5) * 4;
    const score =
      minimax(next, depth - 1, -Infinity, Infinity, !maximizing, useQuiescence) + jitter;
    scored.push({ move, score });
  }

  scored.sort((a, b) => (maximizing ? b.score - a.score : a.score - b.score));

  if (difficulty === 'iniciante' && scored.length > 2) {
    // 35% chance to pick 2nd best move if it isn't a catastrophic blunder
    const best = scored[0].score;
    const second = scored[1].score;
    if (Math.random() < 0.35 && Math.abs(best - second) < 180) {
      return scored[1].move;
    }
  }

  return scored[0].move;
}

export function getBestHintMove(state: ChessState): Move | null {
  return chooseAIMove(state, 'tatico');
}
