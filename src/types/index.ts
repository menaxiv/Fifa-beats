import type { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  points: number;
  totalPredictions: number;
  correctPredictions: number;
  exactPredictions: number;
  emailVerified: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Sport {
  id: string;
  name: string;
  active: boolean;
  icon?: string;
  createdAt: Timestamp;
}

export interface Team {
  id: string;
  sport: string;
  name: string;
  shortName: string;
  flagUrl?: string;
  active: boolean;
}

export type MatchStatus = 'upcoming' | 'live' | 'finished' | 'cancelled';
export type Winner = 'home' | 'away' | 'draw';

export interface MatchResult {
  homeScore: number;
  awayScore: number;
  winner: Winner;
  processedAt: Timestamp;
}

export interface Match {
  id: string;
  sport: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  scheduledAt: Timestamp;
  predictionDeadline: Timestamp;
  status: MatchStatus;
  result: MatchResult | null;
  tournament?: string;
  stage?: string;
  venue?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type PredictionStatus =
  | 'pending'
  | 'correct_exact'
  | 'correct_winner'
  | 'incorrect'
  | 'cancelled';

export interface Prediction {
  id: string;
  uid: string;
  matchId: string;
  sport: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  predictedWinner: Winner;
  pointsAwarded: number | null;
  status: PredictionStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type PointReason =
  | 'initial_grant'
  | 'correct_exact'
  | 'correct_winner'
  | 'incorrect'
  | 'cancelled'
  | 'admin_adjustment';

export interface PointTransaction {
  id: string;
  uid: string;
  delta: number;
  balanceAfter: number;
  reason: PointReason;
  matchId?: string;
  predictionId?: string;
  createdAt: Timestamp;
}

export interface LeaderboardEntry {
  rank: number;
  uid: string;
  displayName: string;
  avatarUrl?: string;
  points: number;
}

export interface Leaderboard {
  updatedAt: Timestamp;
  entries: LeaderboardEntry[];
}
