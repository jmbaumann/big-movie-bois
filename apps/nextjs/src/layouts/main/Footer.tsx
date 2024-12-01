import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-6 flex h-[120px] w-full justify-center bg-neutral-700 pb-4">
      <div className="mt-6 flex w-full flex-col lg:w-[80%]">
        <nav className="flex font-bold">
          <Link href={"/"} className="mr-2 hover:text-white">
            About
          </Link>
          <Link href={"/contact"} className="mx-2 hover:text-white">
            Contact
          </Link>
          <Link href={"/"} className="mx-2 hover:text-white">
            Credits
          </Link>
          <Link href={"/"} className="mx-2 hover:text-white">
            Change Log
          </Link>
          <Link href={"/terms-of-service"} className="mx-2 hover:text-white">
            Terms of Service
          </Link>
          <Link href={"/privacy-policy"} className="mx-2 hover:text-white">
            Privacy Policy
          </Link>
        </nav>
        <p className="mt-4 text-xs">
          © 2024 Big Movie Bois
          <span className="mx-2">|</span>
          <a href="https://jeremybaumann.me" target="_blank">
            jeremy made this :)
          </a>
          <span className="mx-2">|</span>
          Film data from{" "}
          <a href="https://www.themoviedb.org/" target="_blank" className="underline" rel="noreferrer">
            TMDb
          </a>
        </p>
      </div>
    </footer>
  );
}
