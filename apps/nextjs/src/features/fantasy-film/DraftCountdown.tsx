import { useEffect, useState } from "react";
import { format } from "date-fns";

export default function DraftCountdown({ draftDate }: { draftDate: Date }) {
  const [timer, setTimer] = useState("");

  const pastDate = new Date().getTime() > draftDate.getTime();

  const updateTimer = () => {
    if (draftDate) {
      // draftDate.setHours(24);
      const distance = (draftDate.getTime() - new Date().getTime()) / 1000; // in seconds
      const days = Math.floor(distance / 86400);
      const hours = Math.floor((distance / 60 / 60) % 24);
      const minutes = Math.floor((distance / 60) % 60);
      const seconds = Math.floor(distance % 60);
      setTimer(
        `${days >= 1 ? days + "d " : ""} ${hours >= 1 ? hours + "h " : ""}
       ${minutes}m ${seconds}s`,
      );
    }
  };

  useEffect(() => {
    updateTimer();
    const interval = setInterval(() => {
      updateTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mt-4 flex flex-row items-center justify-center text-2xl text-white">
      <div className="flex flex-col text-center tabular-nums">
        <div className="text-sm">Draft Scheduled for {format(draftDate, "PPP @ p")}</div>
        {!pastDate && <span className="font-sans">{timer}</span>}
      </div>
    </div>
  );
}
