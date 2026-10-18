import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboardIcon, PlugIcon, ReceiptIcon, UsersIcon, LogOutIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/AuthProvider'
import { ThemeToggle } from './ThemeToggle'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboardIcon, end: true },
  { to: '/conectar', label: 'Conectar app', icon: PlugIcon },
  { to: '/clientes', label: 'Clientes', icon: UsersIcon },
  { to: '/pagos', label: 'Pagos', icon: ReceiptIcon },
]

export function AppShell() {
  const { user, signOut, isOwner, aal } = useAuth()

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-4 px-4 py-4 md:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Eon · Panel de Proveedor
          </p>
          <h1 className="font-heading text-xl md:text-2xl">Suscripciones</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden text-right text-xs text-muted-foreground sm:block">
            <div>{user?.email}</div>
            <div>
              {aal?.toUpperCase() ?? '—'} · {isOwner ? 'owner' : 'sin owner'}
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void signOut()}>
            <LogOutIcon data-icon="inline-start" />
            Salir
          </Button>
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto pb-1">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            <Icon className="size-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <main className="flex-1 pb-8">
        <Outlet />
      </main>
    </div>
  )
}
