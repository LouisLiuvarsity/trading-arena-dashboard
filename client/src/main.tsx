import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry auth errors
        if (error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG) return false;
        // Retry up to 2 times for gateway/network errors
        if (failureCount < 2) {
          const msg = error?.message ?? '';
          if (msg.includes('not valid JSON') || msg.includes('502') || msg.includes('503') || msg.includes('Failed to fetch')) {
            return true;
          }
        }
        return false;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    },
    mutations: {
      retry: (failureCount, error) => {
        if (error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG) return false;
        // Retry gateway errors once for mutations
        if (failureCount < 1) {
          const msg = error?.message ?? '';
          if (msg.includes('not valid JSON') || msg.includes('502') || msg.includes('503') || msg.includes('Failed to fetch')) {
            return true;
          }
        }
        return false;
      },
      retryDelay: 1000,
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

/** Fetch wrapper with automatic retry for 502/503 gateway errors */
async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await globalThis.fetch(input, {
      ...(init ?? {}),
      credentials: "include",
    });
    // Retry on 502/503 gateway errors
    if ((response.status === 502 || response.status === 503) && attempt < maxRetries) {
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }
    return response;
  }
  // Should never reach here, but just in case
  return globalThis.fetch(input, { ...(init ?? {}), credentials: "include" });
}

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch: fetchWithRetry,
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
