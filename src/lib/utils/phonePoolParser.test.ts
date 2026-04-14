import { describe, expect, it } from 'vitest';
import { parsePhonePoolTxt } from './phonePoolParser';

describe('parsePhonePoolTxt', () => {
  it('parses valid phone|sms_url lines and reports invalid rows', () => {
    const input = `+12025550123|https://example.com/sms?key=abc\ninvalid-line\n+44123456789|https://example.com/sms?token=xyz`;

    const result = parsePhonePoolTxt(input);

    expect(result.entries).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.lineNumber).toBe(2);
    expect(result.entries[0]?.phoneNumber).toBe('+12025550123');
  });
});
