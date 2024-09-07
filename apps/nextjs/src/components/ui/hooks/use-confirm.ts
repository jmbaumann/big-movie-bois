import { useContext } from "react";

import { ConfirmationContext } from "../confirm";

export function useConfirm() {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error("useConfirm must be used within a Confirm");
  }
  return context.openConfirmation;
}
