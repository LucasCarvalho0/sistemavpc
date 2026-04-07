import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { nowInBrazil } from '@/lib/shiftUtils'

export async function POST(req: Request) {
  try {
    let body
    try {
      body = await req.json()
    } catch (e) {
      console.error('FAIL_PARSE_BODY:', e)
      return NextResponse.json({ message: 'Corpo da requisição inválido' }, { status: 400 })
    }

    let { registration, password, confirmShiftEnd } = body
    
    registration = registration?.trim()
    password = password?.trim()

    console.log(`[LOGIN_DEBUG] Iniciando login para Matrícula: ${registration}`)

    if (!registration || !password) {
      return NextResponse.json({ message: 'Matrícula e senha são obrigatórias' }, { status: 400 })
    }

    // 1. Acesso ao Banco
    const employee = await prisma.employee.findUnique({
      where: { registration },
    })

    if (!employee) {
      return NextResponse.json({ message: 'Matrícula não cadastrada' }, { status: 401 })
    }

    if (employee.password !== password) {
      return NextResponse.json({ message: 'Senha incorreta' }, { status: 401 })
    }

    // 2. Validação de Tempo
    let br
    try {
      br = nowInBrazil()
    } catch (e) {
      br = { hour: new Date().getHours(), minute: new Date().getMinutes() }
    }
    
    const currentTimeMinutes = br.hour * 60 + br.minute
    
    // Turno 1: 06:00 (360) - 16:48 (1008)
    // Turno 2: 16:48 (1008) - 02:00 (120)
    
    if (employee.shift === 1) {
      const start = 120 // 02:00
      const end = 1008 // 16:48
      const isOutside = currentTimeMinutes < start || currentTimeMinutes > end

      if (isOutside && !confirmShiftEnd) {
        let msg = `Seu horário de turno (1º) é das 02:00 às 16:48.`
        if (currentTimeMinutes < start) msg = `O 1º turno ainda não iniciou (02:00).`
        else msg = `O 1º turno já encerrou (16:48).`

        return NextResponse.json({ 
          needsConfirmation: true,
          message: `${msg} Agora são ${String(br.hour).padStart(2, '0')}:${String(br.minute).padStart(2, '0')}. Deseja continuar mesmo assim?` 
        }, { status: 200 })
      }
    } else if (employee.shift === 2) {
      const start = 1008 // 16:48
      const end = 120   // 02:00
      const isAllowed = currentTimeMinutes >= start || currentTimeMinutes < end
      if (!isAllowed && !confirmShiftEnd) {
        return NextResponse.json({ 
          needsConfirmation: true,
          message: `Seu horário de turno (2º) é das 16:48 às 02:00. Agora são ${String(br.hour).padStart(2, '0')}:${String(br.minute).padStart(2, '0')}. Deseja entrar mesmo assim?` 
        }, { status: 200 })
      }
    }

    // 3. Sessão
    const sessionData = {
      id: employee.id,
      name: employee.name,
      registration: employee.registration,
      shift: employee.shift,
      role: employee.role,
    }

    const res = NextResponse.json({ user: sessionData })
    
    try {
      cookies().set('session', JSON.stringify(sessionData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24h
        path: '/',
      })
    } catch (e) {
      console.error('[LOGIN_DEBUG] Erro ao setar cookie:', e)
    }

    return res
  } catch (error: any) {
    console.error('[ERRO_CRITICO_LOGIN]:', error)
    return NextResponse.json({ 
      message: 'Erro interno no servidor ao tentar processar login',
      error: error.message
    }, { status: 500 })
  }
}
