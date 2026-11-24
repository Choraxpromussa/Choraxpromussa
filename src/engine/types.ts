export type Color = 'w' | 'b';

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface Piece {
  color: Color;
  type: PieceType;
}

export type Square = Piece | null;

export interface CastlingRights {
  wK: boolean;
  wQ: boolean;
  bK: boolean;
  bQ: boolean;
}

export interface Move {
  from: number;
  to: number;
  piece: Piece;
  captured?: Piece | null;
  promotion?: PieceType;
  isEnPassant?: boolean;
  isCastle?: 'K' | 'Q';
}

export type GameStatus =
  | 'playing'
  | 'check'
  | 'checkmate'
  | 'stalemate'
  | 'insufficient_material'
  | 'threefold_repetition'
  | 'fifty_move'
  | 'timeout'
  | 'resigned'
  | 'draw_agreement';

export interface MoveRecord {
  move: Move;
  san: string;
  boardBefore: Square[];
  boardAfter: Square[];
  turnAfter: Color;
  castlingAfter: CastlingRights;
  epSquareAfter: number | null;
  halfmoveClockAfter: number;
  fullmoveNumberAfter: number;
  statusAfter: GameStatus;
  kingInCheckSquare: number | null;
}

export interface ChessState {
  board: Square[];
  turn: Color;
  castling: CastlingRights;
  epSquare: number | null;
  halfmoveClock: number;
  fullmoveNumber: number;
  status: GameStatus;
  winner: Color | 'draw' | null;
  kingInCheckSquare: number | null;
  positionCounts: Record<string, number>;
  history: MoveRecord[];
}

export type GameMode = 'ai' | 'local';
export type Difficulty = 'iniciante' | 'tatico' | 'mestre';
export type SidePreference = 'w' | 'b' | 'random';
export type TimeControlId = 'unlimited' | 'rapid_10' | 'blitz_5_3';

export interface TimeControlConfig {
  id: TimeControlId;
  label: string;
  initialMs: number;
  incrementMs: number;
}

export interface GameSettings {
  mode: GameMode;
  difficulty: Difficulty;
  playerSide: SidePreference;
  timeControl: TimeControlId;
}

export type ScreenState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
