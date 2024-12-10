import useBreakpoint from "~/utils/hooks/use-breakpoint";
import { cn } from "~/utils/shadcn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "~/components/ui/sheet";

export default function ResponsiveDialog({
  trigger,
  children,
  title,
  className,
  side,
  open,
  setOpen,
}: {
  trigger?: React.ReactNode;
  children: React.ReactNode;
  title: string;
  className?: string;
  side?: "top" | "bottom" | "left" | "right" | null | undefined;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const breakpoint = useBreakpoint();

  if (!breakpoint.isMobile)
    return (
      <Dialog>
        <DialogTrigger className={className}>{trigger}</DialogTrigger>
        <DialogContent className="max-w-2/3 max-h-[90%] w-2/3 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="text-white">{children}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="px-2 py-2">{trigger}</SheetTrigger>
      <SheetContent
        side={side ?? "bottom"}
        className={cn("scrollbar-hidden max-h-[90%] bg-neutral-900 text-white", className)}
        aria-describedby={undefined}
      >
        <SheetHeader>
          <SheetTitle className="text-lg font-semibold text-white">{title}</SheetTitle>

          {children}
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}
