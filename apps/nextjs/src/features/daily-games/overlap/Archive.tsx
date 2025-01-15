import { useRouter } from "next/router";
import { format } from "date-fns";
import { Calendar } from "lucide-react";

import { api } from "~/utils/api";
import { Button } from "~/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "~/components/ui/sheet";
import { ONE_DAY_IN_SECONDS } from "~/utils";

export default function Archive({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const router = useRouter();

  const { data: archive } = api.overlap.getArchive.useQuery(
    { date: format(new Date(), "yyyy-MM-dd") },
    { staleTime: ONE_DAY_IN_SECONDS },
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="px-2 py-2 text-white">
        <Calendar size={24} />
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[90%] bg-neutral-900 text-white" aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle className="text-lg font-semibold text-white">Archive</SheetTitle>

          <div className="flex flex-col">
            {/* <Button className="mx-auto mb-4 w-1/6">Random</Button> */}
            <div className="mx-auto grid w-full grid-cols-3 gap-2 text-white lg:w-2/3">
              {archive?.map((a, i) => (
                <Button
                  className="bg-primary mx-auto w-full rounded-full text-xl lg:w-2/3"
                  key={i}
                  onClick={() => {
                    router.push(`/daily-games/overlap?archive=${a.date}`);
                    setOpen(false);
                  }}
                >
                  {format(new Date(a.date + "T00:00:00"), "LLL dd")}
                </Button>
              ))}
            </div>
          </div>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}
