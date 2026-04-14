type RefreshTarget = 'email' | 'phone';

type RefreshHandler = () => Promise<void>;

interface RefreshState {
  timer: ReturnType<typeof setInterval> | null;
  intervalMs: number;
}

const state: Record<RefreshTarget, RefreshState> = {
  email: { timer: null, intervalMs: 5000 },
  phone: { timer: null, intervalMs: 5000 }
};

export const refreshService = {
  start(target: RefreshTarget, intervalMs: number, handler: RefreshHandler): void {
    this.stop(target);

    state[target].intervalMs = intervalMs;
    state[target].timer = setInterval(() => {
      void handler();
    }, intervalMs);
  },

  stop(target: RefreshTarget): void {
    if (state[target].timer) {
      clearInterval(state[target].timer);
      state[target].timer = null;
    }
  },

  stopAll(): void {
    this.stop('email');
    this.stop('phone');
  },

  isRunning(target: RefreshTarget): boolean {
    return state[target].timer !== null;
  },

  getInterval(target: RefreshTarget): number {
    return state[target].intervalMs;
  }
};
