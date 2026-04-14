import type { AppSettings, PhonePoolEntry, SmsMessage, TempEmailAccount } from '$api/contracts';

const PHONE_POOL_KEY = 'temp-inbox-phone-pool';
const SETTINGS_KEY = 'temp-inbox-settings';
const ACTIVE_PHONE_KEY = 'temp-inbox-active-phone';
const EMAIL_SESSION_KEY = 'temp-inbox-email-session';
const SMS_MESSAGES_KEY = 'temp-inbox-sms-messages';

const defaultSettings: AppSettings = {
  emailRefreshIntervalMs: 5000,
  smsRefreshIntervalMs: 5000,
  autoSelectNewest: true,
  soundEnabled: true,
  changeMode: 'next'
};

const readJson = <T>(key: string, fallback: T): T => {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const localStorageService = {
  getPhonePool(): PhonePoolEntry[] {
    return readJson<PhonePoolEntry[]>(PHONE_POOL_KEY, []);
  },
  savePhonePool(entries: PhonePoolEntry[]): void {
    localStorage.setItem(PHONE_POOL_KEY, JSON.stringify(entries));
  },
  getActivePhoneId(): string | null {
    return localStorage.getItem(ACTIVE_PHONE_KEY);
  },
  setActivePhoneId(value: string | null): void {
    if (!value) {
      localStorage.removeItem(ACTIVE_PHONE_KEY);
      return;
    }
    localStorage.setItem(ACTIVE_PHONE_KEY, value);
  },
  getEmailSession(): TempEmailAccount | null {
    return readJson<TempEmailAccount | null>(EMAIL_SESSION_KEY, null);
  },
  setEmailSession(session: TempEmailAccount | null): void {
    if (!session) {
      localStorage.removeItem(EMAIL_SESSION_KEY);
      return;
    }
    localStorage.setItem(EMAIL_SESSION_KEY, JSON.stringify(session));
  },
  getSmsMessages(): SmsMessage[] {
    return readJson<SmsMessage[]>(SMS_MESSAGES_KEY, []);
  },
  saveSmsMessages(messages: SmsMessage[]): void {
    localStorage.setItem(SMS_MESSAGES_KEY, JSON.stringify(messages));
  },
  getSettings(): AppSettings {
    return { ...defaultSettings, ...readJson<AppSettings>(SETTINGS_KEY, defaultSettings) };
  },
  saveSettings(settings: AppSettings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }
};
