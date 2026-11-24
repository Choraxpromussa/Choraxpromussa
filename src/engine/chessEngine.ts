import {
  CastlingRights,
  ChessState,
  Color,
  GameStatus,
  Move,
  MoveRecord,
  Piece,
  PieceType,
  Square,
} from './types';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

const PT_SAN_LETTER: Record<PieceType, string> = {
  p: '',
  n: 'C',
  b: 'B',
  r: 'T',
  q: 'D',
  k: 'R',
};

export const PIECE_VALUES: Record<PieceType, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export function sqToRowCol(sq: number): [number, number] {
  return [Math.floor(sq / 8), sq % 8];
}

export function rowColToSq(row: number, col: number): number {
  return row * 8 + col;
}

export function sqToAlgebraic(sq: number): string {
  const [r, c] = sqToRowCol(sq);
  return `${FILES[c]}${RANKS[r]}`;
}

export function oppositeColor(color: Color): Color {
  return color === 'w' ? 'b' : 'w';
}

export function cloneBoard(board: Square[]): Square[] {
  return board.slice();
}

export function cloneCastling(c: CastlingRights): CastlingRights {
  return { ...c };
}

export function createInitialBoard(): Square[] {
  const board: Square[] = new Array(64).fill(null);
  const backRank: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];

  for (let c = 0; c < 8; c++) {
    board[c] = { color: 'b', type: backRank[c] };
    board[8 + c] = { color: 'b', type: 'p' };
    board[48 + c] = { color: 'w', type: 'p' };
    board[56 + c] = { color: 'w', type: backRank[c] };
  }
  return board;
}

export function findKingSquare(board: Square[], color: Color): number {
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p && p.color === color && p.type === 'k') {
      return i;
    }
  }
  return -1;
}

const KNIGHT_OFFSETS: [number, number][] = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
];

const KING_OFFSETS: [number, number][] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

const DIAGONAL_DIRS: [number, number][] = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

const ORTHOGONAL_DIRS: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

