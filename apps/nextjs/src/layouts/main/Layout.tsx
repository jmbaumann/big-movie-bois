import { cn } from "~/utils/shadcn";
import Footer from "./Footer";
import SEO from "./SEO";
import TopBar from "./TopBar";

function Layout({
  children,
  title,
  fullWidth,
  showFooter,
}: {
  children: React.ReactNode;
  title?: string;
  fullWidth?: boolean;
  showFooter?: boolean;
}) {
  return (
    <div className="min-w-screen flex min-h-screen flex-col bg-neutral-900 text-[#9ab]">
      <SEO title={title} />
      <TopBar />

      <main className="flex-grow">
        <div className={cn("mx-auto flex flex-col px-2 lg:w-[80%]", fullWidth ? "mb-0 mt-0 lg:mt-0 lg:w-full" : "")}>
          {children}
        </div>
      </main>

      {showFooter ? <Footer /> : null}
    </div>
  );
}

export default Layout;
