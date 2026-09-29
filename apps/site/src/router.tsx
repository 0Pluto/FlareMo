import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
} from "@tanstack/react-router";
import { RootLayout } from "@/components/root-layout";
import { getDoc } from "@/lib/docs-source.generated";
import { DocsIndexPage } from "@/pages/docs-index-page";
import { HomePage } from "@/pages/home-page";
import { NotFoundPage } from "@/pages/not-found-page";

const DocsDetailPage = lazyRouteComponent(
  () => import("@/pages/docs-detail-page"),
  "DocsDetailPage",
);

export type History = ReturnType<typeof createRouter>["history"];

/**
 * Code-based route tree, mirroring the shape of apps/web/src/App.tsx so the
 * marketing site stays on the exact same TanStack Router stack as the product.
 */
export function buildRouteTree() {
  const rootRoute = createRootRoute({
    component: RootLayout,
  });

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: HomePage,
  });

  const docsIndexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/docs",
    component: DocsIndexPage,
  });

  const docsSlugRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/docs/$slug",
    component: DocsDetailPage,
    loader: ({ params }) =>
      getDoc(params.slug, "en-US").then((doc) => ({ doc })),
  });

  const notFoundRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "*",
    component: NotFoundPage,
  });

  const locales = ["en", "zh", "ja", "fr", "es", "ko", "ru", "ar"] as const;
  const localeRoutes = locales.flatMap((locale) => [
    createRoute({
      getParentRoute: () => rootRoute,
      path: `/${locale}`,
      component: HomePage,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: `/${locale}/docs`,
      component: DocsIndexPage,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: `/${locale}/docs/$slug`,
      component: DocsDetailPage,
      loader: ({ params }) =>
        getDoc(params.slug, locale === "zh" ? "zh-CN" : "en-US").then(
          (doc) => ({ doc }),
        ),
    }),
  ]);

  const routeTree = rootRoute.addChildren([
    indexRoute,
    docsIndexRoute,
    docsSlugRoute,
    ...localeRoutes,
    notFoundRoute,
  ]);

  return { rootRoute, routeTree };
}

export function createAppRouter(opts?: {
  history?: ReturnType<typeof createRouter>["history"];
}) {
  const { routeTree } = buildRouteTree();
  return createRouter({
    routeTree,
    history: opts?.history,
    scrollRestoration: true,
    defaultPreload: "intent",
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
