import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { signIn, signOut, useSession } from "next-auth/react";

import { cn } from "~/utils/shadcn";

export default function TopBar() {
  const { data: sessionData } = useSession();
  const router = useRouter();

  const links = [
    { href: "/fantasy-film", label: "Fantasy Film" },
    { href: "/daily-games", label: "Daily Games" },
    // { href: '/forums', label: 'Forums'},
    // { href: '/podcast', label: 'Podcast'},
    // { href: '/support', label: 'Suppport'},
  ];

  return (
    <header className="flex h-[72px] items-center justify-around bg-neutral-900 font-sans">
      <div className="flex w-full items-center lg:w-[80%]">
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
                router.pathname.startsWith(link.href)
                  ? "border-primary border-b-2"
                  : "",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <nav className="ml-auto flex">
          <button
            className="bg-primary mx-2 rounded-3xl px-4 py-2 uppercase text-white no-underline lg:ml-3"
            onClick={sessionData ? () => void signOut() : () => void signIn()}
          >
            {sessionData ? sessionData.user?.name : "Sign in"}
          </button>
        </nav>
      </div>
    </header>
  );
}
