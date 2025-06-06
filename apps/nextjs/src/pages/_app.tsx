import "../styles/globals.css";

import type { AppType } from "next/app";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

import { api } from "~/utils/api";
import { ConfirmProvider } from "~/components/ui/confirm";
import { Toaster } from "~/components/ui/toaster";

const MyApp: AppType<{ session: Session | null }> = ({ Component, pageProps: { session, ...pageProps } }) => {
  return (
    <SessionProvider session={session}>
      <ConfirmProvider>
        <Component {...pageProps} />
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </ConfirmProvider>
    </SessionProvider>
  );
};

export default api.withTRPC(MyApp);
