import useBreakpoint from "~/utils/hooks/use-breakpoint";
import { cn } from "~/utils/shadcn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "~/components/ui/sheet";

const ResponsiveDialog = ({
  children,
  open,
  setOpen,
}: {
  children?: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const breakpoint = useBreakpoint();
  const DialogOrSheet = breakpoint.isMobile ? Sheet : Dialog;

  return (
    <DialogOrSheet open={open} onOpenChange={setOpen}>
      {children}
    </DialogOrSheet>
  );
};

const Trigger = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const breakpoint = useBreakpoint();
  const TriggerComponent = breakpoint.isMobile ? SheetTrigger : DialogTrigger;

  return <TriggerComponent className={className}>{children}</TriggerComponent>;
};

const Content = ({
  children,
  className,
  side,
  forceMount,
  autoFocus,
  onCloseAutoFocus,
}: {
  children: React.ReactNode;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  forceMount?: boolean;
  autoFocus?: boolean;
  onCloseAutoFocus?: (e: Event) => void;
}) => {
  const breakpoint = useBreakpoint();
  const ContentComponent = breakpoint.isMobile ? SheetContent : DialogContent;

  const props = breakpoint.isMobile
    ? { side: side ?? "bottom", className: "text-white", onCloseAutoFocus }
    : {
        className: cn("max-w-2/3 max-h-[90%] w-2/3 overflow-y-auto text-white", className),
        forceMount: (forceMount ? true : undefined) as true | undefined,
        autoFocus,
        onCloseAutoFocus,
      };

  return <ContentComponent {...props}>{children}</ContentComponent>;
};

const Header = ({ children }: { children: React.ReactNode }) => {
  const breakpoint = useBreakpoint();
  const HeaderComponent = breakpoint.isMobile ? SheetHeader : DialogHeader;

  return <HeaderComponent>{children}</HeaderComponent>;
};

const Title = ({ children }: { children: React.ReactNode }) => {
  const breakpoint = useBreakpoint();
  const HeaderComponent = breakpoint.isMobile ? SheetTitle : DialogTitle;

  return <HeaderComponent>{children}</HeaderComponent>;
};

const Footer = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const breakpoint = useBreakpoint();
  const FooterComponent = breakpoint.isMobile ? SheetFooter : DialogFooter;

  return <FooterComponent className={className}>{children}</FooterComponent>;
};

ResponsiveDialog.Trigger = Trigger;
ResponsiveDialog.Content = Content;
ResponsiveDialog.Header = Header;
ResponsiveDialog.Title = Title;
ResponsiveDialog.Footer = Footer;

export default ResponsiveDialog;
