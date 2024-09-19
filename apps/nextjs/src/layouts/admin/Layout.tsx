import TopBar from "./TopBar";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-w-screen flex min-h-screen flex-col bg-neutral-900 text-[#9ab]">
      <TopBar />

      <main className="flex-grow">
        <div className="mx-auto flex w-full flex-col px-2">{children}</div>
      </main>
    </div>
  );
}

export default Layout;
