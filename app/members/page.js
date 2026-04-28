'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Members() {
  const [user, setUser] = useState(null)
  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/'
      else { setUser(data.user); loadData(data.user.id) }
    })
  }, [])

  async function loadData(userId) {
    const { data: memberData } = await supabase.from('group_members').select('group_id, groups(id, name, invite_code)').eq('user_id', userId).single()
    if (!memberData) return
    setGroup(memberData.groups)
    const { data: membersData } = await supabase.from('group_members').select('user_id, is_moderator, cine_points, users(username, email, avatar_url)').eq('group_id', memberData.groups.id).order('cine_points', { ascending: false })
    setMembers(membersData || [])
  }

  function getInitials(member) {
    return (member?.users?.username || member?.users?.email || '?').substring(0, 2).toUpperCase()
  }

  function getColor(index) {
    const colors = ['#c8a96e', '#1D9E75', '#378ADD', '#7F77DD', '#c0392b']
    return colors[index % colors.length]
  }

  if (!user || !group) return null
  const maxPts = Math.max(...members.map(m => m.cine_points || 0), 1)

  return (
    <main style={{ minHeight: '100vh', background: '#080808', color: '#e8e4dc', fontFamily: 'sans-serif', display: 'flex' }}>

      {/* Sidebar */}
      <div style={{ width: '280px', flexShrink: 0, borderRight: '0.5px solid #1a1a1a', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', letterSpacing: '0.25em', color: '#e8e4dc', marginBottom: '3rem' }}>
          CINE<span style={{ color: '#c8a96e' }}>MATCH</span>
        </div>

        <div style={{ fontSize: '11px', color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Gruppe</div>
        <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '2rem' }}>{group.name}</div>

        <div style={{ marginTop: 'auto' }}>
          <div style={{ fontSize: '11px', color: '#444', marginBottom: '6px' }}>Invite-Code</div>
          <div style={{ fontSize: '20px', fontWeight: '500', color: '#c8a96e', letterSpacing: '0.2em' }}>{group.invite_code}</div>
          <div style={{ fontSize: '12px', color: '#444', marginTop: '6px' }}>Teile ihn mit deinen Freunden</div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: '3rem 2.5rem' }}>
        <div style={{ fontSize: '11px', color: '#c8a96e', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>Members</div>
        <div style={{ fontSize: '40px', fontWeight: '600', letterSpacing: '-0.02em', marginBottom: '3rem' }}>{members.length} Filmnerds</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '600px' }}>
          {members.map((member, index) => {
            const isMe = member.user_id === user.id
            const col = getColor(index)
            const pct = Math.round((member.cine_points || 0) / maxPts * 100)
            return (
              <div key={member.user_id} style={{ background: '#0e0e0e', border: `0.5px solid ${isMe ? '#c8a96e33' : '#1a1a1a'}`, borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '13px', color: '#333', width: '20px', textAlign: 'center' }}>#{index + 1}</div>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `${col}18`, border: `1.5px solid ${col}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '500', color: col, flexShrink: 0, overflow: 'hidden' }}>
  {member.users?.avatar_url
    ? <img src={member.users.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    : getInitials(member)
  }
</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: '500', marginBottom: '2px' }}>
                    {member.users?.username || member.users?.email}
                    {isMe && <span style={{ fontSize: '11px', color: '#444', marginLeft: '8px' }}>du</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: '#444' }}>{member.is_moderator ? 'Gründer' : 'Mitglied'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <div style={{ width: '80px', height: '2px', background: '#1a1a1a', borderRadius: '1px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: col, width: `${pct}%`, borderRadius: '1px' }} />
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: index === 0 ? '#c8a96e' : '#555', minWidth: '32px', textAlign: 'right' }}>
                      {member.cine_points || 0}
                    </div>
                  </div>
                  <div style={{ fontSize: '10px', color: '#333' }}>Cine-Pts</div>
                </div>
                {index === 0 && <div style={{ fontSize: '10px', background: 'rgba(200,169,110,0.08)', color: '#c8a96e', padding: '3px 8px', borderRadius: '20px', border: '0.5px solid rgba(200,169,110,0.3)' }}>★ Top</div>}
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}