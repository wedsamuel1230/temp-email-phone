import type { EmailMessageDetail, EmailMessageSummary, MailTmDomain, TempEmailAccount } from '$api/contracts';
import { extractOtpCandidates } from '$utils/otp';

const MAILTM_BASE_URL = 'https://api.mail.tm';

const normalizeHeaders = (token?: string): HeadersInit => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {})
});

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${MAILTM_BASE_URL}${path}`, init);
  if (!response.ok) {
    throw new Error(`Mail.tm request failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
};

export const getAvailableDomains = async (): Promise<MailTmDomain[]> => {
  const payload = await requestJson<{ 'hydra:member': Array<{ id: string; domain: string; isActive: boolean; isPrivate: boolean }> }>('/domains');
  return payload['hydra:member'].map((domain) => ({
    id: domain.id,
    domain: domain.domain,
    isActive: domain.isActive,
    isPrivate: domain.isPrivate
  }));
};

export const createAccount = async (address: string, password: string): Promise<TempEmailAccount> => {
  const payload = await requestJson<{ id: string; address: string }>('/accounts', {
    method: 'POST',
    headers: normalizeHeaders(),
    body: JSON.stringify({ address, password })
  });

  return {
    id: payload.id,
    address: payload.address,
    password
  };
};

export const createToken = async (address: string, password: string): Promise<string> => {
  const payload = await requestJson<{ token: string }>('/token', {
    method: 'POST',
    headers: normalizeHeaders(),
    body: JSON.stringify({ address, password })
  });

  return payload.token;
};

export const getMessages = async (token: string): Promise<EmailMessageSummary[]> => {
  const payload = await requestJson<{ 'hydra:member': Array<any> }>('/messages', {
    method: 'GET',
    headers: normalizeHeaders(token)
  });

  return payload['hydra:member'].map((message) => ({
    id: message.id,
    fromName: message.from?.name ?? '',
    fromAddress: message.from?.address ?? '',
    subject: message.subject ?? '',
    intro: message.intro ?? '',
    seen: Boolean(message.seen),
    hasAttachments: Boolean(message.hasAttachments),
    createdAt: message.createdAt,
    updatedAt: message.updatedAt
  }));
};

export const getMessageById = async (token: string, id: string): Promise<EmailMessageDetail> => {
  const message = await requestJson<any>(`/messages/${id}`, {
    method: 'GET',
    headers: normalizeHeaders(token)
  });

  return {
    id: message.id,
    fromName: message.from?.name ?? '',
    fromAddress: message.from?.address ?? '',
    subject: message.subject ?? '',
    intro: message.intro ?? '',
    seen: Boolean(message.seen),
    hasAttachments: Boolean(message.hasAttachments),
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    text: message.text ?? '',
    html: Array.isArray(message.html) ? message.html : [],
    otpCandidates: extractOtpCandidates(message.subject, message.text, Array.isArray(message.html) ? message.html.join(' ') : '')
  };
};
