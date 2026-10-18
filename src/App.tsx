import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { AppShell } from '@/features/layout/AppShell'
import { DashboardPage } from '@/features/apps/DashboardPage'
import { AppDetailPage } from '@/features/apps/AppDetailPage'
import { ConnectAppPage } from '@/features/apps/ConnectAppPage'
import { ClientsPage } from '@/features/clients/ClientsPage'
import { PaymentsPage } from '@/features/payments/PaymentsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <HashRouter>
            <Routes>
              <Route element={<RequireAuth />}>
                <Route element={<AppShell />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="apps/:appId" element={<AppDetailPage />} />
                  <Route path="conectar" element={<ConnectAppPage />} />
                  <Route path="clientes" element={<ClientsPage />} />
                  <Route path="pagos" element={<PaymentsPage />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
          <Toaster richColors closeButton position="top-center" />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
