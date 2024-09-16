import axios from "axios";

import { env } from "../env.mjs";

export async function socketEvent<T>(eventName: string, eventData: T) {
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

export async function draftEvent<T>(eventName: string, eventData: T) {
  const url = "http://localhost:8080";

  try {
    await axios.post(`${url}/draft-event`, {
      eventName,
      eventData,
    });
  } catch (e) {
    console.log(e);
  }
}
