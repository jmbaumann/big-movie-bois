import Link from "next/link";
import { useRouter } from "next/router";
import { signIn, signOut, useSession } from "next-auth/react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

export default function TopBar() {
  const { data: sessionData } = useSession();
  const router = useRouter();

  return (
    <header className="flex h-[72px] items-center justify-around bg-neutral-900 px-2 font-sans">
      <div className="flex w-full items-center">
        <Link href={"/"} className="mx-3 uppercase hover:text-white">
          <span className="text-3xl font-bold text-white">BMB</span>
        </Link>
        <span className="text-xl font-bold text-white">ADMIN DASHBOARD</span>

        <nav className="ml-auto flex">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="bg-primary mx-2 rounded-3xl px-4 py-2 uppercase text-white no-underline lg:ml-3"
              onClick={() => {
                if (!sessionData?.user) signIn();
              }}
            >
              {sessionData ? sessionData.user?.name : "Sign in"}
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => signOut()}>Sign Out</DropdownMenuItem>
              {sessionData?.user.isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/admin")}>Admin</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}
