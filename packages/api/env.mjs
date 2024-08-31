import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    PUSHER_APP_ID: z.string(),
    PUSHER_SECRET: z.string(),
    ACCESS_PASSWORD: z.string(),
  },
  client: {
    NEXT_PUBLIC_WEBSOCKET_SERVER: z.string(),
    NEXT_PUBLIC_PUSHER_KEY: z.string(),
    NEXT_PUBLIC_PUSHER_CLUSTER: z.string(),
  },
  runtimeEnv: {
    PUSHER_APP_ID: process.env.PUSHER_APP_ID,
    PUSHER_SECRET: process.env.PUSHER_SECRET,
    ACCESS_PASSWORD: process.env.ACCESS_PASSWORD,
    NEXT_PUBLIC_WEBSOCKET_SERVER: process.env.NEXT_PUBLIC_WEBSOCKET_SERVER,
    NEXT_PUBLIC_PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY,
    NEXT_PUBLIC_PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  },
  skipValidation: !!process.env.CI || !!process.env.SKIP_ENV_VALIDATION,
});