export function isSquareAttacked(board: Square[], targetSq: number, byColor: Color): boolean {
  const [tr, tc] = sqToRowCol(targetSq);

  // Pawn attacks
  const pawnOriginRow = byColor === 'w' ? tr + 1 : tr - 1;
  if (pawnOriginRow >= 0 && pawnOriginRow < 8) {
    for (const dc of [-1, 1]) {
      const pc = tc + dc;
      if (pc >= 0 && pc < 8) {
        const p = board[rowColToSq(pawnOriginRow, pc)];
        if (p && p.color === byColor && p.type === 'p') return true;
      }
    }
  }

  // Knight attacks
  for (const [dr, dc] of KNIGHT_OFFSETS) {
    const nr = tr + dr;
    const nc = tc + dc;
    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
      const p = board[rowColToSq(nr, nc)];
      if (p && p.color === byColor && p.type === 'n') return true;
    }
  }

  // King attacks
  for (const [dr, dc] of KING_OFFSETS) {
    const kr = tr + dr;
    const kc = tc + dc;
    if (kr >= 0 && kr < 8 && kc >= 0 && kc < 8) {
      const p = board[rowColToSq(kr, kc)];
      if (p && p.color === byColor && p.type === 'k') return true;
    }
  }

  // Diagonal rays (bishop / queen)
  for (const [dr, dc] of DIAGONAL_DIRS) {
    let r = tr + dr;
    let c = tc + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const p = board[rowColToSq(r, c)];
      if (p) {
        if (p.color === byColor && (p.type === 'b' || p.type === 'q')) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  // Orthogonal rays (rook / queen)
  for (const [dr, dc] of ORTHOGONAL_DIRS) {
    let r = tr + dr;
    let c = tc + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const p = board[rowColToSq(r, c)];
      if (p) {
        if (p.color === byColor && (p.type === 'r' || p.type === 'q')) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  return false;
}

export function isKingInCheck(board: Square[], color: Color): boolean {
  const kSq = findKingSquare(board, color);
  if (kSq === -1) return false;
  return isSquareAttacked(board, kSq, oppositeColor(color));
}

function applyMoveOnBoard(board: Square[], move: Move): Square[] {
  const next = cloneBoard(board);
  next[move.from] = null;

  if (move.isEnPassant) {
    const [, toCol] = sqToRowCol(move.to);
    const [fromRow] = sqToRowCol(move.from);
    next[rowColToSq(fromRow, toCol)] = null;
  }

  if (move.isCastle) {
    const rankRow = move.piece.color === 'w' ? 7 : 0;
    if (move.isCastle === 'K') {
      next[rowColToSq(rankRow, 7)] = null;
      next[rowColToSq(rankRow, 5)] = { color: move.piece.color, type: 'r' };
    } else {
      next[rowColToSq(rankRow, 0)] = null;
      next[rowColToSq(rankRow, 3)] = { color: move.piece.color, type: 'r' };
    }
  }

  next[move.to] = move.promotion
    ? { color: move.piece.color, type: move.promotion }
    : move.piece;

  return next;
}

function generatePseudoMoves(
  board: Square[],
  turn: Color,
  castling: CastlingRights,
  epSquare: number | null
): Move[] {
  const moves: Move[] = [];
  const enemy = oppositeColor(turn);
  const promoTypes: PieceType[] = ['q', 'r', 'b', 'n'];

  for (let sq = 0; sq < 64; sq++) {
    const piece = board[sq];
    if (!piece || piece.color !== turn) continue;
    const [r, c] = sqToRowCol(sq);

    if (piece.type === 'p') {
      const dir = turn === 'w' ? -1 : 1;
      const startRow = turn === 'w' ? 6 : 1;
      const promoRow = turn === 'w' ? 0 : 7;

      const oneR = r + dir;
      if (oneR >= 0 && oneR < 8) {
        const oneSq = rowColToSq(oneR, c);
        if (!board[oneSq]) {
          if (oneR === promoRow) {
            for (const pt of promoTypes) {
              moves.push({ from: sq, to: oneSq, piece, promotion: pt });
            }
          } else {
            moves.push({ from: sq, to: oneSq, piece });
            if (r === startRow) {
              const twoSq = rowColToSq(r + dir * 2, c);
              if (!board[twoSq]) {
                moves.push({ from: sq, to: twoSq, piece });
              }
            }
          }
        }

        // Captures + En Passant
        for (const dc of [-1, 1]) {
          const nc = c + dc;
          if (nc >= 0 && nc < 8) {
            const capSq = rowColToSq(oneR, nc);
            const target = board[capSq];
            if (target && target.color === enemy) {
              if (oneR === promoRow) {
                for (const pt of promoTypes) {
                  moves.push({
                    from: sq,
                    to: capSq,
                    piece,
                    captured: target,
                    promotion: pt,
                  });
                }
              } else {
                moves.push({ from: sq, to: capSq, piece, captured: target });
              }
            } else if (epSquare !== null && capSq === epSquare) {
              const epCaptured = board[rowColToSq(r, nc)];
              if (epCaptured && epCaptured.color === enemy && epCaptured.type === 'p') {
                moves.push({
                  from: sq,
                  to: capSq,
                  piece,
                  captured: epCaptured,
                  isEnPassant: true,
                });
              }
            }
          }
        }
      }
    } else if (piece.type === 'n') {
      for (const [dr, dc] of KNIGHT_OFFSETS) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const to = rowColToSq(nr, nc);
          const target = board[to];
          if (!target || target.color === enemy) {
            moves.push({ from: sq, to, piece, captured: target });
          }
        }
      }
    } else if (piece.type === 'b' || piece.type === 'r' || piece.type === 'q') {
      const dirs =
        piece.type === 'b'
          ? DIAGONAL_DIRS
          : piece.type === 'r'
            ? ORTHOGONAL_DIRS
            : [...DIAGONAL_DIRS, ...ORTHOGONAL_DIRS];

      for (const [dr, dc] of dirs) {
        let nr = r + dr;
        let nc = c + dc;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const to = rowColToSq(nr, nc);
          const target = board[to];
          if (!target) {
            moves.push({ from: sq, to, piece });
          } else {
            if (target.color === enemy) {
              moves.push({ from: sq, to, piece, captured: target });
            }
            break;
          }
          nr += dr;
          nc += dc;
        }
      }
    } else if (piece.type === 'k') {
      for (const [dr, dc] of KING_OFFSETS) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const to = rowColToSq(nr, nc);
          const target = board[to];
          if (!target || target.color === enemy) {
            moves.push({ from: sq, to, piece, captured: target });
          }
        }
      }

      // Castling
      const homeRow = turn === 'w' ? 7 : 0;
      const homeKingSq = rowColToSq(homeRow, 4);
      if (sq === homeKingSq && !isSquareAttacked(board, homeKingSq, enemy)) {
        const canK = turn === 'w' ? castling.wK : castling.bK;
        const canQ = turn === 'w' ? castling.wQ : castling.bQ;

        if (canK) {
          const fSq = rowColToSq(homeRow, 5);
          const gSq = rowColToSq(homeRow, 6);
          const rookSq = rowColToSq(homeRow, 7);
          const rook = board[rookSq];
          if (
            rook &&
            rook.color === turn &&
            rook.type === 'r' &&
            !board[fSq] &&
            !board[gSq] &&
            !isSquareAttacked(board, fSq, enemy) &&
            !isSquareAttacked(board, gSq, enemy)
          ) {
            moves.push({ from: sq, to: gSq, piece, isCastle: 'K' });
          }
        }

        if (canQ) {
          const dSq = rowColToSq(homeRow, 3);
          const cSq = rowColToSq(homeRow, 2);
          const bSq = rowColToSq(homeRow, 1);
          const rookSq = rowColToSq(homeRow, 0);
          const rook = board[rookSq];
          if (
            rook &&
            rook.color === turn &&
            rook.type === 'r' &&
            !board[dSq] &&
            !board[cSq] &&
            !board[bSq] &&
            !isSquareAttacked(board, dSq, enemy) &&
            !isSquareAttacked(board, cSq, enemy)
          ) {
            moves.push({ from: sq, to: cSq, piece, isCastle: 'Q' });
          }
        }
      }
    }
  }

  return moves;
}

