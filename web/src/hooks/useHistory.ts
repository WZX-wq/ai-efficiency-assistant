import { useState, useCallback } from 'react';
import {
  getHistory,
  addHistory,
  deleteHistory,
  clearHistory,
  searchHistory,
  HistoryRecord,
} from '../services/history';

export function useHistory() {
  const [records, setRecords] = useState<HistoryRecord[]>(() => getHistory());

  const add = useCallback(
    (record: Omit<HistoryRecord, 'id' | 'createdAt'>) => {
      const newRecord = addHistory(record);
      setRecords(getHistory());
      return newRecord;
    },
    [],
  );

  const remove = useCallback((id: string) => {
    deleteHistory(id);
    setRecords(getHistory());
  }, []);

  const clear = useCallback(() => {
    clearHistory();
    setRecords([]);
  }, []);

  const search = useCallback((query: string) => {
    if (!query.trim()) return getHistory();
    return searchHistory(query);
  }, []);

  return {
    records,
    add,
    remove,
    clear,
    search,
    refresh: () => setRecords(getHistory()),
  };
}
