import { initializeApp } from 'firebase-admin/app';

initializeApp();

export { onUserCreated } from './triggers/onUserCreated';
export { updateLeaderboard } from './triggers/updateLeaderboard';
export { closePredictions } from './scheduled/closePredictions';
export { processMatchResult } from './callables/processMatchResult';
