import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-zinc-800 bg-zinc-950 px-6 py-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-zinc-900 text-zinc-500">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
      <p className="max-w-xs text-sm text-zinc-500">{description}</p>
      {action}
    </div>
  );
}
