'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Profil() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [username, setUsername] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/'
      else { setUser(data.user); loadProfile(data.user.id) }
    })
  }, [])

  async function loadProfile(userId) {
    const { data } = await supabase.from('users').select().eq('id', userId).single()
    if (data) { setProfile(data); setUsername(data.username || '') }
  }

  async function uploadAvatar(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    
    const ext = file.name.split('.').pop()
    const path = `avatar-${user.id}.${ext}`
    
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { 
        upsert: true,
        contentType: file.type
      })
    
    if (error) {
      console.error('Upload error:', error)
      setUploading(false)
      return
    }
    
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(path)
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: urlData.publicUrl })
      .eq('id', user.id)
    
    if (updateError) console.error('Update error:', updateError)
    else setProfile(prev => ({ ...prev, avatar_url: urlData.publicUrl }))
    
    setUploading(false)
  }

  async function saveUsername() {
    await supabase.from('users').update({ username }).eq('id', user.id)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function getInitials() {
    return (profile?.username || profile?.email || '?').substring(0, 2).toUpperCase()
  }

  if (!user || !profile) return null

  return (
    <main style={{ minHeight: '100vh', background: '#080808', color: '#e8e4dc', fontFamily: 'sans-serif', display: 'flex' }}>
      <div style={{ width: '280px', flexShrink: 0, borderRight: '0.5px solid #1a1a1a', padding: '2rem 1.5rem' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', letterSpacing: '0.25em', color: '#e8e4dc', marginBottom: '3rem' }}>
          CINE<span style={{ color: '#c8a96e' }}>MATCH</span>
        </div>
      </div>

      <div style={{ flex: 1, padding: '3rem 2.5rem', maxWidth: '500px' }}>
        <div style={{ fontSize: '11px', color: '#c8a96e', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>Profil</div>
        <div style={{ fontSize: '40px', fontWeight: '600', letterSpacing: '-0.02em', marginBottom: '3rem' }}>Dein Account</div>

        {/* Avatar */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '11px', color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Profilbild</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', background: '#111', border: '1px solid #222', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ fontSize: '20px', fontWeight: '500', color: '#c8a96e' }}>{getInitials()}</div>
              )}
            </div>
            <div>
              <label style={{ display: 'inline-block', background: 'rgba(200,169,110,0.08)', border: '0.5px solid rgba(200,169,110,0.3)', borderRadius: '8px', color: '#c8a96e', padding: '9px 18px', fontSize: '13px', cursor: 'pointer' }}>
                {uploading ? 'Wird hochgeladen...' : 'Foto hochladen'}
                <input type="file" accept="image/*" onChange={uploadAvatar} style={{ display: 'none' }} />
              </label>
              <div style={{ fontSize: '12px', color: '#333', marginTop: '6px' }}>JPG, PNG — max 2MB</div>
            </div>
          </div>
        </div>

        {/* Username */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '11px', color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Username</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input value={username} onChange={e => setUsername(e.target.value)} style={{ flex: 1, padding: '11px 14px', background: '#0e0e0e', border: '0.5px solid #1a1a1a', borderRadius: '8px', color: '#e8e4dc', fontSize: '14px', outline: 'none' }} />
            <button onClick={saveUsername} style={{ background: 'rgba(200,169,110,0.08)', border: '0.5px solid rgba(200,169,110,0.3)', borderRadius: '8px', color: '#c8a96e', padding: '11px 18px', fontSize: '13px', cursor: 'pointer' }}>
              {saved ? '✓' : 'Speichern'}
            </button>
          </div>
        </div>

        <div style={{ fontSize: '13px', color: '#333' }}>{profile.email}</div>
      </div>
    </main>
  )
}