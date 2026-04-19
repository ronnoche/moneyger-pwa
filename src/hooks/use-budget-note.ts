import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, nowISO } from '@/db/db';

const DEBOUNCE_MS = 400;

export function useBudgetNote(
  key: string,
): [string, (value: string) => void] {
  const remote = useLiveQuery(() => db.budgetNotes.get(key), [key]);
  const [draft, setDraft] = useState<string>(remote?.content ?? '');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWritten = useRef<string | null>(null);

  useEffect(() => {
    if (remote === undefined) return;
    // Only sync down if we haven't just written this value ourselves
    if (lastWritten.current !== null && remote.content === lastWritten.current) {
      return;
    }
    setDraft(remote?.content ?? '');
  }, [remote]);

  const setValue = useCallback(
    (value: string) => {
      setDraft(value);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        lastWritten.current = value;
        void db.budgetNotes.put({
          id: key,
          content: value,
          updatedAt: nowISO(),
        });
      }, DEBOUNCE_MS);
    },
    [key],
  );

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return [draft, setValue];
}
