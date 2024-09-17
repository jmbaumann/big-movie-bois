import { ReactNode } from "react";
import { ShieldEllipsis } from "lucide-react";

import { cn } from "~/utils/shadcn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "./ui/button";

export default function AdminMenu({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center rounded-lg hover:text-white",
          className,
        )}
      >
        <ShieldEllipsis className="mr-1" /> Admin Menu
      </DropdownMenuTrigger>
      {children}
    </DropdownMenu>
  );
}
