'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Members() {
  const [user, setUser] = useState(null)
  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [scores, setScores] = useState({})

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/'
      else {
        setUser(data.user)
        loadData(data.user.id)
      }
    })
  }, [])

  async function loadData(userId) {
    const { data: memberData } = await supabase
      .from('group_members')
      .select('group_id, groups(id, name, invite_code)')
      .eq('user_id', userId)
      .single()
    if (!memberData) return
    setGroup(memberData.groups)

    const { data: membersData } = await supabase
      .from('group_members')
      .select('user_id, is_moderator, cine_points, users(username, email)')
      .eq('group_id', memberData.groups.id)
    setMembers(membersData || [])
  }

  function getInitials(member) {
    const name = member.users?.username || member.users?.email || '?'
    return name.substring(0, 2).toUpperCase()
  }

  function getColor(index) {
    const colors = [
      { bg: '#2a1a08', color: '#BA7517' },
      { bg: '#0f2a1a', color: '#1D9E75' },
      { bg: '#0e151a', color: '#378ADD' },
      { bg: '#1a0f1a', color: '#7F77DD' },
      { bg: '#2a1010', color: '#c0392b' },
    ]
    return colors[index % colors.length]
  }

  const sorted = [...members].sort((a, b) => (b.cine_points || 0) - (a.cine_points || 0))

  if (!user || !group) return null

  return (
    <main style={{ minHeight: '100vh', background: '#0e0e0f', color: '#e8e4dc', fontFamily: 'sans-serif' }}>


      <div style={{ padding: '2rem 24px', maxWidth: '700px' }}>
        <div style={{ fontSize: '22px', marginBottom: '4px' }}>Members</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
          <div style={{ fontSize: '13px', color: '#666' }}>{group.name}</div>
          <div style={{ fontSize: '13px' }}>
            Invite-Code: <span style={{ color: '#c0392b', fontWeight: '500', letterSpacing: '0.1em' }}>{group.invite_code}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '2rem' }}>
          {sorted.map((member, index) => {
            const col = getColor(index)
            const isMe = member.user_id === user.id
            return (
              <div key={member.user_id} style={{ background: '#181614', border: `0.5px solid ${isMe ? '#c0392b' : '#2a2820'}`, borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: col.bg, color: col.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '500', border: `0.5px solid ${col.color}`, flexShrink: 0 }}>
                  {getInitials(member)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '2px' }}>
                    {member.users?.username || member.users?.email}
                    {isMe && <span style={{ fontSize: '11px', color: '#666', marginLeft: '8px' }}>du</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: '#555' }}>
                    {member.is_moderator ? 'Moderator' : 'Mitglied'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: '500', color: index === 0 ? '#BA7517' : '#666' }}>
                    {member.cine_points || 0}
                  </div>
                  <div style={{ fontSize: '10px', color: '#444' }}>Cine-Pts</div>
                </div>
                {index === 0 && (
                  <div style={{ fontSize: '11px', background: '#2a1a08', color: '#BA7517', padding: '3px 8px', borderRadius: '20px', border: '0.5px solid #BA7517' }}>
                    ★ Top
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ background: '#181614', border: '0.5px solid #2a2820', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Freunde einladen</div>
          <div style={{ fontSize: '14px', color: '#e8e4dc', marginBottom: '4px' }}>
            Teile den Code <span style={{ color: '#c0392b', fontWeight: '500', letterSpacing: '0.1em' }}>{group.invite_code}</span>
          </div>
          <div style={{ fontSize: '13px', color: '#555' }}>Freunde können sich registrieren und beim Beitreten diesen Code eingeben.</div>
        </div>
      </div>
    </main>
  )
}