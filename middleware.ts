import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const session = request.cookies.get('session')
  const { pathname } = request.nextUrl

  let userShift = 1
  if (session) {
    try {
      const user = JSON.parse(session.value)
      userShift = user.shift
    } catch (e) {}
  }

  const dashboardPath = userShift === 1 ? '/dashboard-manha' : '/dashboard-noite'

  // Redireciona raiz e dashboard genérico
  if (pathname === '/' || pathname === '/dashboard') {
    if (session) {
      return NextResponse.redirect(new URL(dashboardPath, request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Protege rotas do dashboard, histórico e ranking
  const protectedPaths = ['/dashboard-manha', '/dashboard-noite', '/history', '/ranking', '/employees']
  if (protectedPaths.some(p => pathname.startsWith(p))) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Redireciona usuários logados para longe do login
  if (pathname === '/login') {
    if (session) {
      return NextResponse.redirect(new URL(dashboardPath, request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
