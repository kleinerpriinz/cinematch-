'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Vault() {
  const [user, setUser] = useState(null)
  const [group, setGroup] = useState(null)
  const [weeks, setWeeks] = useState([])
  const [members, setMembers] = useState([])
  const [selectedWeek, setSelectedWeek] = useState(null)

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
    const { data: membersData } = await supabase.from('group_members').select('user_id, cine_points, users(username, email, avatar_url)').eq('group_id', memberData.groups.id).order('cine_points', { ascending: false })
    setMembers(membersData || [])
    const { data: weeksData } = await supabase.from('weeks').select().eq('group_id', memberData.groups.id).order('created_at', { ascending: false })
    const weeksWithDetails = await Promise.all((weeksData || []).map(async week => {
      const { data: films } = await supabase.from('films').select().eq('week_id', week.id)
      const { data: votes } = await supabase.from('votes').select().eq('week_id', week.id)
      const { data: ratings } = await supabase.from('ratings').select().eq('week_id', week.id)
      const { data: modData } = week.moderator_id ? await supabase.from('group_members').select('cine_points, users(username, email, avatar_url)').eq('user_id', week.moderator_id).eq('group_id', memberData.groups.id).single() : { data: null }
      let winnerFilm = null
      if (films?.length && votes?.length) {
        const counts = {}
        votes.forEach(v => counts[v.film_id] = (counts[v.film_id] || 0) + 1)
        const winnerId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
        winnerFilm = films.find(f => f.id === winnerId)
      }
      const avgRating = ratings?.length ? Math.round(ratings.reduce((a, b) => a + b.score, 0) / ratings.length) : null
      return { ...week, films, votes, ratings, winnerFilm, avgRating, moderator: modData }
    }))
    setWeeks(weeksWithDetails)
    if (weeksWithDetails.length > 0) setSelectedWeek(weeksWithDetails[0])
  }

  function getMoodLabel(val) {
    if (val === null) return '—'
    const labels = ['Zeitverschwendung', 'Öde', 'Mäßig', 'Ok', 'Interessant', 'Gut', 'Stark', 'Sehr stark', 'Meisterwerk']
    return labels[Math.round(val / 100 * (labels.length - 1))]
  }

  function getInitials(user) {
    return (user?.username || user?.email || '?').substring(0, 2).toUpperCase()
  }

  if (!user || !group) return null

  const sw = selectedWeek

  function getMoodColor(val) {
    if (val === null) return 'transparent'
    if (val >= 80) return '#d4a84b'
    if (val >= 60) return '#b8935a'
    if (val >= 40) return '#666666'
    if (val >= 20) return '#3a5068'
    return '#1a2a3a'
  }

  return (
    <main style={{ minHeight: '100vh', background: '#080808', color: '#e8e4dc', fontFamily: 'sans-serif', display: 'flex', position: 'relative', overflow: 'hidden' }}>

{/* Backdrop */}
{sw?.winnerFilm?.backdrop_path && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: `url(https://image.tmdb.org/t/p/original${sw.winnerFilm.backdrop_path})`, backgroundSize: 'cover', backgroundPosition: 'center top' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(8,8,8,0.97) 320px, rgba(8,8,8,0.55) 60%, rgba(8,8,8,0.85))' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,8,8,0.8) 0%, transparent 50%)' }} />
          {sw?.avgRating !== null && sw?.avgRating !== undefined && (
            <>
              <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '70%', height: '70%', background: `radial-gradient(ellipse at center, ${getMoodColor(sw.avgRating)} 0%, transparent 65%)`, opacity: sw.avgRating >= 60 ? 0.5 : 0.2, pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: '-5%', right: '10%', width: '40%', height: '40%', background: `radial-gradient(ellipse at center, ${getMoodColor(sw.avgRating)} 0%, transparent 70%)`, opacity: sw.avgRating >= 60 ? 0.3 : 0.1, pointerEvents: 'none' }} />
            </>
          )}
        </div>
      )}

      {/* Left Sidebar */}
      <div style={{ width: '280px', flexShrink: 0, padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, overflowY: 'auto' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', letterSpacing: '0.25em', color: '#e8e4dc', marginBottom: '3rem' }}>
          CINE<span style={{ color: '#c8a96e' }}>MATCH</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {weeks.map((week, index) => {
            const isSelected = sw?.id === week.id
            const isCurrent = index === 0
            return (
              <div key={week.id} style={{ display: 'flex', gap: '1rem', alignItems: 'stretch', cursor: 'pointer' }} onClick={() => setSelectedWeek(week)}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: '4px' }}>
                  <div style={{ width: '1px', height: index === 0 ? '0' : '12px', background: '#2a2a2a' }} />
                  <div style={{ width: isCurrent ? '12px' : '8px', height: isCurrent ? '12px' : '8px', borderRadius: '50%', border: `${isCurrent ? '2px' : '1px'} solid ${isSelected ? '#c8a96e' : '#333'}`, background: isSelected ? '#c8a96e' : '#080808', flexShrink: 0 }} />
                  <div style={{ width: '1px', flex: 1, minHeight: '40px', background: '#2a2a2a' }} />
                </div>
                <div style={{ paddingBottom: '16px', paddingTop: '0px', flex: 1 }}>
                  <div style={{ fontSize: '10px', color: isSelected ? '#c8a96e' : '#444', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
                    {isCurrent ? 'Diese Woche' : `Woche ${week.week_number}`}
                  </div>
                  {week.winnerFilm && (
                    <div style={{ background: isSelected ? 'rgba(200,169,110,0.08)' : 'transparent', border: `0.5px solid ${isSelected ? 'rgba(200,169,110,0.2)' : 'transparent'}`, borderRadius: '8px', padding: isSelected ? '8px' : '0', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {week.winnerFilm.poster_path && (
                        <img src={`https://image.tmdb.org/t/p/w185${week.winnerFilm.poster_path}`} style={{ width: '32px', height: '44px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />
                      )}
                      <div>
                        <div style={{ fontSize: '13px', color: isSelected ? '#e8e4dc' : '#666', fontWeight: isSelected ? '500' : '400' }}>{week.winnerFilm.title}</div>
                        <div style={{ fontSize: '11px', color: '#444', marginTop: '2px' }}>{getMoodLabel(week.avgRating)}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      {sw && (
        <div style={{ flex: 1, padding: '3rem 3rem', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ maxWidth: '600px' }}>
            <div style={{ fontSize: '11px', color: '#c8a96e', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
              Woche {sw.week_number}
            </div>
            <div style={{ fontSize: '60px', fontWeight: '600', lineHeight: 1, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              {sw.winnerFilm?.title || 'Kein Film'}
            </div>
            <div style={{ fontSize: '16px', color: '#888', marginBottom: '2rem' }}>
              {[sw.winnerFilm?.director, sw.winnerFilm?.year].filter(Boolean).join(' • ')}
            </div>
            <div style={{ width: '40px', height: '1px', background: '#333', marginBottom: '2rem' }} />
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
              Die Stimmung war
            </div>
            <div style={{ fontSize: '64px', fontWeight: '600', lineHeight: 1, letterSpacing: '0.1em', textTransform: 'uppercase', color: sw.avgRating !== null ? '#c8a96e' : '#333', marginBottom: '0.5rem' }}>
              {getMoodLabel(sw.avgRating)}
            </div>
            {sw.ratings?.length > 0 && (
              <div style={{ fontSize: '13px', color: '#555', marginBottom: '2rem' }}>
                Basierend auf {sw.ratings.length} {sw.ratings.length === 1 ? 'Bewertung' : 'Bewertungen'}
              </div>
            )}

            {sw.moderator && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '1rem' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', background: '#111', border: '1px solid #222', flexShrink: 0 }}>
                  {sw.moderator.users?.avatar_url
                    ? <img src={sw.moderator.users.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#c8a96e' }}>{getInitials(sw.moderator.users)}</div>
                  }
                </div>
                <div>
                  <div style={{ fontSize: '14px', color: '#e8e4dc' }}>Kuratiert von {sw.moderator.users?.username || sw.moderator.users?.email}</div>
                  <div style={{ fontSize: '13px', color: '#c8a96e', marginTop: '2px' }}>+{sw.moderator.cine_points || 0} Punkte</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}