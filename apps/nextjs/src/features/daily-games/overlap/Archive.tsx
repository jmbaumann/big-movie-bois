import { useRouter } from "next/router";
import { Calendar } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";

export default function Archive({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const router = useRouter();

  const dates = [
    "Sep 10",
    "Sep 9",
    "Sep 8",
    "Sep 7",
    "Sep 6",
    "Sep 5",
    "Sep 4",
    "Sep 3",
    "Sep 2",
    "Sep 1",
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="px-2 py-2 text-white">
        <Calendar size={24} />
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[90%] bg-neutral-900 text-white"
        aria-describedby={undefined}
      >
        <SheetHeader>
          <SheetTitle className="text-lg font-semibold text-white">
            Archive
          </SheetTitle>

          <div className="flex flex-col">
            {/* <Button className="mx-auto mb-4 w-1/6">Random</Button> */}
            <div className="mx-auto grid w-full grid-cols-3 gap-2 text-white lg:w-2/3">
              {dates.map((date, i) => (
                <Button
                  className="bg-primary mx-auto w-full rounded-full text-xl lg:w-2/3"
                  key={i}
                  onClick={() => {
                    router.push(`/daily-games/overlap?archive=${date}`);
                    setOpen(false);
                  }}
                >
                  {date}
                </Button>
              ))}
            </div>
          </div>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}
