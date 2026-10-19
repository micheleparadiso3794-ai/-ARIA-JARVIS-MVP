import { Select as BaseSelect } from "@base-ui/react/select";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder = "Scegli",
  id,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: (string | SelectOption)[];
  placeholder?: string;
  id?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const items = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <BaseSelect.Root
      items={items}
      value={value || null}
      onValueChange={(v) => onValueChange((v as string | null) ?? "")}
    >
      <BaseSelect.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-md border border-line-strong bg-surface px-3 text-left text-base text-ink",
          "transition-[border-color,box-shadow] duration-150 outline-none hover:border-ink/40",
          "focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:outline-none",
          "data-popup-open:border-primary",
          className,
        )}
      >
        <BaseSelect.Value className="truncate data-placeholder:text-muted/80" placeholder={placeholder} />
        <BaseSelect.Icon className="text-muted">
          <ChevronsUpDown className="size-4" />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner className="z-50 outline-none select-none" sideOffset={6} alignItemWithTrigger={false}>
          <BaseSelect.Popup
            className={cn(
              "min-w-(--anchor-width) origin-(--transform-origin) rounded-md border border-line bg-surface p-1 text-ink",
              "shadow-[0_12px_32px_-12px_rgb(22_33_43/0.35)] outline-none",
              "transition-[scale,opacity] duration-150 ease-out data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0",
            )}
          >
            <BaseSelect.List className="max-h-(--available-height) overflow-y-auto">
              {items.map((item) => (
                <BaseSelect.Item
                  key={item.value}
                  value={item.value}
                  className="grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-sm py-2 pr-4 pl-2 text-sm outline-none select-none data-highlighted:bg-primary-soft"
                >
                  <BaseSelect.ItemIndicator className="col-start-1 text-primary">
                    <Check className="size-4" />
                  </BaseSelect.ItemIndicator>
                  <BaseSelect.ItemText className="col-start-2">{item.label}</BaseSelect.ItemText>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
