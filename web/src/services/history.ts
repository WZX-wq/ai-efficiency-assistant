/**
 * AI Efficiency Assistant — History Record CRUD Service
 *
 * Manages AI-generated content history stored in localStorage.
 * Automatically trims to MAX_RECORDS when the limit is exceeded.
 */

export interface HistoryRecord {
  /** Unique identifier (auto-generated) */
  id: string;
  /** Type of content operation */
  type:
    | 'rewrite'
    | 'expand'
    | 'translate'
    | 'summarize'
    | 'script'
    | 'plan'
    | 'chat'
    | 'copywriting'
    | 'creative'
    | 'seo'
    | 'template';
  /** Auto-generated summary of the content */
  title: string;
  /** The AI-generated content */
  content: string;
  /** Original input text (optional) */
  input?: string;
  /** Which tool generated it (e.g. '智能改写', '短视频脚本生成器') */
  tool: string;
  /** ISO date string */
  createdAt: string;
}

const STORAGE_KEY = 'ai-assistant-history';
const MAX_RECORDS = 200;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Read raw records from localStorage, returns empty array on failure. */
function readRecords(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as HistoryRecord[];
  } catch {
    return [];
  }
}

/** Persist records to localStorage. */
function writeRecords(records: HistoryRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Storage full or unavailable — silently fail.
    console.warn(`[history] Failed to write to localStorage (key: ${STORAGE_KEY})`);
  }
}

/** Generate a unique-enough id for a history record. */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Trim records to MAX_RECORDS, removing the oldest entries first.
 * Returns the trimmed array (mutates in place).
 */
function enforceLimit(records: HistoryRecord[]): HistoryRecord[] {
  if (records.length > MAX_RECORDS) {
    // Sort ascending by createdAt so the oldest are at the front, then drop.
    records.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    records.splice(0, records.length - MAX_RECORDS);
  }
  return records;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get all history records, sorted by `createdAt` descending (newest first).
 */
export function getHistory(): HistoryRecord[] {
  const records = readRecords();
  records.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return records;
}

/**
 * Add a new history record.
 *
 * Automatically generates `id` and `createdAt`.
 * If the total number of records exceeds MAX_RECORDS, the oldest records are
 * removed.
 */
export function addHistory(
  record: Omit<HistoryRecord, 'id' | 'createdAt'>,
): HistoryRecord {
  const records = readRecords();

  const newRecord: HistoryRecord = {
    ...record,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };

  records.push(newRecord);
  enforceLimit(records);
  writeRecords(records);

  return newRecord;
}

/**
 * Delete a single history record by its id.
 * Silently no-ops if the id does not exist.
 */
export function deleteHistory(id: string): void {
  const records = readRecords();
  const index = records.findIndex((r) => r.id === id);
  if (index !== -1) {
    records.splice(index, 1);
    writeRecords(records);
  }
}

/**
 * Delete **all** history records.
 */
export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    console.warn(`[history] Failed to clear localStorage (key: ${STORAGE_KEY})`);
  }
}

/**
 * Full-text search across `title` and `content` fields (case-insensitive).
 * Returns matching records sorted by `createdAt` descending.
 */
export function searchHistory(query: string): HistoryRecord[] {
  if (!query.trim()) return getHistory();

  const lowerQuery = query.toLowerCase().trim();

  return readRecords()
    .filter(
      (r) =>
        r.title.toLowerCase().includes(lowerQuery) ||
        r.content.toLowerCase().includes(lowerQuery),
    )
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}
