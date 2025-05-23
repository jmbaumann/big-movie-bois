import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { Menu } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";

import useBreakpoint from "~/utils/hooks/use-breakpoint";
import { cn } from "~/utils/shadcn";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "~/components/ui/sheet";
import HowToPlayDialog from "~/features/fantasy-film/HowToPlayDialog";
import Footer from "./Footer";

const links = [
  { href: "/fantasy-film", label: "Fantasy Film" },
  { href: "/daily-games", label: "Daily Games" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/pick-em", label: "Award Show Pick 'Em" },
  // { href: '/forums', label: 'Forums'},
  // { href: '/podcast', label: 'Podcast'},
  // { href: '/support', label: 'Suppport'},
];

export default function TopBar() {
  const { data: sessionData } = useSession();
  const router = useRouter();
  const breakpoint = useBreakpoint();

  const onFF = router.pathname.split("/")[1] === "fantasy-film";

  return (
    <header className="flex h-[72px] items-center justify-around bg-neutral-900 font-sans">
      <div className="flex w-full items-center lg:w-[90%]">
        <MobileMenu>
          <Menu className="ml-2 block lg:hidden" />
        </MobileMenu>
        <Link href={"/"} className="mx-3 uppercase hover:text-white">
          <span className="text-3xl font-bold text-white">BMB</span>
        </Link>

        <nav className="ml-4 hidden lg:flex">
          {links.map((link, i) => (
            <Link
              key={i}
              href={link.href}
              className={cn(
                "hover:text-primary mx-3 uppercase",
                router.pathname.startsWith(link.href) ? "border-primary border-b-2" : "",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <nav className="mx-2 ml-auto flex items-center">
          {onFF && <HowToPlayDialog className="flex" />}

          {!sessionData?.user ? (
            <Button className="mx-2" onClick={() => signIn()}>
              Sign In
            </Button>
          ) : (
            sessionData.user.username && (
              <DropdownMenu>
                <DropdownMenuTrigger className="bg-primary mx-2 rounded-3xl px-4 py-2 uppercase text-white no-underline lg:ml-3">
                  {sessionData.user.username}
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => signOut()}>Sign Out</DropdownMenuItem>
                  {sessionData.user.isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push("/admin")}>Admin</DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )
          )}
        </nav>
      </div>
    </header>
  );
}

function MobileMenu({ children, className }: { children: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className={className}>{children}</SheetTrigger>
      <SheetContent className="m-0 w-2/3 p-0 pt-8 lg:w-1/2" hideClose side="left">
        <SheetHeader className="h-full">
          <SheetTitle className="mb-4">
            <Link href={"/"}>Big Movie Bois</Link>
          </SheetTitle>
          <SheetDescription className="flex h-full flex-col justify-between">
            <div className="flex flex-col gap-y-4">
              {links.map((link, i) => (
                <Link
                  key={i}
                  href={link.href}
                  className={cn("mx-auto w-max uppercase", router.pathname.startsWith(link.href) ? "text-primary" : "")}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <Footer showMobile />
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}
