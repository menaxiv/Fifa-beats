import { getPerformance } from 'firebase/performance';
import { app } from './firebase';

let perf: ReturnType<typeof getPerformance> | null = null;

if (import.meta.env.PROD) {
  perf = getPerformance(app);
}

export { perf };
