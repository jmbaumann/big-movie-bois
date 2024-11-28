import { Info } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "~/components/ui/sheet";

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
      <SheetContent side="bottom" className="max-h-[90%] bg-neutral-900 text-white" aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle className="text-lg font-semibold text-white">How To Play</SheetTitle>

          <div className="flex flex-col text-white">
            <p className="mb-2 text-sm">Guess a movie to reveal the details that it shares with the answer.</p>
            <p className="mb-2 text-sm">
              With each movie you guess, more details about the answer movie will be revealed based on the details,
              cast, or crew members that the movies share. For example, if the movie you guessed and the answer are both
              Comedies then that Genre will be revealed.
            </p>
            <p className="mb-2 text-sm">
              Some details will provide hints to help narrow down your guesses. For example, if you guess a movie that
              starts with the letter <strong>M</strong> but the answer starts with the letter <strong>T</strong> then
              you will see <strong>M &lt;</strong> to let you know the title starts with a letter than comes after{" "}
              <strong>M</strong>.
            </p>
            <p className="mb-2 text-sm">
              Once you guess the answer movie the remaining details will be revealed along with the poster.
            </p>

            <p className="text-xs">
              Film data from{" "}
              <a href="https://www.themoviedb.org/" target="_blank" className="underline" rel="noreferrer">
                TMDb
              </a>
            </p>
          </div>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}
