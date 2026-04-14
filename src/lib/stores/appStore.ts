import { writable } from 'svelte/store';
import type { AppBootstrapStatus } from '$api/contracts';

export const appBootstrapStatus = writable<AppBootstrapStatus>({
  stack: 'Tauri + SvelteKit + TypeScript',
  architecture: 'Provider + service + store modular split',
  readiness: 'ready'
});
