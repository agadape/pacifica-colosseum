"use client";

import dynamic from "next/dynamic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

const PrivyProviderWrapper = dynamic(
  () => import("@/components/shared/PrivyWrapper"),
  { ssr: false }
);

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <PrivyProviderWrapper>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </PrivyProviderWrapper>
  );
}
