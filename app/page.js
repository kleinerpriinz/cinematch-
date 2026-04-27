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
      else window.location.href = '/dashboard'
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setMessage(error.message)
      } else {
        await supabase.from('users').insert({
          id: data.user.id,
          email,
          username
        })
        setMessage('Account erstellt — bitte E-Mail bestätigen!')
      }
    }
    setLoading(false)
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#0e0e0f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        background: '#181614',
        border: '0.5px solid #2a2820',
        borderRadius: '12px',
        padding: '2rem',
        width: '100%',
        maxWidth: '380px'
      }}>
        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '22px', color: '#e8e4dc', marginBottom: '4px' }}>
            Cine<span style={{ color: '#c0392b' }}>Match</span>
          </div>
          <div style={{ fontSize: '13px', color: '#666' }}>
            {isLogin ? 'Willkommen zurück' : 'Account erstellen'}
          </div>
        </div>

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
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="Passwort"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={inputStyle}
        />

        {message && (
          <div style={{ fontSize: '13px', color: '#c0392b', marginBottom: '1rem' }}>
            {message}
          </div>
        )}

        <button
          onClick={handleAuth}
          disabled={loading}
          style={btnStyle}
        >
          {loading ? '...' : isLogin ? 'Einloggen' : 'Registrieren'}
        </button>

        <div
          onClick={() => setIsLogin(!isLogin)}
          style={{ textAlign: 'center', fontSize: '13px', color: '#666', marginTop: '1rem', cursor: 'pointer' }}
        >
          {isLogin ? 'Noch kein Account? Registrieren' : 'Bereits registriert? Einloggen'}
        </div>
      </div>
    </main>
  )
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  marginBottom: '10px',
  background: '#0e0e0f',
  border: '0.5px solid #2a2820',
  borderRadius: '8px',
  color: '#e8e4dc',
  fontSize: '14px',
  outline: 'none',
  display: 'block'
}

const btnStyle = {
  width: '100%',
  padding: '11px',
  background: '#c0392b',
  border: 'none',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '14px',
  fontWeight: '500',
  cursor: 'pointer'
}