import { createContext, ReactNode, useContext, useRef, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

type ConfirmationContextType = {
  openConfirmation: (
    text: string,
    options?: {
      affirmitiveText: string;
      negativeText: string;
      description: string;
    },
  ) => Promise<boolean>;
};

export const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [labels, setLabels] = useState({
    text: "",
    affirmitiveText: "Yes",
    negativeText: "No",
    description: "",
  });

  const resolvePromiseRef = useRef<(value: boolean) => void>();

  function openConfirmation(
    text: string,
    options?: {
      affirmitiveText: string;
      negativeText: string;
      description: string;
    },
  ): Promise<boolean> {
    setLabels((s) => ({
      text,
      affirmitiveText: options?.affirmitiveText ?? s.affirmitiveText,
      negativeText: options?.negativeText ?? s.negativeText,
      description: options?.description ?? s.description,
    }));
    setOpen(true);

    return new Promise((resolve) => {
      resolvePromiseRef.current = resolve;
    });
  }

  function handleConfirm() {
    setOpen(false);
    if (resolvePromiseRef.current) resolvePromiseRef.current(true);
  }

  function handleCancel() {
    setOpen(false);
    if (resolvePromiseRef.current) resolvePromiseRef.current(false);
  }

  const contextValue = { openConfirmation };

  return (
    <ConfirmationContext.Provider value={contextValue}>
      {children}

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent aria-describedby={undefined}>
          <AlertDialogHeader>
            <AlertDialogTitle>{labels.text}</AlertDialogTitle>
            {/* {labels.description && ( */}
            <AlertDialogDescription aria-describedby={undefined}>{labels.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleCancel()}>{labels.negativeText}</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleConfirm()}>{labels.affirmitiveText}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmationContext.Provider>
  );
}
