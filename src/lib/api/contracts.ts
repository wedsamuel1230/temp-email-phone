export type ChangeMode = 'next' | 'random' | 'manual';

export interface AppBootstrapStatus {
  stack: string;
  architecture: string;
  readiness: 'ready' | 'in-progress';
}

export interface MailTmDomain {
  id: string;
  domain: string;
  isActive: boolean;
  isPrivate: boolean;
}

export interface TempEmailAccount {
  id: string;
  address: string;
  password: string;
  token?: string;
}

export interface EmailMessageSummary {
  id: string;
  fromName: string;
  fromAddress: string;
  subject: string;
  intro: string;
  seen: boolean;
  hasAttachments: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailMessageDetail extends EmailMessageSummary {
  text: string;
  html: string[];
  otpCandidates: string[];
}

export interface PhonePoolEntry {
  id: string;
  phoneNumber: string;
  smsUrl: string;
  isActive: boolean;
  status: 'ready' | 'disabled' | 'error';
  lastCheckedAt: string | null;
}

export interface SmsMessage {
  id: string;
  phoneEntryId: string;
  rawBody: string;
  normalizedText: string;
  otpCandidates: string[];
  detectedAt: string;
  contentHash: string;
}

export interface AppSettings {
  emailRefreshIntervalMs: number;
  smsRefreshIntervalMs: number;
  autoSelectNewest: boolean;
  soundEnabled: boolean;
  changeMode: ChangeMode;
}

export interface ParseImportResult {
  totalLines: number;
  validCount: number;
  invalidCount: number;
}
