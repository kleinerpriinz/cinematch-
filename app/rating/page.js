'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const MOOD_LABELS = ['Zeitverschwendung', 'Öde', 'Mäßig', 'Ok', 'Interessant', 'Gut', 'Stark', 'Sehr stark', 'Meisterwerk']

export default function Rating() {
  const [user, setUser] = useState(null)
  const [week, setWeek] = useState(null)
  const [winnerFilm, setWinnerFilm] = useState(null)
  const [ratings, setRatings] = useState([])
  const [members, setMembers] = useState([])
  const [myRating, setMyRating] = useState(null)
  const [sliderVal, setSliderVal] = useState(50)
  const [submitted, setSubmitted] = useState(false)
  const [group, setGroup] = useState(null)

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
    const { data: membersData } = await supabase.from('group_members').select('user_id, users(username, email)').eq('group_id', memberData.groups.id)
    setMembers(membersData || [])
    const { data: weekData } = await supabase.from('weeks').select().eq('group_id', memberData.groups.id).order('created_at', { ascending: false }).limit(1).single()
    if (!weekData) return
    setWeek(weekData)
    if (weekData.winner_film_id) {
      const { data: filmData } = await supabase.from('films').select().eq('id', weekData.winner_film_id).single()
      setWinnerFilm(filmData)
    } else {
      const { data: votes } = await supabase.from('votes').select('film_id').eq('week_id', weekData.id)
      if (votes?.length) {
        const counts = {}
        votes.forEach(v => counts[v.film_id] = (counts[v.film_id] || 0) + 1)
        const winnerId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
        const { data: filmData } = await supabase.from('films').select().eq('id', winnerId).single()
        setWinnerFilm(filmData)
      }
    }
    const { data: ratingData } = await supabase.from('ratings').select().eq('week_id', weekData.id)
    setRatings(ratingData || [])
    const mine = ratingData?.find(r => r.user_id === userId)
    if (mine) { setMyRating(mine.score); setSubmitted(true); setSliderVal(mine.score) }
  }

  async function submitRating() {
    await supabase.from('ratings').insert({ week_id: week.id, user_id: user.id, score: sliderVal })
    setMyRating(sliderVal)
    setSubmitted(true)
    const { data: allRatings } = await supabase.from('ratings').select().eq('week_id', week.id)
    setRatings(allRatings || [])
    if (allRatings?.length >= 1 && week.moderator_id) {
      const avg = Math.round(allRatings.reduce((a, b) => a + b.score, 0) / allRatings.length)
      const points = Math.round(avg / 10)
      const { data: modMember } = await supabase.from('group_members').select('cine_points').eq('user_id', week.moderator_id).eq('group_id', group.id).single()
      if (modMember) await supabase.from('group_members').update({ cine_points: (modMember.cine_points || 0) + points }).eq('user_id', week.moderator_id).eq('group_id', group.id)
    }
  }

  function getMoodLabel(val) {
    return MOOD_LABELS[Math.round(val / 100 * (MOOD_LABELS.length - 1))]
  }

  function getAverage() {
    if (!ratings.length) return 0
    return Math.round(ratings.reduce((a, b) => a + b.score, 0) / ratings.length)
  }

  function getInitials(member) {
    return (member?.users?.username || member?.users?.email || '?').substring(0, 2).toUpperCase()
  }

  if (!user) return null

  return (
    <main style={{ minHeight: '100vh', background: '#080808', color: '#e8e4dc', fontFamily: 'sans-serif', display: 'flex', position: 'relative', overflow: 'hidden' }}>

      {winnerFilm?.backdrop_path && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: `url(https://image.tmdb.org/t/p/original${winnerFilm.backdrop_path})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(8,8,8,0.98) 400px, rgba(8,8,8,0.7) 70%, rgba(8,8,8,0.4))' }} />
        </div>
      )}

      {/* Sidebar */}
      <div style={{ width: '280px', flexShrink: 0, padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', letterSpacing: '0.25em', color: '#e8e4dc', marginBottom: '3rem' }}>
          CINE<span style={{ color: '#c8a96e' }}>MATCH</span>
        </div>

        {winnerFilm?.poster_path && (
          <div style={{ marginBottom: '2rem' }}>
            <img src={`https://image.tmdb.org/t/p/w300${winnerFilm.poster_path}`} style={{ width: '100%', borderRadius: '10px', opacity: 0.8 }} />
          </div>
        )}

        <div style={{ marginTop: 'auto' }}>
          <div style={{ fontSize: '11px', color: '#444', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Bewertungen</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {members.map((member, i) => {
              const hasRated = ratings.some(r => r.user_id === member.user_id)
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: hasRated ? 'rgba(200,169,110,0.15)' : '#111', border: `1px solid ${hasRated ? '#c8a96e' : '#222'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: hasRated ? '#c8a96e' : '#444', flexShrink: 0 }}>
                    {getInitials(member)}
                  </div>
                  <div style={{ fontSize: '13px', color: hasRated ? '#e8e4dc' : '#444' }}>
                    {member.users?.username || member.users?.email}
                  </div>
                  {hasRated && <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#c8a96e' }}>✓</div>}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: '3rem 2.5rem', position: 'relative', zIndex: 1 }}>
        {!winnerFilm ? (
          <div style={{ paddingTop: '3rem' }}>
            <div style={{ fontSize: '13px', color: '#555', marginBottom: '1rem' }}>Noch kein Film dieser Woche</div>
            <a href="/screening-room" style={{ color: '#c8a96e', fontSize: '14px', textDecoration: 'none' }}>→ Zum Screening Room</a>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '11px', color: '#c8a96e', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>
              Stimmungsbarometer
            </div>
            <div style={{ fontSize: '52px', fontWeight: '600', lineHeight: 1.05, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
              {winnerFilm.title}
            </div>
            <div style={{ fontSize: '16px', color: '#666', marginBottom: '3rem' }}>
              {[winnerFilm.genre?.split(',')[0], winnerFilm.year].filter(Boolean).join(' • ')}
            </div>

            {!submitted ? (
              <div style={{ maxWidth: '500px' }}>
                <div style={{ fontSize: '14px', color: '#888', marginBottom: '2rem' }}>Wie war der Film für dich?</div>
                <div style={{ fontSize: '32px', fontWeight: '500', color: '#c8a96e', marginBottom: '2rem', minHeight: '44px' }}>
                  {getMoodLabel(sliderVal)}
                </div>
                <input type="range" min="0" max="100" step="1" value={sliderVal} onChange={e => setSliderVal(parseInt(e.target.value))} style={{ width: '100%', marginBottom: '8px', accentColor: '#c8a96e' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#444', marginBottom: '2.5rem' }}>
                  <span>Zeitverschwendung</span>
                  <span>Meisterwerk</span>
                </div>
                <button onClick={submitRating} style={{ background: 'rgba(200,169,110,0.1)', border: '1px solid rgba(200,169,110,0.4)', borderRadius: '8px', color: '#c8a96e', padding: '12px 32px', fontSize: '14px', cursor: 'pointer' }}>
                  Bewertung abgeben
                </button>
              </div>
            ) : (
              <div style={{ maxWidth: '500px' }}>
                <div style={{ fontSize: '13px', color: '#555', marginBottom: '8px' }}>Deine Bewertung</div>
                <div style={{ fontSize: '32px', fontWeight: '500', color: '#c8a96e', marginBottom: '3rem' }}>{getMoodLabel(myRating)}</div>

                {ratings.length > 0 && (
                  <>
                    <div style={{ width: '40px', height: '1px', background: '#222', marginBottom: '2rem' }} />
                    <div style={{ fontSize: '11px', color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                      Gruppen-Stimmung — {ratings.length} {ratings.length === 1 ? 'Bewertung' : 'Bewertungen'}
                    </div>
                    <div style={{ fontSize: '40px', fontWeight: '500', color: '#e8e4dc', marginBottom: '4px' }}>
                      {getMoodLabel(getAverage())}
                    </div>
                    <div style={{ fontSize: '13px', color: '#555', marginBottom: '2rem' }}>Ø {getAverage()}/100</div>
                    <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '48px', maxWidth: '300px' }}>
                      {Array.from({ length: 20 }, (_, i) => {
                        const bucket = i * 5
                        const count = ratings.filter(r => r.score >= bucket && r.score < bucket + 5).length
                        const max = Math.max(...Array.from({ length: 20 }, (_, j) => ratings.filter(r => r.score >= j * 5 && r.score < j * 5 + 5).length), 1)
                        return <div key={i} style={{ flex: 1, borderRadius: '2px 2px 0 0', background: '#c8a96e', height: `${Math.round(count / max * 100)}%`, opacity: count > 0 ? 0.3 + (count / max) * 0.7 : 0.08 }} />
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}