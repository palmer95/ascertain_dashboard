import { Monitor, Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { setTheme, THEMES, useTheme } from '@/lib/theme'

const OPTIONS = {
  light: { label: 'Light', icon: Sun },
  dark: { label: 'Dark', icon: Moon },
  system: { label: 'System', icon: Monitor },
} as const

export function ThemeMenu() {
  const theme = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={`Theme: ${OPTIONS[theme].label}`} />
        }
      >
        {/* Shows the theme in effect, so "System" reads as sun or moon. */}
        <Sun aria-hidden className="dark:hidden" />
        <Moon aria-hidden className="hidden dark:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={theme}
            onValueChange={(next) => {
              const choice = THEMES.find((option) => option === next)
              if (choice) setTheme(choice)
            }}
          >
            {THEMES.map((option) => {
              const { label, icon: Icon } = OPTIONS[option]
              return (
                <DropdownMenuRadioItem key={option} value={option}>
                  <Icon aria-hidden />
                  {label}
                </DropdownMenuRadioItem>
              )
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
