import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchSmsSnapshot } from './smsService';

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn()
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: invokeMock
}));

afterEach(() => {
  vi.restoreAllMocks();
  invokeMock.mockReset();
});

describe('fetchSmsSnapshot', () => {
  it('uses the Tauri backend when browser fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('CORS blocked')));
    invokeMock.mockResolvedValue({ raw_body: 'yes|oripa.clove.jp の確認コードは 028616 です。|(oripa)|到期时间：2026-04-29 00:00:00' });

    const snapshot = await fetchSmsSnapshot('http://a.62-us.com/api/get_sms?key=test');

    expect(snapshot.rawBody).toContain('028616');
    expect(snapshot.contentHash).toBeTypeOf('string');
    expect(invokeMock).toHaveBeenCalledWith('fetch_sms_snapshot', {
      smsUrl: 'http://a.62-us.com/api/get_sms?key=test'
    });
  });
});
