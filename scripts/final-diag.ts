import axios from 'axios'

async function diag() {
  const base = 'http://localhost:3000'
  
  console.log('--- Testing Anna (Shift 1) Login ---')
  try {
    const r1 = await axios.post(`${base}/api/auth/login`, {
      registration: '116203',
      password: 'Mudar@116203'
    })
    console.log('Anna Status:', r1.status)
    console.log('Anna Data:', JSON.stringify(r1.data, null, 2))
  } catch (e: any) {
    console.log('Anna Error:', e.response?.status, e.response?.data)
  }

  console.log('\n--- Testing Lucas (Shift 2) Login ---')
  try {
    const r2 = await axios.post(`${base}/api/auth/login`, {
      registration: '116221',
      password: 'Mudar@116221'
    })
    console.log('Lucas Status:', r2.status)
    console.log('Lucas Data:', JSON.stringify(r2.data, null, 2))
    
    const cookie = r2.headers['set-cookie']
    if (cookie) {
       console.log('\n--- Testing Lucas Dashboard ---')
       const r3 = await axios.get(`${base}/api/dashboard`, {
         headers: { Cookie: cookie[0] }
       })
       console.log('Dashboard Data Summary:', {
         totalToday: r3.data.data?.totalToday,
         recentCount: r3.data.data?.recentProductions?.length,
         rankingCount: r3.data.data?.ranking?.length
       })
    }
  } catch (e: any) {
    console.log('Lucas Error:', e.response?.status, e.response?.data)
  }
}

diag()
