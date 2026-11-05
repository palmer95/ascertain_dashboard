import { Fragment } from 'react'
import { Link, useMatches } from 'react-router'

import { getCrumb } from '@/app/route-handle'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

import { ThemeMenu } from './ThemeMenu'

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      {/* Opens the drawer on mobile; collapses the sidebar on desktop (also Ctrl/⌘+B). */}
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 data-vertical:h-4 data-vertical:self-center"
      />
      <AppBreadcrumbs />
      <div className="ml-auto">
        <ThemeMenu />
      </div>
    </header>
  )
}

/** Built from each matched route's `handle.crumb`, so it stays in sync with the router. */
function AppBreadcrumbs() {
  const crumbs = useMatches().flatMap((match) => {
    const label = getCrumb(match.handle)
    return label ? [{ id: match.id, label, to: match.pathname }] : []
  })

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isCurrentPage = index === crumbs.length - 1
          return (
            <Fragment key={crumb.id}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isCurrentPage ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link to={crumb.to} />}>{crumb.label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
