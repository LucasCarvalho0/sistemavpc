import { nowInBrazil } from './lib/shiftUtils'

try {
  console.log('Testing nowInBrazil()...')
  const br = nowInBrazil()
  console.log('Result:', br)
} catch (e) {
  console.error('nowInBrazil() failed:', e)
}
