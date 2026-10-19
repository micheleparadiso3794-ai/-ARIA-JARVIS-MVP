import type * as React from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-md border border-line-strong bg-surface px-3 text-base text-ink placeholder:text-muted/80 " +
  "transition-[border-color,box-shadow] duration-150 outline-none " +
  "focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:outline-none " +
  "aria-invalid:border-danger aria-invalid:ring-danger/15";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(fieldBase, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(fieldBase, "min-h-28 resize-y py-2.5 leading-relaxed", className)} {...props} />;
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
        {hint && <span className="ml-2 font-normal text-muted">{hint}</span>}
      </label>
      {children}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
