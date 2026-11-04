import { Outlet, ScrollRestoration } from 'react-router'

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'

/**
 * App shell: sidebar navigation (a drawer below the `md` breakpoint), a sticky header, and
 * the routed page. `SidebarInset` renders the `<main>` landmark.
 */
export function AppLayout() {
  return (
    <SidebarProvider>
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-background text-sm font-medium shadow focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        {/* min-w-0 lets wide content (tables) scroll inside the page instead of the body. */}
        <div
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl min-w-0 flex-1 p-4 outline-none md:p-6"
        >
          <Outlet />
        </div>
      </SidebarInset>
      {/* New pages (incl. list page changes) start at the top; Back restores the old position. */}
      <ScrollRestoration />
    </SidebarProvider>
  )
}
