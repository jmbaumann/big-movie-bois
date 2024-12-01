import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { CalendarDays, Home, Shield, User } from "lucide-react";

import { cn } from "~/utils/shadcn";
import { Button } from "~/components/ui/button";
import FilmDataAdmin from "./fantasy-film/FilmData";
import MasterListAdmin from "./fantasy-film/MasterList";
import OpeningWeekendAdmin from "./fantasy-film/OpeningWeekend";
import PublicSessionsAdmin from "./fantasy-film/PublicSessions";
import OverlapAdmin from "./OverlapAdmin";
import PollsAdmin from "./PollsAdmin";
import UsersAdmin from "./UsersAdmin";

export default function AdminDashboard() {
  const router = useRouter();

  const tabs = [
    { icon: <Home />, value: "home" },
    { icon: <User />, value: "users" },
    { icon: <Shield />, value: "fantasy" },
    { icon: <CalendarDays />, value: "dailys" },
  ];

  const subMenu = {
    home: [
      { label: "Analytics", value: "analytics", component: <Analytics /> },
      { label: "Alerts", value: "alerts", component: <Alerts /> },
      { label: "Polls", value: "polls", component: <PollsAdmin /> },
    ],
    users: [
      { label: "Users", value: "users", component: <UsersAdmin /> },
      { label: "Supporters", value: "supporters", component: <Supporters /> },
    ],
    fantasy: [
      { label: "Master List", value: "master-list", component: <MasterListAdmin /> },
      { label: "Active Films", value: "active-films", component: <FilmDataAdmin /> },
      { label: "Opening Weekend", value: "opening-weekend", component: <OpeningWeekendAdmin /> },
      { label: "Public Sessions", value: "public-sessions", component: <PublicSessionsAdmin /> },
    ],
    dailys: [{ label: "Overlap", value: "overlap", component: <OverlapAdmin /> }],
  };

  const [activeTab, setActiveTab] = useState((router.query.tab as string) || "home");
  const [activeSubMenu, setActiveSubMenu] = useState((router.query.menu as string) || "analytics");

  useEffect(() => {
    const urlTab = router.query.tab as string;
    const urlMenu = router.query.menu as string;

    const validSubMenu = !!subMenu[activeTab as keyof typeof subMenu]?.find((e) => e.value === activeSubMenu);
    const sm = validSubMenu ? activeSubMenu : subMenu[activeTab as keyof typeof subMenu][0]!.value;

    if (!validSubMenu) setActiveSubMenu(sm);

    if (activeTab !== urlTab || !validSubMenu || urlMenu !== sm) {
      void router.replace(
        {
          query: { tab: activeTab, menu: sm },
        },
        undefined,
        { shallow: true },
      );
    }
  }, [router.query, activeTab, activeSubMenu]);

  return (
    <div className="flex gap-x-2 px-2">
      <div className="flex flex-col gap-y-2">
        {tabs.map((tab, i) => (
          <Button
            key={i}
            className={cn("rounded-md hover:text-white", activeTab === tab.value ? "bg-primary text-white" : "")}
            size="icon"
            variant="ghost"
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.icon}
          </Button>
        ))}
      </div>
      {subMenu[activeTab as keyof typeof subMenu] && (
        <div className="flex w-[140px] flex-col">
          {subMenu[activeTab as keyof typeof subMenu].map((menu, i) => (
            <Button
              key={i}
              className={cn("rounded-md hover:text-white", activeSubMenu === menu.value ? "bg-primary text-white" : "")}
              variant="ghost"
              onClick={() => setActiveSubMenu(menu.value)}
            >
              {menu.label}
            </Button>
          ))}
        </div>
      )}
      <div className="flex max-h-[calc(100vh-70px)] grow flex-col overflow-y-scroll px-4">
        {subMenu[activeTab as keyof typeof subMenu].find((e) => e.value === activeSubMenu)?.component}
      </div>
    </div>
  );
}

function Analytics() {
  return <p>Analytics</p>;
}

function Alerts() {
  return <p>Alerts</p>;
}

function Polls() {
  return <p>Polls</p>;
}

function Users() {
  return <p>Users</p>;
}

function Supporters() {
  return <p>Supporters</p>;
}
