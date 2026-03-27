"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { privyConfig } from "@/lib/privy/config";

export default function PrivyWrapper({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider appId={appId} config={privyConfig}>
      {children}
    </PrivyProvider>
  );
}
