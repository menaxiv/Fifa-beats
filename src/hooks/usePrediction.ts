import { useState, useEffect } from 'react';
import { getPrediction } from '@/services/predictions';
import { useAuthStore } from '@/store/authStore';
import type { Prediction } from '@/types';

export function usePrediction(matchId: string) {
  const { user } = useAuthStore();
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    getPrediction(user.uid, matchId)
      .then(setPrediction)
      .catch(() => setPrediction(null))
      .finally(() => setIsLoading(false));
  }, [user, matchId]);

  return { prediction, isLoading, setPrediction };
}
