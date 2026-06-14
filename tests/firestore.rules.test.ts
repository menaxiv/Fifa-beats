import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { setDoc, getDoc, doc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, describe, it } from 'vitest';

let testEnv: RulesTestEnvironment;

const RULES = readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8');

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-beats-test',
    firestore: { rules: RULES, host: 'localhost', port: 8080 },
  });
});

afterAll(() => testEnv?.cleanup());

// ─── helpers ─────────────────────────────────────────────────────────────────
const userCtx = (uid: string) => testEnv.authenticatedContext(uid);
const adminCtx = () => testEnv.authenticatedContext('admin1', { admin: true });
const anonCtx = () => testEnv.unauthenticatedContext();

// ─── users ───────────────────────────────────────────────────────────────────
describe('users collection', () => {
  it('auth user can read any user doc', async () => {
    const db = userCtx('alice').firestore();
    await assertSucceeds(getDoc(doc(db, 'users', 'bob')));
  });

  it('anon cannot read user doc', async () => {
    const db = anonCtx().firestore();
    await assertFails(getDoc(doc(db, 'users', 'alice')));
  });

  it('owner can update displayName', async () => {
    // seed via admin bypass
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', 'alice'), {
        uid: 'alice', displayName: 'Alice', email: 'a@a.com',
        points: 50, totalPredictions: 0, correctPredictions: 0, exactPredictions: 0,
        emailVerified: false, createdAt: new Date(), updatedAt: new Date(),
      });
    });
    const db = userCtx('alice').firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'users', 'alice'), { displayName: 'Alice2', updatedAt: new Date() }),
    );
  });

  it('owner cannot update points directly', async () => {
    const db = userCtx('alice').firestore();
    await assertFails(updateDoc(doc(db, 'users', 'alice'), { points: 9999 }));
  });

  it('other user cannot update alice doc', async () => {
    const db = userCtx('bob').firestore();
    await assertFails(
      updateDoc(doc(db, 'users', 'alice'), { displayName: 'Hacker', updatedAt: new Date() }),
    );
  });
});

// ─── sports ──────────────────────────────────────────────────────────────────
describe('sports collection', () => {
  it('anon can read sports', async () => {
    const db = anonCtx().firestore();
    await assertSucceeds(getDoc(doc(db, 'sports', 'football')));
  });

  it('non-admin cannot write sports', async () => {
    const db = userCtx('alice').firestore();
    await assertFails(setDoc(doc(db, 'sports', 'x'), { name: 'X', active: true }));
  });

  it('admin can write sports', async () => {
    const db = adminCtx().firestore();
    await assertSucceeds(setDoc(doc(db, 'sports', 'test-sport'), { name: 'Test', active: true }));
  });
});

// ─── predictions ─────────────────────────────────────────────────────────────
describe('predictions collection', () => {
  const matchId = 'match123';

  it('owner can create a prediction with correct id pattern', async () => {
    const db = userCtx('alice').firestore();
    await assertSucceeds(
      setDoc(doc(db, 'predictions', `alice_${matchId}`), {
        uid: 'alice',
        matchId,
        sport: 'football',
        predictedHomeScore: 2,
        predictedAwayScore: 1,
        predictedWinner: 'home',
        pointsAwarded: null,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
  });

  it('cannot create prediction with wrong id pattern', async () => {
    const db = userCtx('alice').firestore();
    await assertFails(
      setDoc(doc(db, 'predictions', `WRONG_${matchId}`), {
        uid: 'alice',
        matchId,
        sport: 'football',
        predictedHomeScore: 1,
        predictedAwayScore: 0,
        predictedWinner: 'home',
        pointsAwarded: null,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
  });

  it('owner can read own prediction', async () => {
    const db = userCtx('alice').firestore();
    await assertSucceeds(getDoc(doc(db, 'predictions', `alice_${matchId}`)));
  });

  it('other user cannot read alice prediction', async () => {
    const db = userCtx('bob').firestore();
    await assertFails(getDoc(doc(db, 'predictions', `alice_${matchId}`)));
  });
});

// ─── point_transactions ──────────────────────────────────────────────────────
describe('point_transactions collection', () => {
  it('client cannot write transactions', async () => {
    const db = userCtx('alice').firestore();
    await assertFails(
      setDoc(doc(db, 'point_transactions', 'tx1'), { uid: 'alice', delta: 100 }),
    );
  });
});

// ─── leaderboards ────────────────────────────────────────────────────────────
describe('leaderboards collection', () => {
  it('auth user can read leaderboard', async () => {
    const db = userCtx('alice').firestore();
    await assertSucceeds(getDoc(doc(db, 'leaderboards', 'global')));
  });

  it('client cannot write leaderboard', async () => {
    const db = userCtx('alice').firestore();
    await assertFails(setDoc(doc(db, 'leaderboards', 'global'), { entries: [] }));
  });
});
