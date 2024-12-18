import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    BMB_URL: z.string().url(),
    WEBSOCKET_TOKEN: z.string(),
  },
  runtimeEnv: {
    BMB_URL: process.env.BMB_URL,
    WEBSOCKET_TOKEN: process.env.WEBSOCKET_TOKEN,
  },
  skipValidation: !!process.env.CI || !!process.env.SKIP_ENV_VALIDATION,
});
