import { Drawer as BaseDrawer } from "@base-ui/react/drawer";
import { X } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

/** Pannello laterale che scorre da destra; su mobile si chiude anche con lo swipe. */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <BaseDrawer.Root open={open} onOpenChange={onOpenChange} swipeDirection="right">
      <BaseDrawer.Portal>
        <BaseDrawer.Backdrop className="fixed inset-0 z-40 bg-ink/30 opacity-[calc(1-var(--drawer-swipe-progress))] transition-opacity duration-300 data-starting-style:opacity-0 data-ending-style:opacity-0 data-swiping:duration-0" />
        <BaseDrawer.Viewport className="fixed inset-0 z-50 flex items-stretch justify-end">
          <BaseDrawer.Popup
            className={cn(
              "h-full w-full max-w-xl overflow-y-auto overscroll-contain border-l border-line bg-surface text-ink outline-none",
              "[transform:translateX(var(--drawer-swipe-movement-x))] transition-transform duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
              "data-starting-style:[transform:translateX(100%)] data-ending-style:[transform:translateX(100%)] data-swiping:select-none data-swiping:duration-0",
              className,
            )}
          >
            <BaseDrawer.Content className="flex min-h-full flex-col">
              <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-surface/95 px-6 py-5 backdrop-blur">
                <div className="min-w-0">
                  <BaseDrawer.Title className="text-lg font-semibold text-balance">{title}</BaseDrawer.Title>
                  {description && (
                    <BaseDrawer.Description className="mt-1 text-sm text-muted">{description}</BaseDrawer.Description>
                  )}
                </div>
                <BaseDrawer.Close
                  aria-label="Chiudi"
                  className="-mr-2 grid size-9 shrink-0 place-items-center rounded-md text-muted hover:bg-ink/6 hover:text-ink"
                >
                  <X className="size-5" />
                </BaseDrawer.Close>
              </header>
              <div className="flex-1 px-6 py-6">{children}</div>
            </BaseDrawer.Content>
          </BaseDrawer.Popup>
        </BaseDrawer.Viewport>
      </BaseDrawer.Portal>
    </BaseDrawer.Root>
  );
}
