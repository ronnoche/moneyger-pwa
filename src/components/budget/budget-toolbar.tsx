import { List, LayoutGrid, Redo2, Undo2, Clock, Plus } from 'lucide-react';
import { RecentMovesPopover } from '@/components/budget/recent-moves-popover';
import { cn } from '@/lib/cn';

export type BudgetViewMode = 'list' | 'block';

interface Props {
  viewMode: BudgetViewMode;
  onViewModeChange: (next: BudgetViewMode) => void;
  onCreateGroup: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export function BudgetToolbar({
  viewMode,
  onViewModeChange,
  onCreateGroup,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <ToolbarButton
        icon={<Plus size={14} strokeWidth={2} aria-hidden />}
        label="Bucket"
        onClick={onCreateGroup}
      />

      <ToolbarButton
        icon={<Undo2 size={14} strokeWidth={2} aria-hidden />}
        label="Undo"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label="Undo last change"
      />

      <ToolbarButton
        icon={<Redo2 size={14} strokeWidth={2} aria-hidden />}
        label="Redo"
        onClick={onRedo}
        disabled={!canRedo}
        aria-label="Redo"
      />

      <RecentMovesPopover
        trigger={
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[13px] font-medium text-[color:var(--color-brand-700)] hover:bg-[color:var(--color-surface-2)]"
          >
            <Clock size={14} strokeWidth={2} aria-hidden />
            <span>Recent Moves</span>
          </button>
        }
      />

      <div className="ml-auto inline-flex rounded-md border border-[color:var(--color-border)] p-0.5">
        <ViewToggle
          icon={<List size={14} strokeWidth={2} aria-hidden />}
          active={viewMode === 'list'}
          onClick={() => onViewModeChange('list')}
          label="List view"
        />
        <ViewToggle
          icon={<LayoutGrid size={14} strokeWidth={2} aria-hidden />}
          active={viewMode === 'block'}
          onClick={() => onViewModeChange('block')}
          label="Block view"
        />
      </div>
    </div>
  );
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  'aria-label'?: string;
}

function ToolbarButton({
  icon,
  label,
  onClick,
  disabled,
  'aria-label': ariaLabel,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? label}
      className={cn(
        'inline-flex h-8 items-center gap-1 rounded-md px-2 text-[13px] font-medium text-[color:var(--color-brand-700)] hover:bg-[color:var(--color-surface-2)] disabled:cursor-not-allowed disabled:text-[color:var(--color-fg-subtle)] disabled:hover:bg-transparent',
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ViewToggle({
  icon,
  active,
  onClick,
  label,
}: {
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded',
        active
          ? 'bg-[color:var(--color-surface-2)] text-[color:var(--color-fg)]'
          : 'text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]',
      )}
    >
      {icon}
    </button>
  );
}
