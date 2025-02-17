import { useEffect, useState } from "react";
import { format } from "date-fns";

import { cn } from "~/utils/shadcn";

export default function Countdown({ classname, target }: { classname?: string; target: Date }) {
  const [timer, setTimer] = useState("");

  const updateTimer = () => {
    const distance = (target.getTime() - new Date().getTime()) / 1000; // in seconds
    const hours = Math.floor(distance / 60 / 60);
    const minutes = Math.floor((distance / 60) % 60);
    const seconds = Math.floor(distance % 60);
    setTimer(
      hours >= 1 ? hours + "h " + minutes + "m " + seconds + "s" : (minutes >= 1 ? minutes + "m " : "") + seconds + "s",
    );
  };

  useEffect(() => {
    updateTimer();
    const interval = setInterval(() => {
      updateTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return <div className={cn("flex flex-col text-center tabular-nums", classname)}>{timer}</div>;
}
