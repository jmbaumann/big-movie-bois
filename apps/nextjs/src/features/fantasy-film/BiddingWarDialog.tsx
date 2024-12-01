import { HelpCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

export default function BiddingWarDialog({ className }: { className?: string }) {
  return (
    <Dialog>
      <DialogTrigger className={className}>
        <HelpCircle />
      </DialogTrigger>
      <DialogContent className="max-w-2/3 max-h-[90%] w-2/3 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bidding War - How To Play</DialogTitle>
          <div className="text-white">
            <p className="my-2">
              <strong>Bidding War</strong> is a variation of Fantasy Film that is open to everyone!
            </p>
            <p className="my-2">
              Each Studio is given a budget of $100 with which they have to fill their slots with Films. Each Film is
              given a price based on popularity (the more popular the film, the more expensive). Strategically purchase
              Films & assign them to their slot to earn points.
            </p>
            <p className="my-2">
              The Films available for purchase are ones whose release date falls within the date range of the session.
              Like in Fantasy Film, your Films will lock into their slot 7 days before their release date & will no
              longer be able to be dropped or swapped into a different slot.
            </p>
            <p className="my-2">Film prices are based on their popularity according to TMDB.</p>
            <p className="my-2">
              Films you've purchased can be dropped & you will recoup 80% of the amount of money you purchased the Film
              for.
            </p>
            <p className="my-2">A new Bidding War session begins every quarter.</p>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
