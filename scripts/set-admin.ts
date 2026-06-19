/**
 * Asigna o quita el custom claim admin=true a un usuario de Firebase Auth.
 *
 * Uso:
 *   cd scripts && npm run set-admin -- <uid>
 *   cd scripts && npm run set-admin -- <uid> --remove    (para quitar el claim)
 *
 * Requiere credenciales de Firebase:
 *   Opción 1 (recomendada): firebase login && npx firebase-admin login
 *   Opción 2: export GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json
 *
 * El UID lo encontrás en Firebase Console → Authentication → tu usuario.
 */

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const uid = process.argv[2];
const remove = process.argv.includes('--remove');

if (!uid) {
  console.error('Uso: npm run set-admin -- <uid>');
  process.exit(1);
}

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

initializeApp({
  credential: serviceAccountPath ? cert(serviceAccountPath) : applicationDefault(),
  projectId: 'fifa-bets-61cf2',
});

const auth = getAuth();

const claims = remove ? {} : { admin: true };

await auth.setCustomUserClaims(uid, claims);

const user = await auth.getUser(uid);
console.log(`✓ Claims actualizados para ${user.email}`);
console.log('  Claims actuales:', user.customClaims);
console.log('');
console.log('El usuario debe cerrar sesión y volver a entrar para que el token se renueve.');
