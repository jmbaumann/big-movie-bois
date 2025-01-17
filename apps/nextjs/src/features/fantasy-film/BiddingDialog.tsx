import { ArrowUpRightFromSquare } from "lucide-react";

import { cn } from "~/utils/shadcn";
import ResponsiveDialog from "~/components/ResponsiveDialog";

export default function BiddingDialog({ className }: { className?: string }) {
  return (
    <ResponsiveDialog>
      <ResponsiveDialog.Trigger className={cn("inline-block", className)}>
        <p className="mr-2 inline-block">How Bidding Works</p>
        <ArrowUpRightFromSquare className="inline-block" size={20} />
      </ResponsiveDialog.Trigger>
      <ResponsiveDialog.Content className="max-w-2/3 max-h-[90%] w-2/3 overflow-y-auto">
        <ResponsiveDialog.Header>
          <ResponsiveDialog.Title>Bidding - How It Works</ResponsiveDialog.Title>
          <div className="text-white">
            <p className="my-2">
              You can bid on Films to add them to your Studio. Start by going to the Films tab, then select the film you
              want. Choose which slot you want it to fill in your Studio and how much you are willing to bid on it. You
              can bid anywhere from $0 to the total remaining in your $ budget.
            </p>
            <p className="my-2">
              Bids are auto-processed every Tuesday at 12pm ET. League owners can manually process bids at any time.
            </p>
            <p className="my-2">
              If multiple Studios bid on the same film, then the Studio who bids the highest amount will win. The amount
              they bid will be removed from their $ budget and the Film will be added into the slot they selected when
              placing the bid. If there was a Film in that slot at the time the bid was processed, that Film will be
              dropped and available for other Studios to bid on.
            </p>
            <p className="my-2">
              If multiple Studios bid the same amount on the same film, whoever placed the bid first will win the
              tiebreak.
            </p>
            <p className="my-2">
              If you bid on multiple Films for the same slot in your Studio, your bids are prioritized by the amount you
              bid. For example, if you bid $10 on Film A in your first slot and $5 on a Film B in that same slot, your
              $10 bid will be processed first. If that bid is successful your $5 bid is then ignored. If your $10 bid is
              unsuccessful then the $5 bid will be processed to attempt to fill that slot.
            </p>
          </div>
        </ResponsiveDialog.Header>
      </ResponsiveDialog.Content>
    </ResponsiveDialog>
  );
}
