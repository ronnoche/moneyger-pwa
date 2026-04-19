import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { useApplyPreset } from '@/hooks/use-apply-preset';
import { useAutoAssignHistory } from '@/hooks/use-auto-assign-history';
import { usePresetPreview } from '@/hooks/use-preset-preview';
import { useRevertAutoAssign } from '@/hooks/use-revert-auto-assign';
import { listPresetIds } from '@/lib/auto-assign';

const PRESET_IDS = listPresetIds();

export default function DevAutoAssign() {
  const [presetId, setPresetId] = useState(PRESET_IDS[0]);
  const viewedMonth = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, []);

  const preview = usePresetPreview(presetId, viewedMonth);
  const apply = useApplyPreset(viewedMonth);
  const revert = useRevertAutoAssign();
  const history = useAutoAssignHistory(20);

  const [lastError, setLastError] = useState<string | null>(null);

  async function handleApply() {
    setLastError(null);
    try {
      await apply(presetId);
    } catch (err) {
      setLastError((err as Error).message);
    }
  }

  async function handleRevert(id: string) {
    setLastError(null);
    try {
      await revert(id);
    } catch (err) {
      setLastError((err as Error).message);
    }
  }

  return (
    <div className="p-4">
      <PageHeader title="Dev: Auto-Assign" backTo="/more" />

      <section className="mb-6">
        <label className="mb-1 block text-sm">Preset</label>
        <select
          className="w-full rounded border p-2"
          value={presetId}
          onChange={(e) => setPresetId(e.target.value)}
        >
          {PRESET_IDS.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-ink-500">
          Viewed month: {viewedMonth.toISOString().slice(0, 7)}
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold">Preview</h2>
        <pre className="max-h-64 overflow-auto rounded bg-ink-100 p-2 text-xs dark:bg-ink-800">
          {JSON.stringify(preview, null, 2)}
        </pre>
        <button
          className="mt-2 rounded bg-brand-600 px-3 py-2 text-sm text-white"
          onClick={handleApply}
        >
          Apply preset
        </button>
      </section>

      {lastError && (
        <p className="mb-4 rounded bg-red-100 p-2 text-sm text-red-700">
          {lastError}
        </p>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold">Recent applications</h2>
        {!history && <p className="text-xs text-ink-500">loading...</p>}
        {history && history.length === 0 && (
          <p className="text-xs text-ink-500">none yet</p>
        )}
        <ul className="space-y-2">
          {history?.map((entry) => (
            <li
              key={entry.id}
              className="rounded border p-2 text-xs"
            >
              <div className="flex justify-between gap-2">
                <div>
                  <div className="font-mono">{entry.presetId}</div>
                  <div className="text-ink-500">
                    {entry.appliedAt} · {entry.moveCount} moves ·{' '}
                    {entry.totalAmount.toFixed(2)}
                  </div>
                  {entry.revertedAt && (
                    <div className="text-ink-500">
                      reverted {entry.revertedAt}
                    </div>
                  )}
                </div>
                {!entry.revertedAt && (
                  <button
                    className="self-start rounded bg-ink-100 px-2 py-1 dark:bg-ink-800"
                    onClick={() => handleRevert(entry.id)}
                  >
                    Revert
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
