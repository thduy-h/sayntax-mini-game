import { cn } from "@/lib/utils";

interface SwitchFieldProps {
  defaultChecked?: boolean;
  description: string;
  label: string;
  name: string;
  value?: string;
}

export function SwitchField({
  defaultChecked,
  description,
  label,
  name,
  value = "true",
}: SwitchFieldProps) {
  return (
    <label className="flex min-h-16 cursor-pointer items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-[#fffdf8] px-4 py-4">
      <div className="space-y-1">
        <span className="block text-sm font-semibold text-slate-900">{label}</span>
        <span className="block text-sm leading-6 text-slate-600">{description}</span>
      </div>
      <span className="relative mt-1 inline-flex h-7 w-12 items-center">
        <input
          className="peer sr-only"
          defaultChecked={defaultChecked}
          name={name}
          type="checkbox"
          value={value}
        />
        <span className="absolute inset-0 rounded-full bg-slate-300 transition peer-checked:bg-teal-700" />
        <span
          className={cn(
            "absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5",
          )}
        />
      </span>
    </label>
  );
}
