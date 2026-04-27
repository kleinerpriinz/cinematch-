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
      else {
        setUser(data.user)
        loadData(data.user.id)
      }
    })
  }, [])

  async function loadData(userId) {
    const { data: memberData } = await supabase
      .from('group_members')
      .select('group_id, groups(id, name)')
      .eq('user_id', userId)
      .single()
    if (!memberData) return
    setGroup(memberData.groups)

    const { data: weeksData } = await supabase
      .from('weeks')
      .select()
      .eq('group_id', memberData.groups.id)
      .order('created_at', { ascending: false })
    
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

      const avgRating = ratings?.length
        ? Math.round(ratings.reduce((a, b) => a + b.score, 0) / ratings.length)
        : null

      return { ...week, films, votes, ratings, winnerFilm, avgRating }
    }))

    setWeeks(weeksWithDetails)

    const { data: membersData } = await supabase
      .from('group_members')
      .select('user_id, cine_points, users(username, email)')
      .eq('group_id', memberData.groups.id)
      .order('cine_points', { ascending: false })
    setMembers(membersData || [])
  }

  function getMoodLabel(val) {
    if (val === null) return '—'
    const labels = ['Zeitverschwendung', 'Öde', 'Mäßig', 'Ok', 'Interessant', 'Gut', 'Stark', 'Sehr stark', 'Meisterwerk']
    return labels[Math.round(val / 100 * (labels.length - 1))]
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

  if (!user || !group) return null

  return (
    <main style={{ minHeight: '100vh', background: '#0e0e0f', color: '#e8e4dc', fontFamily: 'sans-serif' }}>
      <div style={{ padding: '2rem 24px', maxWidth: '800px' }}>
        <div style={{ fontSize: '22px', marginBottom: '4px' }}>The Vault</div>
        <div style={{ fontSize: '13px', color: '#666', marginBottom: '2rem' }}>{group.name} — Archiv & Statistiken</div>

        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Cine-Points Rangliste</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {members.map((member, index) => {
              const col = getColor(index)
              const isMe = member.user_id === user.id
              return (
                <div key={member.user_id} style={{ background: '#181614', border: `0.5px solid ${isMe ? '#c0392b' : '#2a2820'}`, borderRadius: '10px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '13px', color: '#444', width: '16px' }}>#{index + 1}</div>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: col.bg, color: col.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '500', border: `0.5px solid ${col.color}`, flexShrink: 0 }}>
                    {(member.users?.username || member.users?.email || '?').substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, fontSize: '13px' }}>
                    {member.users?.username || member.users?.email}
                    {isMe && <span style={{ fontSize: '11px', color: '#555', marginLeft: '6px' }}>du</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '80px', height: '4px', background: '#2a2820', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: index === 0 ? '#BA7517' : '#c0392b', borderRadius: '2px', width: `${Math.round((member.cine_points || 0) / Math.max(...members.map(m => m.cine_points || 1)) * 100)}%` }} />
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: index === 0 ? '#BA7517' : '#666', minWidth: '40px', textAlign: 'right' }}>
                      {member.cine_points || 0}
                    </div>
                  </div>
                  {index === 0 && <div style={{ fontSize: '10px', background: '#2a1a08', color: '#BA7517', padding: '2px 8px', borderRadius: '20px', border: '0.5px solid #BA7517' }}>★ Top</div>}
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Vergangene Wochen</div>
          {weeks.length === 0 ? (
            <div style={{ fontSize: '14px', color: '#555' }}>Noch keine abgeschlossenen Wochen.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {weeks.map((week, index) => (
                <div key={week.id} style={{ background: '#181614', border: '0.5px solid #2a2820', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {week.winnerFilm?.poster_path && (
                      <img src={`https://image.tmdb.org/t/p/w92${week.winnerFilm.poster_path}`} style={{ width: '40px', borderRadius: '4px', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: '#555', marginBottom: '3px' }}>Woche {week.week_number}</div>
                      <div style={{ fontSize: '15px', fontWeight: '500' }}>{week.winnerFilm?.title || 'Kein Gewinner'}</div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{week.winnerFilm?.year}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '18px', fontWeight: '500', color: '#c0392b' }}>{getMoodLabel(week.avgRating)}</div>
                      <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{week.ratings?.length || 0} Bewertungen</div>
                    </div>
                  </div>
                  <div style={{ borderTop: '0.5px solid #2a2820', padding: '8px 1.25rem', display: 'flex', gap: '16px' }}>
                    <div style={{ fontSize: '12px', color: '#555' }}>{week.films?.length || 0} Filme vorgeschlagen</div>
                    <div style={{ fontSize: '12px', color: '#555' }}>{week.votes?.length || 0} Votes</div>
                    {week.avgRating !== null && <div style={{ fontSize: '12px', color: '#555' }}>Ø {week.avgRating}/100</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}