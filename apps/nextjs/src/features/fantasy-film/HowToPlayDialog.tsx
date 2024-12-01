import { HelpCircle, Info } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

export default function HowToPlayDialog({ className }: { className?: string }) {
  return (
    <Dialog>
      <DialogTrigger className={className}>
        <Info className="mr-1" /> How To Play
      </DialogTrigger>
      <DialogContent className="max-w-2/3 max-h-[90%] w-2/3 overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Fantasy Film - How To Play</DialogTitle>
          <div className="flex flex-col gap-y-4 text-white">
            <p>
              Fantasy Film is like Fantasy Football but instead of managing a Team of Players you manage a Studio with a
              slate of upcoming Films.
            </p>
            <p>
              Start by creating a Fantasy Film League and adding your friends, or by accepting an invite to a League
              that your friend has created. Then the League Owner needs to create a new Session (think of this like a
              season in Fantasy Football). When creating the Session you can set the start and end dates, as well as
              other settings like when & how your Draft will take place.
            </p>
            <p className="text-xs font-thin">Your League can only have 1 active session at a time.</p>
            <p>
              If you choose to conduct a draft, players will take turns selecting Films that will release during your
              Session and assigning them to a specific slot. The slot each Film is assigned to will determine how it is
              scored and will contribute to your overall points.
            </p>
            <p>
              Once the Session has started you can use your Fantasy $ Budget to bid on Films that haven't been acquired
              by a Studio yet. These bids will be processed once a week and the person who bids the most for the Film
              will add it to their Studio.
            </p>
            <p>
              One week prior to a Film's release date it will be locked in to your Studio meaning you can no longer drop
              the Film or change its slot. Once the Film is released it will earn you points that will contribute to
              your Studio's total.
            </p>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
