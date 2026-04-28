import { useEffect, useState } from 'react';
import { subscribeSyncStatus } from '@/lib/sync';

type SyncStatus = Parameters<Parameters<typeof subscribeSyncStatus>[0]>[0];

function getCurrentSyncStatus(): SyncStatus {
  // subscribeSyncStatus calls the listener immediately with current status,
  // so capture it synchronously for useState initializer
  let initial: SyncStatus = { state: 'idle' };
  const unsub = subscribeSyncStatus((s) => { initial = s; });
  unsub();
  return initial;
}

export function useSheetStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(getCurrentSyncStatus);
  useEffect(() => subscribeSyncStatus(setStatus), []);
  return status;
}
