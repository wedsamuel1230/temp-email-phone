export const maskSensitiveUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    if (!parsed.search) {
      return `${parsed.origin}${parsed.pathname}`;
    }

    const masked = [...parsed.searchParams.keys()].reduce((acc, key) => {
      acc.set(key, '***');
      return acc;
    }, new URLSearchParams());

    parsed.search = masked.toString();
    return parsed.toString();
  } catch {
    return 'invalid-url';
  }
};