export function generateLegalMoves(
  board: Square[],
  turn: Color,
  castling: CastlingRights,
  epSquare: number | null
): Move[] {
  const pseudo = generatePseudoMoves(board, turn, castling, epSquare);
  return pseudo.filter((move) => {
    const nextBoard = applyMoveOnBoard(board, move);
    return !isKingInCheck(nextBoard, turn);
  });
}

export function getLegalMovesForSquare(state: ChessState, sq: number): Move[] {
  const piece = state.board[sq];
  if (!piece || piece.color !== state.turn) return [];
  const all = generateLegalMoves(state.board, state.turn, state.castling, state.epSquare);
  return all.filter((m) => m.from === sq);
}

export function isInsufficientMaterial(board: Square[]): boolean {
  const pieces: { color: Color; type: PieceType; sq: number }[] = [];
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p && p.type !== 'k') {
      pieces.push({ color: p.color, type: p.type, sq: i });
    }
  }

  if (pieces.length === 0) return true; // K vs K
  if (pieces.length === 1) {
    return pieces[0].type === 'n' || pieces[0].type === 'b'; // K+N vs K or K+B vs K
  }
  if (pieces.length === 2) {
    const [a, b] = pieces;
    if (a.type === 'b' && b.type === 'b' && a.color !== b.color) {
      const [ra, ca] = sqToRowCol(a.sq);
      const [rb, cb] = sqToRowCol(b.sq);
      return (ra + ca) % 2 === (rb + cb) % 2;
    }
  }
  return false;
}

export function getPositionKey(
  board: Square[],
  turn: Color,
  castling: CastlingRights,
  epSquare: number | null
): string {
  let bStr = '';
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    bStr += p ? `${p.color}${p.type}` : '.';
  }
  const cStr =
    (castling.wK ? 'K' : '') +
    (castling.wQ ? 'Q' : '') +
    (castling.bK ? 'k' : '') +
    (castling.bQ ? 'q' : '');

  // FIDE threefold repetition counts epSquare only if a legal en passant capture exists
  let effectiveEp = '-';
  if (epSquare !== null) {
    const [er, ec] = sqToRowCol(epSquare);
    const pawnRow = turn === 'w' ? er + 1 : er - 1;
    if (pawnRow >= 0 && pawnRow < 8) {
      for (const dc of [-1, 1]) {
        const pc = ec + dc;
        if (pc >= 0 && pc < 8) {
          const p = board[rowColToSq(pawnRow, pc)];
          if (p && p.color === turn && p.type === 'p') {
            effectiveEp = String(epSquare);
            break;
          }
        }
      }
    }
  }

  return `${bStr}|${turn}|${cStr || '-'}|${effectiveEp}`;
}

