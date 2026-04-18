import { useState } from 'react';
import { useGroups } from '@/db/hooks';
import { archiveGroup, createGroup, renameGroup } from '@/features/groups/repo';
import { Button } from '@/components/ui/button';
import { Field, inputClass } from '@/components/ui/field';
import { SwipeRow } from '@/components/swipe-row';
import { PageHeader } from '@/components/layout/page-header';
import { cn } from '@/lib/cn';

export default function SettingsGroups() {
  const groups = useGroups();
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    await createGroup({ name: trimmed });
    setName('');
  }

  async function handleRename(id: string) {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    await renameGroup(id, trimmed);
    setEditingId(null);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-4">
      <PageHeader title="Groups" backTo="/settings" />

      <form onSubmit={handleAdd} className="mb-6 space-y-2">
        <Field label="New group" htmlFor="group-name">
          <div className="flex gap-2">
            <input
              id="group-name"
              className={cn(inputClass, 'flex-1')}
              placeholder="Monthly Bills"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />
            <Button type="submit" disabled={!name.trim()}>
              Add
            </Button>
          </div>
        </Field>
      </form>

      {groups === undefined ? (
        <p className="text-sm text-ink-500">Loading...</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-ink-500">No groups yet.</p>
      ) : (
        <ul className="divide-y divide-ink-200 overflow-hidden rounded-xl bg-white shadow-sm dark:divide-ink-700 dark:bg-ink-800">
          {groups.map((group) => (
            <li key={group.id}>
              <SwipeRow onDelete={() => archiveGroup(group.id)}>
                {editingId === group.id ? (
                  <div className="flex items-center gap-2 px-4 py-3">
                    <input
                      autoFocus
                      className={cn(inputClass, 'h-10 flex-1')}
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleRename(group.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(group.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(group.id);
                      setEditingName(group.name);
                    }}
                    className="flex w-full items-center px-4 py-3 text-left text-sm"
                  >
                    {group.name}
                  </button>
                )}
              </SwipeRow>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

