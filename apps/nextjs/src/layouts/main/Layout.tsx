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
    <div className="flex min-h-screen w-full flex-col bg-neutral-900 text-[#9ab]">
      <SEO />
      <TopBar />

      <main className="flex-grow">
        <div
          className={cn(
            "mx-auto mb-12 mt-2 flex w-[80%] flex-col lg:mt-8",
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
