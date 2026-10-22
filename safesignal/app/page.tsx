'use client'

import { useCallback, type CSSProperties } from 'react'
import { useTideCloak } from '@tidecloak/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import rawConfig from '../tidecloak.json'

// tidecloak.json stays "{}" until scripts/init-realm.sh provisions and licenses the realm.
// Without it the Tide SDK has nothing to log in against, so say so instead of a dead button.
const configured = Boolean((rawConfig as Record<string, unknown>).realm)

const containerStyle: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f5f5f5',
  margin: 0,
}

const cardStyle: CSSProperties = {
  background: '#fff',
  padding: '2rem',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  textAlign: 'center',
  maxWidth: '360px',
  width: '100%',
}

const buttonStyle: CSSProperties = {
  marginTop: '1rem',
  padding: '0.75rem 1.5rem',
  fontSize: '1rem',
  borderRadius: '4px',
  border: 'none',
  background: '#0070f3',
  color: '#fff',
  cursor: 'pointer',
}

export default function LoginPage() {
  const { login, authenticated } = useTideCloak()
  const router = useRouter()

  const onLogin = useCallback(() => {
    login()
  }, [login])

  useEffect(() => {
    if (authenticated) {
      router.push('/home')
    }
  }, [authenticated])

  return (
    <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>SafeSignal Escalate</h1>
          <p style={{ color: '#555', marginTop: '0.5rem' }}>
            Sign in with your Tide account. Synthetic prototype data only.
          </p>
          {configured ? (
            <button onClick={onLogin} style={buttonStyle}>
              Log In
            </button>
          ) : (
            <div style={{ marginTop: '1rem', textAlign: 'left', color: '#8a5a00', background: '#fff8e6', padding: '0.75rem', borderRadius: '4px', fontSize: '0.9rem' }}>
              <strong>TideCloak is not configured yet.</strong> <code>tidecloak.json</code> is empty because the realm
              has not been provisioned. Run <code>bash scripts/init-realm.sh</code> until it prints
              &quot;All done&quot;, then restart <code>npm run dev</code>.
              <br />
              <em>Chưa có cấu hình TideCloak: hãy chạy <code>scripts/init-realm.sh</code> thành công trước, rồi khởi động lại app.</em>
            </div>
          )}
        </div>
    </div>
  )
}
