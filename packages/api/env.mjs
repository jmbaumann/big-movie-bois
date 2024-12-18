import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    WEBSOCKET_SERVER: z.string(),
    WEBSOCKET_TOKEN: z.string(),
  },
  client: {},
  runtimeEnv: {
    WEBSOCKET_SERVER: process.env.WEBSOCKET_SERVER,
    WEBSOCKET_TOKEN: process.env.WEBSOCKET_TOKEN,
  },
  skipValidation: !!process.env.CI || !!process.env.SKIP_ENV_VALIDATION,
});
