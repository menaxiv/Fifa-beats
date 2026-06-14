import { useState, useEffect } from 'react';
import { getMatches } from '@/services/matches';
import type { Match, MatchStatus } from '@/types';

export function useMatches(status?: MatchStatus) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getMatches(status)
      .then(setMatches)
      .catch(() => setMatches([]))
      .finally(() => setIsLoading(false));
  }, [status]);

  return { matches, isLoading, reload: () => getMatches(status).then(setMatches) };
}
