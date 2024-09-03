import { useEffect, useState } from "react";
import { format } from "date-fns";

// import { useLocalStore } from "@/utils/store";

export default function Countdown() {
  // const store = useLocalStore();
  const [timer, setTimer] = useState("");

  const updateTimer = () => {
    const midnight = new Date();
    midnight.setHours(24);
    midnight.setMinutes(0);
    midnight.setSeconds(0);
    midnight.setMilliseconds(0);
    const distance = (midnight.getTime() - new Date().getTime()) / 1000; // in seconds
    const hours = Math.floor(distance / 60 / 60);
    const minutes = Math.floor((distance / 60) % 60);
    const seconds = Math.floor(distance % 60);
    setTimer(
      hours >= 1
        ? hours + "h " + minutes + "m " + seconds + "s"
        : (minutes >= 1 ? minutes + "m " : "") + seconds + "s",
    );
  };

  useEffect(() => {
    updateTimer();
    const interval = setInterval(() => {
      updateTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const refreshReady = false;
  // store.game.timestamps.lastPlayed &&
  // format(new Date(store.game.timestamps.lastPlayed), "yyyy-MM-dd") !==
  //   format(new Date(), "yyyy-MM-dd");

  return (
    <div className="mt-6 flex flex-row items-center justify-center text-2xl text-white">
      <div className="flex flex-col text-center tabular-nums">
        {refreshReady ? null : <div className="text-xs">New Game In</div>}
        {!refreshReady ? timer : "Refresh the page for a new game"}
      </div>
    </div>
  );
}
