import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export const processMatchResult = httpsCallable<
  { matchId: string; homeScore: number; awayScore: number },
  { processed: number }
>(functions, 'processMatchResult');
