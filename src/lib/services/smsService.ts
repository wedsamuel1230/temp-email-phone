import type { SmsMessage } from '$api/contracts';
import { extractOtpCandidates } from '$utils/otp';
import { invoke } from '@tauri-apps/api/core';

const hashText = (text: string): string => {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
};

export const fetchSmsSnapshot = async (smsUrl: string): Promise<{ rawBody: string; contentHash: string }> => {
  try {
    const payload = await invoke<{ raw_body: string }>('fetch_sms_snapshot', { smsUrl });
    const rawBody = payload.raw_body;
    return {
      rawBody,
      contentHash: hashText(rawBody)
    };
  } catch {
    const response = await fetch(smsUrl, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`SMS fetch failed: ${response.status} ${response.statusText}`);
    }

    const rawBody = await response.text();
    return {
      rawBody,
      contentHash: hashText(rawBody)
    };
  }
};

export const buildSmsMessage = (phoneEntryId: string, rawBody: string, contentHash: string): SmsMessage => ({
  id: `${phoneEntryId}-${Date.now()}`,
  phoneEntryId,
  rawBody,
  normalizedText: rawBody.replace(/\s+/g, ' ').trim(),
  otpCandidates: extractOtpCandidates(rawBody),
  detectedAt: new Date().toISOString(),
  contentHash
});
