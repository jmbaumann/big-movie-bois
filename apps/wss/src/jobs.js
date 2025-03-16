import axios from "axios";

import { env } from "./env.mjs";

export async function updateFilmList() {
  try {
    // const url = "http://localhost:3000";
    const url = "https://bigmoviebois.com";
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.WEBSOCKET_TOKEN}`,
    };

    await axios.post(`${url}/api/update-films`, {}, { headers });
  } catch (e) {
    console.log("Cron error: ", e);
  }
}

export async function processBids() {
  try {
    // const url = "http://localhost:3000";
    const url = "https://bigmoviebois.com";
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.WEBSOCKET_TOKEN}`,
    };

    await axios.post(`${url}/api/process-bids`, {}, { headers });
  } catch (e) {
    console.log("Cron error: ", e);
  }
}
