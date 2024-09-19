import { useEffect, useState } from "react";
import { CalendarDays, Home, Shield, User } from "lucide-react";

import { cn } from "~/utils/shadcn";
import { Button } from "~/components/ui/button";

export default function AdminDashboard() {
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
      { label: "Polls", value: "polls", component: <Polls /> },
    ],
    users: [
      { label: "Users", value: "users", component: <Users /> },
      { label: "Supporters", value: "supporters", component: <Supporters /> },
    ],
    fantasy: [
      { label: "Film Data", value: "film-data", component: <FilmData /> },
      { label: "Public Sessions", value: "public-sessions", component: <PublicSessions /> },
    ],
    dailys: [{ label: "Overlap", value: "overlap", component: <Overlap /> }],
  };

  const [activeTab, setActiveTab] = useState("home");
  const [activeSubMenu, setActiveSubMenu] = useState("analytics");

  useEffect(() => {
    setActiveSubMenu(subMenu[activeTab as keyof typeof subMenu][0]?.value ?? "");
  }, [activeTab]);

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
      <div className="flex flex-col">
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

function FilmData() {
  return <p>FilmData</p>;
}

function PublicSessions() {
  return <p>PublicSessions</p>;
}

function Overlap() {
  return <p>Overlap</p>;
}
