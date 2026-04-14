import type { PhonePoolEntry } from '$api/contracts';

export interface PhonePoolParseError {
  lineNumber: number;
  lineText: string;
  reason: 'INVALID_FORMAT' | 'INVALID_PHONE' | 'INVALID_URL';
}

export interface PhonePoolParseResult {
  entries: PhonePoolEntry[];
  errors: PhonePoolParseError[];
  totalLines: number;
  validCount: number;
  invalidCount: number;
}

const phoneRegex = /^\+?[1-9]\d{6,14}$/;

export const parsePhonePoolTxt = (input: string): PhonePoolParseResult => {
  const entries: PhonePoolEntry[] = [];
  const errors: PhonePoolParseError[] = [];

  const lines = input.split(/\r?\n/).map((line) => line.trim());
  const totalLines = lines.filter((line) => line.length > 0).length;

  lines.forEach((line, index) => {
    if (!line) {
      return;
    }

    const [phoneNumber, smsUrl, ...rest] = line.split('|');

    if (!phoneNumber || !smsUrl || rest.length > 0) {
      errors.push({
        lineNumber: index + 1,
        lineText: line,
        reason: 'INVALID_FORMAT'
      });
      return;
    }

    if (!phoneRegex.test(phoneNumber)) {
      errors.push({
        lineNumber: index + 1,
        lineText: line,
        reason: 'INVALID_PHONE'
      });
      return;
    }

    try {
      const parsed = new URL(smsUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('unsupported protocol');
      }
    } catch {
      errors.push({
        lineNumber: index + 1,
        lineText: line,
        reason: 'INVALID_URL'
      });
      return;
    }

    entries.push({
      id: `${phoneNumber}-${index + 1}`,
      phoneNumber,
      smsUrl,
      isActive: false,
      status: 'ready',
      lastCheckedAt: null
    });
  });

  return {
    entries,
    errors,
    totalLines,
    validCount: entries.length,
    invalidCount: errors.length
  };
};
