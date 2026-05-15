import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  Link,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopHeader } from "@/components/layout/TopHeader";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="text-center">
        <div className="text-6xl font-bold neon-text">404</div>
        <p className="mt-2 text-muted-foreground">Sector not found in this grid.</p>
        <Link to="/" className="inline-block mt-4 px-4 py-2 rounded-md bg-cyan/15 border border-cyan/40 text-cyan">
          Return to SOC
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="glass neon-border rounded-xl p-6 max-w-md text-center">
        <div className="text-threat font-mono text-sm mb-2">SYSTEM FAULT</div>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-4 px-4 py-2 rounded-md bg-cyan/15 border border-cyan/40 text-cyan"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Sentinel.AI · SOC Threat Intelligence" },
      { name: "description", content: "AI-powered Cyber Threat Intelligence SOC dashboard with real-time threat, anomaly, and behavioral analysis." },
      { property: "og:title", content: "Sentinel.AI · SOC Threat Intelligence" },
      { property: "og:description", content: "Futuristic AI SOC dashboard for unified threat detection." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopHeader />
          <main className="flex-1 overflow-y-auto scrollbar-thin p-4 md:p-6 relative z-[1]">
            <Outlet />
          </main>
        </div>
      </div>
      <Toaster theme="dark" position="top-right" toastOptions={{ className: "glass border border-cyan/30" }} />
    </QueryClientProvider>
  );
}
