import axios from "axios";

import { env } from "../env.mjs";

export async function socketEvent<T>(eventName: string, eventData: T) {
  const url = env.WEBSOCKET_SERVER;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${env.WEBSOCKET_TOKEN}`,
  };

  try {
    axios.post(
      `${url}/ws`,
      {
        eventName,
        eventData,
      },
      { headers },
    );
  } catch (e) {
    console.log(e);
  }

  return { done: true };
}

export async function draftEvent<T>(eventName: string, eventData: T) {
  const url = env.WEBSOCKET_SERVER;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${env.WEBSOCKET_TOKEN}`,
  };

  try {
    const r = await axios.post(
      `${url}/draft`,
      {
        eventName,
        eventData,
      },
      { headers },
    );
    console.log(r);
  } catch (e) {
    console.log(e);
  }

  return { done: true };
}
