import Image from "next/image";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";

export default function TopBar() {
  const { data: sessionData } = useSession();

  return (
    <header className="flex h-[72px] items-center justify-around bg-neutral-900 font-sans">
      <div className="flex w-full items-center lg:w-[80%]">
        <Link href={"/"} className="mx-3 uppercase hover:text-white">
          <span className="text-3xl font-bold text-white">BMB</span>
        </Link>

        <nav className="ml-4 hidden lg:flex">
          <Link
            href={"/fantasy-film"}
            className="hover:text-primary mx-3 uppercase"
          >
            Fantasy Film
          </Link>
          <Link
            href={"/daily-games"}
            className="hover:text-primary mx-3 uppercase"
          >
            Daily Games
          </Link>
          {/* <Link href={"/forums"} className="mx-3 uppercase hover:text-primary">
            Forums
          </Link>
          <Link href={"/podcast"} className="mx-3 uppercase hover:text-primary">
            Podcast
          </Link>
          <Link href={"/support"} className="mx-3 uppercase hover:text-primary">
            Support
          </Link> */}
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
