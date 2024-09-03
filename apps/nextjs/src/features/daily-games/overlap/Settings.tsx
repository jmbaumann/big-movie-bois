import { Info } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTrigger,
} from "~/components/ui/sheet";

// import { useLocalStore } from "@/utils/store";

export default function Settings({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  // const store = useLocalStore();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="px-2 py-2 text-white">
        <Info size={24} />
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[90%] bg-[#2d2d2d] text-white"
      >
        <SheetHeader>
          <SheetDescription className="text-white">
            <div className="flex flex-col">
              <div className="mt-2 text-lg font-semibold">How To Play</div>
              <div className="mb-2 text-sm">It&apos;s Rock Paper Scissors</div>

              {/* <div className="mt-6 text-lg font-semibold">More Games</div>
              <div className="mb-2 text-sm">
                <a href="https://consensu5.com" target="_blank">
                  <Consensu5Logo />
                </a>
              </div> */}

              <div className="mt-16 text-center text-xs">
                &copy; {new Date().getFullYear()}
                {"   "}&bull;{"   "}
                <a href="https://twitter.com/jeremy_baumann">
                  jeremy made this :)
                </a>
              </div>
            </div>
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}
