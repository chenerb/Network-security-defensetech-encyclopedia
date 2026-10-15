import type { ChoiceKey, ExamAttempt, LearningProgress } from '../types';

export const PROGRESS_KEY = 'defense-learning-progress:v1';
interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
interface ValidContent {
  lessonIds: string[];
  documentPaths: string[];
  examIds: string[];
}
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const numberKey = (value: string) => /^[1-9]\d?$|^100$/.test(value);

export function emptyProgress(): LearningProgress {
  return { version: 1, completed: [], bookmarks: [], lastPath: null, attempts: {} };
}

function stringList(value: unknown, allowed: Set<string>) {
  return Array.isArray(value)
    ? [...new Set(value.filter((v): v is string => typeof v === 'string' && allowed.has(v)))]
    : [];
}

function readAttempt(raw: Record<string, unknown>): ExamAttempt {
  const choices: Record<number, ChoiceKey> = {};
  const notes: Record<number, string> = {};
  if (isRecord(raw.choices))
    for (const [key, value] of Object.entries(raw.choices)) {
      if (numberKey(key) && typeof value === 'string' && /^[A-D]$/.test(value))
        choices[Number(key)] = value as ChoiceKey;
    }
  if (isRecord(raw.notes))
    for (const [key, value] of Object.entries(raw.notes)) {
      if (numberKey(key) && typeof value === 'string') notes[Number(key)] = value.slice(0, 20_000);
    }
  const revealed = Array.isArray(raw.revealed)
    ? [
        ...new Set(
          raw.revealed.filter(
            (n): n is number => typeof n === 'number' && Number.isInteger(n) && n > 0 && n <= 100,
          ),
        ),
      ]
    : [];
  return {
    choices,
    notes,
    revealed,
    submitted: raw.submitted === true,
    updatedAt:
      typeof raw.updatedAt === 'string' && Number.isFinite(Date.parse(raw.updatedAt))
        ? raw.updatedAt
        : '',
  };
}

export function readProgress(
  storage: StorageLike | undefined,
  valid: ValidContent,
): { progress: LearningProgress; warning: string | null } {
  try {
    if (!storage) throw new Error('unavailable');
    const source = storage.getItem(PROGRESS_KEY);
    if (source === null) return { progress: emptyProgress(), warning: null };
    if (source.length > 5_000_000) throw new Error('too large');
    const raw: unknown = JSON.parse(source);
    if (!isRecord(raw) || raw.version !== 1) throw new Error('invalid version');
    if (
      !Array.isArray(raw.completed) ||
      !Array.isArray(raw.bookmarks) ||
      !isRecord(raw.attempts) ||
      (raw.lastPath !== null && typeof raw.lastPath !== 'string')
    )
      throw new Error('invalid fields');
    const documents = new Set(valid.documentPaths);
    const attempts: Record<string, ExamAttempt> = {};
    if (isRecord(raw.attempts))
      for (const id of valid.examIds) {
        const value = Object.hasOwn(raw.attempts, id) ? raw.attempts[id] : null;
        if (isRecord(value)) attempts[id] = readAttempt(value);
      }
    return {
      progress: {
        version: 1,
        completed: stringList(raw.completed, new Set(valid.lessonIds)),
        bookmarks: stringList(raw.bookmarks, documents),
        lastPath:
          typeof raw.lastPath === 'string' && documents.has(raw.lastPath) ? raw.lastPath : null,
        attempts,
      },
      warning: null,
    };
  } catch {
    return {
      progress: emptyProgress(),
      warning: '未能读取本地进度，本次仍可正常学习。已有存储不会被自动覆盖。',
    };
  }
}

export function writeProgress(
  storage: StorageLike | undefined,
  progress: LearningProgress,
): boolean {
  try {
    if (!storage) return false;
    storage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}
