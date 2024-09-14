import axios from "axios";

import { env } from "../env.mjs";

export async function socket<T>(eventName: string, eventData: T) {
  const url = "http://localhost:8080";

  try {
    await axios.post(`${url}/trigger-event`, {
      eventName,
      eventData,
    });
  } catch (e) {
    console.log(e);
  }
}
