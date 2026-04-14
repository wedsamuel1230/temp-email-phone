const otpRegex6 = /(?<!\d)(\d{6})(?!\d)/g;
const otpRegexFallback = /(?<!\d)(\d{4,8})(?!\d)/g;

export const extractOtpCandidates = (...sources: Array<string | null | undefined>): string[] => {
  const values = sources.filter((source): source is string => Boolean(source));

  const sixDigit = values.flatMap((value) => Array.from(value.matchAll(otpRegex6), (m) => m[1]));
  if (sixDigit.length) {
    return [...new Set(sixDigit)];
  }

  const matches = values.flatMap((value) => Array.from(value.matchAll(otpRegexFallback), (m) => m[1]));

  return [...new Set(matches)];
};

export const extractBestOtp = (...sources: Array<string | null | undefined>): string | null => {
  return extractOtpCandidates(...sources)[0] ?? null;
};
