import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { cn } from "@/lib/utils";

/** Scelta singola tra poche opzioni, sempre visibili. */
export function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  className,
  "aria-label": ariaLabel,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: { value: T; label: React.ReactNode }[];
  className?: string;
  "aria-label": string;
}) {
  return (
    <ToggleGroup
      aria-label={ariaLabel}
      value={[value]}
      onValueChange={(v) => v[0] && onValueChange(v[0] as T)}
      className={cn("inline-flex flex-wrap gap-1 rounded-md bg-ink/5 p-1", className)}
    >
      {options.map((o) => (
        <Toggle
          key={o.value}
          value={o.value}
          className={cn(
            "h-8 rounded-[7px] px-3 text-sm text-muted transition-[background-color,color,box-shadow] duration-150 select-none",
            "hover:text-ink data-pressed:bg-surface data-pressed:text-ink data-pressed:shadow-[0_1px_2px_rgb(22_33_43/0.12)]",
          )}
        >
          {o.label}
        </Toggle>
      ))}
    </ToggleGroup>
  );
}
