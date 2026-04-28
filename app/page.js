'use client'
import { useState } from 'react'
import { supabase } from './lib/supabase'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleAuth() {
    setLoading(true)
    setMessage('')
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
      else window.location.href = '/screening-room'
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) { setMessage(error.message); setLoading(false); return }
      await supabase.from('users').upsert({ id: data.user.id, email, username: username || email.split('@')[0] })
      window.location.href = '/screening-room'
    }
    setLoading(false)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#080808', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '2rem' }}>
      
      <div style={{ width: '100%', maxWidth: '360px' }}>
        
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '15px', letterSpacing: '0.3em', color: '#e8e4dc', marginBottom: '8px' }}>
            CINE<span style={{ color: '#c8a96e' }}>MATCH</span>
          </div>
          <div style={{ fontSize: '12px', color: '#333', letterSpacing: '0.1em' }}>
            {isLogin ? 'Willkommen zurück' : 'Konto erstellen'}
          </div>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.5rem' }}>
          {!isLogin && (
            <input
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={inputStyle}
            />
          )}
          <input
            placeholder="E-Mail"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAuth()}
            style={inputStyle}
          />
          <input
            placeholder="Passwort"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAuth()}
            style={inputStyle}
          />
        </div>

        {message && (
          <div style={{ fontSize: '13px', color: '#c8a96e', marginBottom: '1rem', textAlign: 'center' }}>
            {message}
          </div>
        )}

        <button onClick={handleAuth} disabled={loading} style={{
          width: '100%', padding: '12px',
          background: 'rgba(200,169,110,0.08)',
          border: '0.5px solid rgba(200,169,110,0.3)',
          borderRadius: '8px', color: '#c8a96e',
          fontSize: '14px', cursor: 'pointer',
          letterSpacing: '0.05em',
          marginBottom: '1.5rem'
        }}>
          {loading ? '...' : isLogin ? 'Einloggen' : 'Registrieren'}
        </button>

        <div onClick={() => { setIsLogin(!isLogin); setMessage('') }} style={{ textAlign: 'center', fontSize: '13px', color: '#333', cursor: 'pointer' }}>
          {isLogin ? 'Noch kein Konto — Registrieren' : 'Bereits registriert — Einloggen'}
        </div>
      </div>

      {/* Bottom */}
      <div style={{ position: 'absolute', bottom: '2rem', fontSize: '11px', color: '#222', letterSpacing: '0.1em' }}>
        Dein Filmclub. Deine Auswahl.
      </div>
    </main>
  )
}

const inputStyle = {
  width: '100%', padding: '11px 14px',
  background: '#0e0e0e',
  border: '0.5px solid #1a1a1a',
  borderRadius: '8px', color: '#e8e4dc',
  fontSize: '14px', outline: 'none',
  display: 'block'
}