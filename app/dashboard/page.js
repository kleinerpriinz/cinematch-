'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [group, setGroup] = useState(null)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showJoinGroup, setShowJoinGroup] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/'
      else {
        setUser(data.user)
        loadGroup(data.user.id)
      }
    })
  }, [])

  async function loadGroup(userId) {
    const { data } = await supabase
      .from('group_members')
      .select('group_id, groups(id, name, invite_code)')
      .eq('user_id', userId)
      .single()
    if (data) setGroup(data.groups)
  }

  async function createGroup() {
    setLoading(true)
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data, error } = await supabase
      .from('groups')
      .insert({ name: groupName, invite_code: code, created_by: user.id })
      .select()
      .single()
    if (error) { setMessage(error.message); setLoading(false); return }
    await supabase.from('group_members').insert({
      group_id: data.id, user_id: user.id, is_moderator: true
    })
    setGroup(data)
    setShowCreateGroup(false)
    setLoading(false)
  }

  async function joinGroup() {
    setLoading(true)
    const { data: groupData, error } = await supabase
      .from('groups')
      .select()
      .eq('invite_code', inviteCode.toUpperCase())
      .single()
    if (error || !groupData) { setMessage('Gruppe nicht gefunden'); setLoading(false); return }
    await supabase.from('group_members').insert({
      group_id: groupData.id, user_id: user.id
    })
    setGroup(groupData)
    setShowJoinGroup(false)
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (!user) return null

  return (
    <main style={{ minHeight: '100vh', background: '#0e0e0f', color: '#e8e4dc', fontFamily: 'sans-serif' }}>


      <div style={{ padding: '2rem 24px' }}>
        {group ? (
          <div>
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>{group.name}</div>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '2rem' }}>
              Invite-Code: <span style={{ color: '#c0392b', fontWeight: '500', letterSpacing: '0.1em' }}>{group.invite_code}</span>
              <span style={{ color: '#555', marginLeft: '8px' }}>— teile ihn mit deinen Freunden</span>
            </div>
            <div style={{ background: '#181614', border: '0.5px solid #2a2820', borderRadius: '12px', padding: '1.5rem', maxWidth: '400px' }}>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>Nächster Schritt</div>
              <div style={{ fontSize: '14px', color: '#e8e4dc' }}>Screening Room kommt als nächstes — dort kannst du Filme vorschlagen und abstimmen.</div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '22px', marginBottom: '8px' }}>Dashboard</div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '2rem' }}>Erstelle eine Gruppe oder tritt einer bei.</div>

            {!showCreateGroup && !showJoinGroup && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowCreateGroup(true)} style={{ background: '#c0392b', border: 'none', borderRadius: '8px', color: '#fff', padding: '10px 16px', fontSize: '14px', cursor: 'pointer' }}>Gruppe erstellen</button>
                <button onClick={() => setShowJoinGroup(true)} style={{ background: '#181614', border: '0.5px solid #2a2820', borderRadius: '8px', color: '#888', padding: '10px 16px', fontSize: '14px', cursor: 'pointer' }}>Gruppe beitreten</button>
              </div>
            )}

            {showCreateGroup && (
              <div style={{ background: '#181614', border: '0.5px solid #2a2820', borderRadius: '12px', padding: '1.5rem', maxWidth: '380px' }}>
                <div style={{ fontSize: '14px', marginBottom: '12px' }}>Gruppenname</div>
                <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="z.B. Filmclub Freitag" style={inputStyle} />
                {message && <div style={{ color: '#c0392b', fontSize: '13px', marginBottom: '10px' }}>{message}</div>}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={createGroup} disabled={loading || !groupName} style={{ background: '#c0392b', border: 'none', borderRadius: '8px', color: '#fff', padding: '10px 16px', fontSize: '14px', cursor: 'pointer' }}>{loading ? '...' : 'Erstellen'}</button>
                  <button onClick={() => setShowCreateGroup(false)} style={{ background: 'none', border: '0.5px solid #2a2820', borderRadius: '8px', color: '#888', padding: '10px 16px', fontSize: '14px', cursor: 'pointer' }}>Abbrechen</button>
                </div>
              </div>
            )}

            {showJoinGroup && (
              <div style={{ background: '#181614', border: '0.5px solid #2a2820', borderRadius: '12px', padding: '1.5rem', maxWidth: '380px' }}>
                <div style={{ fontSize: '14px', marginBottom: '12px' }}>Invite-Code eingeben</div>
                <input value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="z.B. AB12CD" style={inputStyle} />
                {message && <div style={{ color: '#c0392b', fontSize: '13px', marginBottom: '10px' }}>{message}</div>}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={joinGroup} disabled={loading || !inviteCode} style={{ background: '#c0392b', border: 'none', borderRadius: '8px', color: '#fff', padding: '10px 16px', fontSize: '14px', cursor: 'pointer' }}>{loading ? '...' : 'Beitreten'}</button>
                  <button onClick={() => setShowJoinGroup(false)} style={{ background: 'none', border: '0.5px solid #2a2820', borderRadius: '8px', color: '#888', padding: '10px 16px', fontSize: '14px', cursor: 'pointer' }}>Abbrechen</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 12px', marginBottom: '12px',
  background: '#0e0e0f', border: '0.5px solid #2a2820',
  borderRadius: '8px', color: '#e8e4dc', fontSize: '14px',
  outline: 'none', display: 'block'
}