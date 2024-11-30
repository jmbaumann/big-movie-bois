import axios from "axios";

import { env } from "../env.mjs";

export async function socketEvent<T>(eventName: string, eventData: T) {
  const url = env.WEBSOCKET_SERVER;

  try {
    axios.post(`${url}/ws`, {
      eventName,
      eventData,
    });
  } catch (e) {
    console.log(e);
  }

  return { done: true };
}

export async function draftEvent<T>(eventName: string, eventData: T) {
  const url = env.WEBSOCKET_SERVER;

  try {
    axios.post(`${url}/draft`, {
      eventName,
      eventData,
    });
  } catch (e) {
    console.log(e);
  }

  return { done: true };
}
