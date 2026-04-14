import { describe, expect, it } from 'vitest';
import { extractBestOtp, extractOtpCandidates } from './otp';

describe('otp extraction', () => {
  it('extracts 6-digit code from SMS API sample', () => {
    const sms = 'yes|oripa.clove.jp の確認コードは 001954 です。|(oripa)|到期时间：2026-04-29 00:00:00';

    expect(extractBestOtp(sms)).toBe('001954');
    expect(extractOtpCandidates(sms)).toContain('001954');
  });

  it('extracts 6-digit code from email verification sample', () => {
    const emailBody = `驗證碼是 675117。\n有效期限 自發行起30分鐘內\n[Clove] 驗證碼:請在30分鐘內完成操作`;

    expect(extractBestOtp(emailBody)).toBe('675117');
    expect(extractOtpCandidates(emailBody)[0]).toBe('675117');
  });
});
