async function diag() {
  const base = 'http://localhost:3000'
  
  console.log('--- Testing Anna (Shift 1) Login ---')
  const r1 = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ registration: '116203', password: 'Mudar@116203' })
  })
  const d1 = await r1.json()
  console.log('Anna Status:', r1.status)
  console.log('Anna Data:', JSON.stringify(d1, null, 2))

  console.log('\n--- Testing Lucas (Shift 2) Login ---')
  const r2 = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ registration: '116221', password: 'Mudar@116221' })
  })
  const d2 = await r2.json()
  console.log('Lucas Status:', r2.status)
  console.log('Lucas Data:', JSON.stringify(d2, null, 2))
  
  const cookie = r2.headers.get('set-cookie')
  if (cookie) {
     console.log('\n--- Testing Lucas Dashboard ---')
     const r3 = await fetch(`${base}/api/dashboard`, {
       headers: { Cookie: cookie }
     })
     const d3 = await r3.json()
     console.log('Dashboard Data Status:', r3.status)
     console.log('Dashboard Data Summary:', {
       totalToday: d3.data?.totalToday,
       recentCount: d3.data?.recentProductions?.length,
       rankingCount: d3.data?.ranking?.length
     })
  }
}

diag()
