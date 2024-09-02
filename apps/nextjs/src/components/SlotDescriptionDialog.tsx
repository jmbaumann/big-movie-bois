import { HelpCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

export default function SlotDescriptionDialog({
  className,
}: {
  className?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger className={className}>
        <HelpCircle />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Slot Descriptions</DialogTitle>
          <DialogDescription>
            The slot that you put your film in will determine how that film will
            be scored
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
