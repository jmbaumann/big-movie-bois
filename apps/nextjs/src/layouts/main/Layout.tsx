import { cn } from "~/utils/shadcn";
import Footer from "./Footer";
import SEO from "./SEO";
import TopBar from "./TopBar";

function Layout({
  children,
  fullWidth,
  showFooter,
}: {
  children: React.ReactNode;
  fullWidth?: boolean;
  showFooter?: boolean;
}) {
  return (
    <div className="min-w-screen flex min-h-screen flex-col bg-neutral-900 text-[#9ab]">
      <SEO />
      <TopBar />

      <main className="flex-grow">
        <div
          className={cn(
            "mx-auto flex flex-col px-2 lg:w-[80%]",
            fullWidth ? "mb-0 mt-0 w-full lg:mt-0" : "",
          )}
        >
          {children}
        </div>
      </main>

      {showFooter ? <Footer /> : null}
    </div>
  );
}

export default Layout;