export function createInitialState(): ChessState {
  const board = createInitialBoard();
  const castling: CastlingRights = { wK: true, wQ: true, bK: true, bQ: true };
  const initialKey = getPositionKey(board, 'w', castling, null);
  return {
    board,
    turn: 'w',
    castling,
    epSquare: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
    status: 'playing',
    winner: null,
    kingInCheckSquare: null,
    positionCounts: { [initialKey]: 1 },
    history: [],
  };
}

function computeSAN(
  move: Move,
  legalMovesBefore: Move[],
  nextStatus: GameStatus,
  inCheckAfter: boolean
): string {
  let base = '';

  if (move.isCastle === 'K') {
    base = 'O-O';
  } else if (move.isCastle === 'Q') {
    base = 'O-O-O';
  } else if (move.piece.type === 'p') {
    const [fromR, fromC] = sqToRowCol(move.from);
    void fromR;
    if (move.captured || move.isEnPassant) {
      base = `${FILES[fromC]}x${sqToAlgebraic(move.to)}`;
    } else {
      base = sqToAlgebraic(move.to);
    }
    if (move.promotion) {
      base += `=${PT_SAN_LETTER[move.promotion]}`;
    }
  } else {
    const letter = PT_SAN_LETTER[move.piece.type];
    const [fromR, fromC] = sqToRowCol(move.from);
    const ambiguous = legalMovesBefore.filter(
      (m) =>
        m.from !== move.from &&
        m.to === move.to &&
        m.piece.type === move.piece.type &&
        m.piece.color === move.piece.color
    );

    let disambig = '';
    if (ambiguous.length > 0) {
      const sameFile = ambiguous.some((m) => sqToRowCol(m.from)[1] === fromC);
      const sameRank = ambiguous.some((m) => sqToRowCol(m.from)[0] === fromR);
      if (!sameFile) {
        disambig = FILES[fromC];
      } else if (!sameRank) {
        disambig = RANKS[fromR];
      } else {
        disambig = `${FILES[fromC]}${RANKS[fromR]}`;
      }
    }

    const captureMark = move.captured ? 'x' : '';
    base = `${letter}${disambig}${captureMark}${sqToAlgebraic(move.to)}`;
  }

  if (nextStatus === 'checkmate') {
    return `${base}#`;
  }
  if (inCheckAfter) {
    return `${base}+`;
  }
  return base;
}

