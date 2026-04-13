import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountdown } from '../hooks/useCountdown';

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with correct secondsLeft when given a future expiresAt', () => {
    const expiresAt = new Date(Date.now() + 300_000).toISOString(); // 5 minutes

    const { result } = renderHook(() => useCountdown(expiresAt));

    // Should be close to 300 seconds — allow 1s tolerance
    expect(result.current.secondsLeft).toBeGreaterThanOrEqual(299);
    expect(result.current.secondsLeft).toBeLessThanOrEqual(300);
    expect(result.current.isExpired).toBe(false);
  });

  it('ticks down every second', () => {
    const expiresAt = new Date(Date.now() + 10_000).toISOString(); // 10 seconds

    const { result } = renderHook(() => useCountdown(expiresAt));

    expect(result.current.secondsLeft).toBe(10);

    act(() => { vi.advanceTimersByTime(3_000); });

    expect(result.current.secondsLeft).toBe(7);

    act(() => { vi.advanceTimersByTime(4_000); });

    expect(result.current.secondsLeft).toBe(3);
  });

  it('sets isExpired to true when time reaches 0', () => {
    const expiresAt = new Date(Date.now() + 2_000).toISOString(); // 2 seconds

    const { result } = renderHook(() => useCountdown(expiresAt));

    expect(result.current.isExpired).toBe(false);

    act(() => { vi.advanceTimersByTime(3_000); });

    expect(result.current.secondsLeft).toBe(0);
    expect(result.current.isExpired).toBe(true);
  });

  it('formats time as MM:SS', () => {
    const expiresAt = new Date(Date.now() + 125_000).toISOString(); // 2 min 5 sec

    const { result } = renderHook(() => useCountdown(expiresAt));

    expect(result.current.formattedTime).toBe('02:05');
  });

  it('returns isExpired true immediately when expiresAt is in the past', () => {
    const expiresAt = new Date(Date.now() - 1_000).toISOString();

    const { result } = renderHook(() => useCountdown(expiresAt));

    expect(result.current.secondsLeft).toBe(0);
    expect(result.current.isExpired).toBe(true);
  });

  it('returns isExpired false and secondsLeft 0 when expiresAt is null', () => {
    const { result } = renderHook(() => useCountdown(null));

    expect(result.current.secondsLeft).toBe(0);
    expect(result.current.formattedTime).toBe('00:00');
  });
});
