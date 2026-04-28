'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Vault() {
  const [user, setUser] = useState(null)
  const [group, setGroup] = useState(null)
  const [weeks, setWeeks] = useState([])
  const [members, setMembers] = useState([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/'
      else { setUser(data.user); loadData(data.user.id) }
    })
  }, [])

  async function loadData(userId) {
    const { data: memberData } = await supabase.from('group_members').select('group_id, groups(id, name)').eq('user_id', userId).single()
    if (!memberData) return
    setGroup(memberData.groups)
    const { data: membersData } = await supabase.from('group_members').select('user_id, cine_points, users(username, email)').eq('group_id', memberData.groups.id).order('cine_points', { ascending: false })
    setMembers(membersData || [])
    const { data: weeksData } = await supabase.from('weeks').select().eq('group_id', memberData.groups.id).order('created_at', { ascending: false })
    const weeksWithDetails = await Promise.all((weeksData || []).map(async week => {
      const { data: films } = await supabase.from('films').select().eq('week_id', week.id)
      const { data: votes } = await supabase.from('votes').select().eq('week_id', week.id)
      const { data: ratings } = await supabase.from('ratings').select().eq('week_id', week.id)
      let winnerFilm = null
      if (films?.length && votes?.length) {
        const counts = {}
        votes.forEach(v => counts[v.film_id] = (counts[v.film_id] || 0) + 1)
        const winnerId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
        winnerFilm = films.find(f => f.id === winnerId)
      }
      const avgRating = ratings?.length ? Math.round(ratings.reduce((a, b) => a + b.score, 0) / ratings.length) : null
      return { ...week, films, votes, ratings, winnerFilm, avgRating }
    }))
    setWeeks(weeksWithDetails)
  }

  function getMoodLabel(val) {
    if (val === null) return '—'
    const labels = ['Zeitverschwendung', 'Öde', 'Mäßig', 'Ok', 'Interessant', 'Gut', 'Stark', 'Sehr stark', 'Meisterwerk']
    return labels[Math.round(val / 100 * (labels.length - 1))]
  }

  function getInitials(member) {
    return (member?.users?.username || member?.users?.email || '?').substring(0, 2).toUpperCase()
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

        <div style={{ fontSize: '11px', color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Cine-Points</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '2rem' }}>
          {members.map((member, index) => {
            const pct = Math.round((member.cine_points || 0) / maxPts * 100)
            const isMe = member.user_id === user.id
            return (
              <div key={member.user_id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '11px', color: '#333', width: '16px' }}>#{index + 1}</div>
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: index === 0 ? 'rgba(200,169,110,0.15)' : '#111', border: `1px solid ${index === 0 ? '#c8a96e' : '#222'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: index === 0 ? '#c8a96e' : '#555', flexShrink: 0 }}>
                  {getInitials(member)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: isMe ? '#e8e4dc' : '#666', marginBottom: '3px' }}>
                    {member.users?.username || member.users?.email}
                  </div>
                  <div style={{ height: '2px', background: '#1a1a1a', borderRadius: '1px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: index === 0 ? '#c8a96e' : '#333', width: `${pct}%` }} />
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: index === 0 ? '#c8a96e' : '#444', minWidth: '28px', textAlign: 'right' }}>
                  {member.cine_points || 0}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: '3rem 2.5rem' }}>
        <div style={{ fontSize: '11px', color: '#c8a96e', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>The Vault</div>
        <div style={{ fontSize: '40px', fontWeight: '600', letterSpacing: '-0.02em', marginBottom: '3rem' }}>
          {weeks.length} {weeks.length === 1 ? 'Woche' : 'Wochen'} zusammen
        </div>

        {weeks.length === 0 ? (
          <div style={{ fontSize: '14px', color: '#444' }}>Noch keine abgeschlossenen Wochen.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '700px' }}>
            {weeks.map((week, index) => (
              <div key={week.id} style={{ background: '#0e0e0e', border: '0.5px solid #1a1a1a', borderRadius: '12px', overflow: 'hidden', display: 'flex' }}>
                {week.winnerFilm?.poster_path && (
                  <img src={`https://image.tmdb.org/t/p/w92${week.winnerFilm.poster_path}`} style={{ width: '56px', objectFit: 'cover', flexShrink: 0 }} />
                )}
                <div style={{ padding: '1rem 1.25rem', flex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', color: '#444', marginBottom: '4px' }}>Woche {week.week_number}</div>
                    <div style={{ fontSize: '16px', fontWeight: '500' }}>{week.winnerFilm?.title || 'Kein Gewinner'}</div>
                    <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>{week.winnerFilm?.year}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: '500', color: '#c8a96e' }}>{getMoodLabel(week.avgRating)}</div>
                    <div style={{ fontSize: '11px', color: '#444', marginTop: '2px' }}>{week.ratings?.length || 0} Bewertungen</div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: '80px' }}>
                    <div style={{ fontSize: '11px', color: '#444' }}>{week.films?.length || 0} Filme</div>
                    <div style={{ fontSize: '11px', color: '#444', marginTop: '2px' }}>{week.votes?.length || 0} Votes</div>
                    {week.avgRating !== null && <div style={{ fontSize: '11px', color: '#444', marginTop: '2px' }}>Ø {week.avgRating}/100</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}