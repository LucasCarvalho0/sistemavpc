import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = cookies().get('session')
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  try {
    const user = JSON.parse(session.value)
    return NextResponse.json({ user })
  } catch (error) {
    return NextResponse.json({ user: null }, { status: 401 })
  }
}
