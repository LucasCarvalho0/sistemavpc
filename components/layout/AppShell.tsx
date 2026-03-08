'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, ClipboardList, Trophy, History,
  Users, Settings, Car, Menu, X, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import GoalAlert from '@/components/dashboard/GoalAlert'
import { Toaster } from '@/components/ui/toaster'
import AppProviders from './AppProviders'

const NAV = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/register', icon: ClipboardList, label: 'Registrar' },
  { path: '/ranking', icon: Trophy, label: 'Ranking Turno' },
  { path: '/history', icon: History, label: 'Histórico' },
  { path: '/employees', icon: Users, label: 'Funcionários' },
  { path: '/settings', icon: Settings, label: 'Config.' },
]

function Sidebar({ onNav }: { onNav?: () => void }) {
  const path = usePathname()
  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 lg:p-5 border-b border-border">
        <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center shrink-0">
          <Car className="w-5 h-5 text-slate-900" />
        </div>
        <div className="hidden lg:block">
          <p className="display font-extrabold text-lg leading-none text-white tracking-tight">AUTO</p>
          <p className="text-xs text-green-400 font-mono uppercase tracking-widest">Produção</p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-2 lg:p-3 space-y-0.5">
        {NAV.map(item => {
          const active = path === item.path
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={onNav}
              className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group',
                active
                  ? 'bg-green-500/15 text-green-400 border border-green-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/5',
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="hidden lg:block font-medium text-sm">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Status */}
      <div className="p-4 border-t border-border hidden lg:flex items-center gap-2">
        <Zap className="w-4 h-4 text-green-400" />
        <span className="text-xs text-slate-500">Sistema Online</span>
      </div>
    </>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const path = usePathname()
  const currentLabel = NAV.find(n => n.path === path)?.label ?? 'AutoProd'

  return (
    <AppProviders>
      <GoalAlert />
      <Toaster />

      <div className="flex h-screen bg-background overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-20 lg:w-64 bg-card border-r border-border shrink-0">
          <Sidebar />
        </aside>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <div className="absolute inset-0 bg-black/80" />
            <aside
              className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border flex flex-col animate-slide-in"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
                    <Car className="w-5 h-5 text-slate-900" />
                  </div>
                  <div>
                    <p className="display font-extrabold text-lg text-white">AUTO</p>
                    <p className="text-xs text-green-400 font-mono uppercase tracking-widest">Produção</p>
                  </div>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-2 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 p-4 space-y-1">
                {NAV.map(item => {
                  const active = path === item.path
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-4 rounded-xl transition-all text-base',
                        active
                          ? 'bg-green-500/15 text-green-400 border border-green-500/25'
                          : 'text-slate-400 hover:text-white hover:bg-white/5',
                      )}
                    >
                      <item.icon className="w-6 h-6" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  )
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile header */}
          <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-card border-b border-border shrink-0">
            <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 text-slate-400">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center">
                <Car className="w-4 h-4 text-slate-900" />
              </div>
              <span className="display font-bold text-white">{currentLabel}</span>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </AppProviders>
  )
}
