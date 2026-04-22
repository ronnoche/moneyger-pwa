import * as Tabs from '@radix-ui/react-tabs';
import { PageHeader } from '@/components/layout/page-header';
import SpendingTab from './spending-tab';
import NetWorthTab from './net-worth-tab';
import { cn } from '@/lib/cn';

export default function Reports() {
  return (
    <div className="mx-auto max-w-xl px-4 py-4">
      <PageHeader title="Reflect" />
      <Tabs.Root defaultValue="spending" className="space-y-4">
        <Tabs.List className="grid grid-cols-2 overflow-hidden rounded-xl border border-ink-200 dark:border-ink-700">
          <TabTrigger value="spending" label="Spending" />
          <TabTrigger value="net-worth" label="Net Worth" />
        </Tabs.List>
        <Tabs.Content value="spending" className="focus:outline-none">
          <SpendingTab />
        </Tabs.Content>
        <Tabs.Content value="net-worth" className="focus:outline-none">
          <NetWorthTab />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

function TabTrigger({ value, label }: { value: string; label: string }) {
  return (
    <Tabs.Trigger
      value={value}
      className={cn(
        'h-11 text-sm font-medium text-ink-500',
        'data-[state=active]:bg-brand-600 data-[state=active]:text-white',
        'active:bg-ink-100 dark:active:bg-ink-800 dark:data-[state=active]:bg-brand-600',
      )}
    >
      {label}
    </Tabs.Trigger>
  );
}
