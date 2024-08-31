import type { AppRouter } from "@repo/api";
import {
  createWSClient,
  httpBatchLink,
  loggerLink,
  wsLink,
} from "@trpc/client";
import { createTRPCNext } from "@trpc/next";
import superjson from "superjson";

const getBaseUrl = () => {
  if (typeof window !== "undefined") return ""; // browser should use relative url
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; // SSR should use vercel url

  return `http://localhost:3000`; // dev SSR should use localhost
};
const url = `${getBaseUrl()}/api/trpc`;

function getEndingLink() {
  if (typeof window === "undefined") {
    return httpBatchLink({
      url,
    });
  }

  // create persistent WebSocket connection
  const client = createWSClient({
    url: process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001",
  });
  return wsLink({
    client,
  });
}

export const api = createTRPCNext<AppRouter>({
  config() {
    return {
      transformer: superjson,
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === "development" ||
            (opts.direction === "down" && opts.result instanceof Error),
        }),
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
        }),
        // getEndingLink(),
      ],
    };
  },
  ssr: false,
});

export { type RouterInputs, type RouterOutputs } from "@repo/api";
