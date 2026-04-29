'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Vault() {
  const [user, setUser] = useState(null)
  const [group, setGroup] = useState(null)
  const [weeks, setWeeks] = useState([])
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

  function getMoodColor(val) {
    if (val === null) return '#555'
    if (val >= 80) return '#c8a96e'
    if (val >= 60) return '#8aaa6e'
    if (val >= 40) return '#6e8aaa'
    if (val >= 20) return '#7a6eaa'
    return '#aa6e6e'
  }

  function getInitials(u) {
    return (u?.username || u?.email || '?').substring(0, 2).toUpperCase()
  }

  function formatDate(dateStr) {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  if (!user || !group) return null
  const sw = selectedWeek

  return (
    <main style={{ minHeight: '100vh', background: '#080808', color: '#e8e4dc', fontFamily: 'sans-serif', display: 'flex', position: 'relative', overflow: 'hidden' }}>

      {/* Backdrop */}
      {sw?.winnerFilm?.backdrop_path && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(https://image.tmdb.org/t/p/original${sw.winnerFilm.backdrop_path})`, backgroundSize: 'cover', backgroundPosition: 'center center' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(8,8,8,0.96) 300px, rgba(8,8,8,0.25) 55%, rgba(8,8,8,0.5))' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,8,8,0.7) 0%, transparent 35%)' }} />
          {sw.avgRating !== null && sw.avgRating >= 40 && (
            <>
              <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '75%', height: '80%', background: 'radial-gradient(ellipse at 60% 80%, #d4822a 0%, #c8a030 25%, #2a8a3a 55%, transparent 75%)', opacity: 0.28, pointerEvents: 'none', filter: 'blur(40px)' }} />
              <div style={{ position: 'absolute', bottom: '-10%', right: '5%', width: '50%', height: '55%', background: 'radial-gradient(ellipse at 50% 90%, #e8901a 0%, #d4a020 35%, transparent 70%)', opacity: 0.18, pointerEvents: 'none', filter: 'blur(60px)' }} />
            </>
          )}
          {sw.avgRating !== null && sw.avgRating < 40 && (
            <div style={{ position: 'absolute', bottom: '-10%', right: '0%', width: '60%', height: '60%', background: 'radial-gradient(ellipse at 60% 80%, #1a3a5a 0%, #2a3a6a 40%, transparent 70%)', opacity: 0.25, pointerEvents: 'none', filter: 'blur(50px)' }} />
          )}
        </div>
      )}

      {/* Left Sidebar */}
      <div style={{ width: '300px', flexShrink: 0, padding: '2rem 1.25rem', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, overflowY: 'auto', maxHeight: '100vh' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '12px', letterSpacing: '0.3em', color: '#e8e4dc', marginBottom: '2.5rem' }}>
          CINE<span style={{ color: '#c8a96e' }}>MATCH</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {weeks.map((week, index) => {
            const isSelected = sw?.id === week.id
            const isCurrent = index === 0
            return (
              <div key={week.id} style={{ display: 'flex', gap: '12px', cursor: 'pointer' }} onClick={() => setSelectedWeek(week)}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: '6px' }}>
                  {index > 0 && <div style={{ width: '1px', height: '12px', background: '#2a2a2a' }} />}
                  <div style={{ width: isCurrent ? '14px' : '9px', height: isCurrent ? '14px' : '9px', borderRadius: '50%', border: `${isCurrent ? '2.5px' : '1px'} solid ${isSelected ? '#c8a96e' : '#333'}`, background: isSelected ? '#c8a96e' : '#080808', flexShrink: 0, marginTop: index === 0 ? 0 : 0 }} />
                  <div style={{ width: '1px', flex: 1, minHeight: '80px', background: '#1a1a1a' }} />
                </div>

                <div style={{ paddingBottom: '12px', flex: 1, paddingTop: index === 0 ? '0' : '12px' }}>
                  <div style={{ fontSize: '9px', color: isCurrent ? '#c8a96e' : '#444', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>
                    {isCurrent ? 'Diese Woche' : index === 1 ? 'Vorwoche' : `Woche ${week.week_number}`}
                  </div>

                  {week.winnerFilm ? (
                    <div style={{ background: isSelected ? 'rgba(200,169,110,0.06)' : 'rgba(255,255,255,0.02)', border: `0.5px solid ${isSelected ? 'rgba(200,169,110,0.25)' : 'rgba(255,255,255,0.05)'}`, borderRadius: '10px', padding: '10px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      {week.winnerFilm.poster_path && (
                        <img src={`https://image.tmdb.org/t/p/w185${week.winnerFilm.poster_path}`} style={{ width: '44px', height: '62px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', color: isSelected ? '#e8e4dc' : '#888', fontWeight: isSelected ? '500' : '400', marginBottom: '3px', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{week.winnerFilm.title}</div>
                        <div style={{ fontSize: '10px', color: '#444', marginBottom: '4px' }}>{formatDate(week.created_at)}</div>
                        {week.avgRating !== null && (
                          <div style={{ fontSize: '10px', fontWeight: '500', letterSpacing: '0.05em', color: getMoodColor(week.avgRating) }}>
                            STIMMUNG: {getMoodLabel(week.avgRating).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#333', padding: '8px 0' }}>Kein Film</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      {sw && (
        <div style={{ flex: 1, padding: '3rem 3.5rem', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ maxWidth: '580px' }}>
            <div style={{ fontSize: '10px', color: '#c8a96e', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>
              Woche {sw.week_number}
            </div>
            <div style={{ fontSize: '56px', fontWeight: '700', lineHeight: 1, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              {sw.winnerFilm?.title || 'Kein Film'}
            </div>
            <div style={{ fontSize: '15px', color: '#777', marginBottom: '2rem', letterSpacing: '0.02em' }}>
              {[sw.winnerFilm?.director, sw.winnerFilm?.year].filter(Boolean).join(' • ')}
            </div>
            <div style={{ width: '36px', height: '1px', background: '#c8a96e', opacity: 0.4, marginBottom: '2rem' }} />
            <div style={{ fontSize: '13px', color: '#555', marginBottom: '0.5rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Die Stimmung war
            </div>
            <div style={{ fontSize: '56px', fontWeight: '700', lineHeight: 1, letterSpacing: '0.1em', textTransform: 'uppercase', color: getMoodColor(sw.avgRating), marginBottom: '0.5rem' }}>
              {getMoodLabel(sw.avgRating)}
            </div>
            {sw.ratings?.length > 0 && (
              <div style={{ fontSize: '13px', color: '#555', marginBottom: '2.5rem' }}>
                Basierend auf {sw.ratings.length} {sw.ratings.length === 1 ? 'Bewertung' : 'Bewertungen'}
              </div>
            )}

            {sw.moderator && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '0.5rem' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '50%', overflow: 'hidden', background: '#111', border: '1px solid #222', flexShrink: 0 }}>
                  {sw.moderator.users?.avatar_url
                    ? <img src={sw.moderator.users.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#c8a96e' }}>{getInitials(sw.moderator.users)}</div>
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