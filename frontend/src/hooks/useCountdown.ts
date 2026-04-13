import { useState, useEffect } from 'react';

interface UseCountdownReturn {
  secondsLeft: number;
  isExpired: boolean;
  formattedTime: string;
}

/**
 * Ticks every second from the given ISO-8601 expiresAt string.
 * Returns secondsLeft=0 and isExpired=true once the time is up.
 */
export const useCountdown = (expiresAt: string | null): UseCountdownReturn => {
  const getSecondsLeft = (): number => {
    if (!expiresAt) return 0;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  };

  const [secondsLeft, setSecondsLeft] = useState<number>(getSecondsLeft);

  useEffect(() => {
    if (!expiresAt) {
      setSecondsLeft(0);
      return;
    }

    // Recalculate immediately when expiresAt changes
    setSecondsLeft(getSecondsLeft());

    const interval = setInterval(() => {
      const left = getSecondsLeft();
      setSecondsLeft(left);
      if (left <= 0) clearInterval(interval);
    }, 1_000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return { secondsLeft, isExpired: secondsLeft === 0, formattedTime };
};
