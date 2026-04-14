import { describe, expect, it } from 'vitest';
import type { PhonePoolEntry } from '$api/contracts';
import { pickNextActivePhone, removePhoneEntry } from './phoneChange';

const sample = (id: string): PhonePoolEntry => ({
  id,
  phoneNumber: `+1000000000${id}`,
  smsUrl: `https://example.com/${id}`,
  isActive: false,
  status: 'ready',
  lastCheckedAt: null
});

describe('pickNextActivePhone', () => {
  it('returns next item after current id and wraps around', () => {
    const entries = [sample('1'), sample('2'), sample('3')];

    expect(pickNextActivePhone(entries, '2')?.id).toBe('3');
    expect(pickNextActivePhone(entries, '3')?.id).toBe('1');
  });
});

describe('removePhoneEntry', () => {
  it('removes an entry and selects the next available active id', () => {
    const entries = [sample('1'), sample('2'), sample('3')];

    const result = removePhoneEntry(entries, '2', '2');

    expect(result.entries.map((entry) => entry.id)).toEqual(['1', '3']);
    expect(result.nextActiveId).toBe('3');
  });
});