export function applyMove(state: ChessState, move: Move, recordHistory = true): ChessState {
  const legalMovesBefore = recordHistory
    ? generateLegalMoves(state.board, state.turn, state.castling, state.epSquare)
    : [];

  const nextBoard = applyMoveOnBoard(state.board, move);
  const nextTurn = oppositeColor(state.turn);
  const nextCastling = cloneCastling(state.castling);

  // Update castling rights
  if (move.piece.type === 'k') {
    if (move.piece.color === 'w') {
      nextCastling.wK = false;
      nextCastling.wQ = false;
    } else {
      nextCastling.bK = false;
      nextCastling.bQ = false;
    }
  }
  if (move.from === 63 || move.to === 63) nextCastling.wK = false;
  if (move.from === 56 || move.to === 56) nextCastling.wQ = false;
  if (move.from === 7 || move.to === 7) nextCastling.bK = false;
  if (move.from === 0 || move.to === 0) nextCastling.bQ = false;

  // En passant target square
  let nextEpSquare: number | null = null;
  if (move.piece.type === 'p' && Math.abs(move.to - move.from) === 16) {
    nextEpSquare = (move.from + move.to) / 2;
  }

  const nextHalfmove =
    move.piece.type === 'p' || move.captured || move.isEnPassant ? 0 : state.halfmoveClock + 1;
  const nextFullmove = state.turn === 'b' ? state.fullmoveNumber + 1 : state.fullmoveNumber;

  const nextKey = getPositionKey(nextBoard, nextTurn, nextCastling, nextEpSquare);
  const nextPositionCounts = recordHistory ? { ...state.positionCounts } : state.positionCounts;
  if (recordHistory) {
    nextPositionCounts[nextKey] = (nextPositionCounts[nextKey] || 0) + 1;
  }

  const opponentInCheck = isKingInCheck(nextBoard, nextTurn);
  const opponentKingSq = opponentInCheck ? findKingSquare(nextBoard, nextTurn) : null;
  const opponentLegalMoves = generateLegalMoves(nextBoard, nextTurn, nextCastling, nextEpSquare);

  let nextStatus: GameStatus = opponentInCheck ? 'check' : 'playing';
  let winner: Color | 'draw' | null = null;

  if (opponentLegalMoves.length === 0) {
    if (opponentInCheck) {
      nextStatus = 'checkmate';
      winner = state.turn;
    } else {
      nextStatus = 'stalemate';
      winner = 'draw';
    }
  } else if (isInsufficientMaterial(nextBoard)) {
    nextStatus = 'insufficient_material';
    winner = 'draw';
  } else if (recordHistory && (nextPositionCounts[nextKey] || 0) >= 3) {
    nextStatus = 'threefold_repetition';
    winner = 'draw';
  } else if (nextHalfmove >= 100) {
    nextStatus = 'fifty_move';
    winner = 'draw';
  }

  if (!recordHistory) {
    return {
      board: nextBoard,
      turn: nextTurn,
      castling: nextCastling,
      epSquare: nextEpSquare,
      halfmoveClock: nextHalfmove,
      fullmoveNumber: nextFullmove,
      status: nextStatus,
      winner,
      kingInCheckSquare: opponentKingSq,
      positionCounts: nextPositionCounts,
      history: state.history,
    };
  }

  const san = computeSAN(move, legalMovesBefore, nextStatus, opponentInCheck);
  const record: MoveRecord = {
    move,
    san,
    boardBefore: state.board,
    boardAfter: nextBoard,
    turnAfter: nextTurn,
    castlingAfter: nextCastling,
    epSquareAfter: nextEpSquare,
    halfmoveClockAfter: nextHalfmove,
    fullmoveNumberAfter: nextFullmove,
    statusAfter: nextStatus,
    kingInCheckSquare: opponentKingSq,
  };

  return {
    board: nextBoard,
    turn: nextTurn,
    castling: nextCastling,
    epSquare: nextEpSquare,
    halfmoveClock: nextHalfmove,
    fullmoveNumber: nextFullmove,
    status: nextStatus,
    winner,
    kingInCheckSquare: opponentKingSq,
    positionCounts: nextPositionCounts,
    history: [...state.history, record],
  };
}

export function undoMoves(state: ChessState, plies: number): ChessState {
  if (plies <= 0 || state.history.length === 0) return state;
  const targetLen = Math.max(0, state.history.length - plies);
  const kept = state.history.slice(0, targetLen);

  let rebuilt = createInitialState();
  for (const rec of kept) {
    rebuilt = applyMove(rebuilt, rec.move, true);
  }
  return rebuilt;
}

export interface MaterialSummary {
  capturedByWhite: PieceType[];
  capturedByBlack: PieceType[];
  whiteAdvantage: number;
}

export function getMaterialSummary(board: Square[]): MaterialSummary {
  const startingCounts: Record<Color, Record<PieceType, number>> = {
    w: { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 },
    b: { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 },
  };
  const currentCounts: Record<Color, Record<PieceType, number>> = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
  };

  let whiteScore = 0;
  let blackScore = 0;

  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p) continue;
    currentCounts[p.color][p.type]++;
    if (p.color === 'w') whiteScore += PIECE_VALUES[p.type];
    else blackScore += PIECE_VALUES[p.type];
  }

  const order: PieceType[] = ['q', 'r', 'b', 'n', 'p'];
  const capturedByWhite: PieceType[] = [];
  const capturedByBlack: PieceType[] = [];

  for (const pt of order) {
    const lostBlack = Math.max(0, startingCounts.b[pt] - currentCounts.b[pt]);
    for (let i = 0; i < lostBlack; i++) capturedByWhite.push(pt);

    const lostWhite = Math.max(0, startingCounts.w[pt] - currentCounts.w[pt]);
    for (let i = 0; i < lostWhite; i++) capturedByBlack.push(pt);
  }

  return {
    capturedByWhite,
    capturedByBlack,
    whiteAdvantage: whiteScore - blackScore,
  };
}
