import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import type * as React from "react";
import { cn } from "@/lib/utils";

export const Tabs = BaseTabs.Root;

export function TabsList({ className, children, ...props }: React.ComponentProps<typeof BaseTabs.List>) {
  return (
    <BaseTabs.List
      className={cn("relative flex gap-6 overflow-x-auto border-b border-line", className)}
      {...props}
    >
      {children}
      <BaseTabs.Indicator className="absolute bottom-0 left-0 h-0.5 w-(--active-tab-width) translate-x-(--active-tab-left) rounded-full bg-primary transition-[translate,width] duration-200 ease-out" />
    </BaseTabs.List>
  );
}

export function TabsTab({ className, ...props }: React.ComponentProps<typeof BaseTabs.Tab>) {
  return (
    <BaseTabs.Tab
      className={cn(
        "relative h-11 shrink-0 text-sm font-medium whitespace-nowrap text-muted outline-none transition-colors hover:text-ink data-active:text-ink",
        "focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-primary",
        className,
      )}
      {...props}
    />
  );
}

export function TabsPanel({ className, ...props }: React.ComponentProps<typeof BaseTabs.Panel>) {
  return <BaseTabs.Panel className={cn("pt-6 outline-none", className)} {...props} />;
}
