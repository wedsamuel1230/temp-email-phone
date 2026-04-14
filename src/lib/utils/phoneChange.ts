import type { ChangeMode, PhonePoolEntry } from '$api/contracts';

export const pickNextActivePhone = (entries: PhonePoolEntry[], currentId: string | null): PhonePoolEntry | null => {
  if (!entries.length) {
    return null;
  }

  if (!currentId) {
    return entries[0] ?? null;
  }

  const currentIndex = entries.findIndex((entry) => entry.id === currentId);
  if (currentIndex === -1) {
    return entries[0] ?? null;
  }

  return entries[(currentIndex + 1) % entries.length] ?? null;
};

export const pickRandomPhone = (entries: PhonePoolEntry[], currentId: string | null): PhonePoolEntry | null => {
  if (!entries.length) {
    return null;
  }

  if (entries.length === 1) {
    return entries[0] ?? null;
  }

  const candidates = entries.filter((entry) => entry.id !== currentId);
  const pool = candidates.length ? candidates : entries;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex] ?? null;
};

export const pickPhoneByMode = (
  entries: PhonePoolEntry[],
  mode: ChangeMode,
  currentId: string | null,
  manualId?: string
): PhonePoolEntry | null => {
  if (mode === 'manual') {
    if (!manualId) {
      return null;
    }
    return entries.find((entry) => entry.id === manualId) ?? null;
  }

  if (mode === 'random') {
    return pickRandomPhone(entries, currentId);
  }

  return pickNextActivePhone(entries, currentId);
};

export const removePhoneEntry = (
  entries: PhonePoolEntry[],
  removeId: string,
  currentActiveId: string | null
): { entries: PhonePoolEntry[]; nextActiveId: string | null } => {
  const removeIndex = entries.findIndex((entry) => entry.id === removeId);
  if (removeIndex === -1) {
    return { entries, nextActiveId: currentActiveId };
  }

  const nextEntries = entries.filter((entry) => entry.id !== removeId);

  if (!nextEntries.length) {
    return { entries: nextEntries, nextActiveId: null };
  }

  if (currentActiveId !== removeId) {
    return { entries: nextEntries, nextActiveId: currentActiveId };
  }

  const nextIndex = removeIndex % nextEntries.length;
  return { entries: nextEntries, nextActiveId: nextEntries[nextIndex]?.id ?? null };
};
