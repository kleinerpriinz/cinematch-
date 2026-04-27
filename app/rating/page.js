'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const MOOD_LABELS = [
  'Zeitverschwendung', 'Öde', 'Mäßig', 'Ok', 'Interessant',
  'Gut', 'Stark', 'Sehr stark', 'Meisterwerk'
]

export default function Rating() {
  const [user, setUser] = useState(null)
  const [week, setWeek] = useState(null)
  const [winnerFilm, setWinnerFilm] = useState(null)
  const [ratings, setRatings] = useState([])
  const [myRating, setMyRating] = useState(null)
  const [sliderVal, setSliderVal] = useState(50)
  const [submitted, setSubmitted] = useState(false)
  const [group, setGroup] = useState(null)

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

    const { data: weekData } = await supabase
      .from('weeks')
      .select()
      .eq('group_id', memberData.groups.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (!weekData) return
    setWeek(weekData)

    if (weekData.winner_film_id) {
      const { data: filmData } = await supabase
        .from('films')
        .select()
        .eq('id', weekData.winner_film_id)
        .single()
      setWinnerFilm(filmData)
    } else {
      const { data: votes } = await supabase
        .from('votes')
        .select('film_id')
        .eq('week_id', weekData.id)
      if (votes?.length) {
        const counts = {}
        votes.forEach(v => counts[v.film_id] = (counts[v.film_id] || 0) + 1)
        const winnerId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
        const { data: filmData } = await supabase.from('films').select().eq('id', winnerId).single()
        setWinnerFilm(filmData)
      }
    }

    const { data: ratingData } = await supabase
      .from('ratings')
      .select()
      .eq('week_id', weekData.id)
    setRatings(ratingData || [])

    const mine = ratingData?.find(r => r.user_id === userId)
    if (mine) { setMyRating(mine.score); setSubmitted(true); setSliderVal(mine.score) }
  }

  async function submitRating() {
    await supabase.from('ratings').insert({
      week_id: week.id,
      user_id: user.id,
      score: sliderVal
    })
    setMyRating(sliderVal)
    setSubmitted(true)

    const { data: allRatings } = await supabase
      .from('ratings')
      .select()
      .eq('week_id', week.id)
    setRatings(allRatings || [])

    if (allRatings?.length >= 1 && week.moderator_id) {
      const avg = Math.round(allRatings.reduce((a, b) => a + b.score, 0) / allRatings.length)
      const points = Math.round(avg / 10)

      const { data: modMember } = await supabase
        .from('group_members')
        .select('cine_points')
        .eq('user_id', week.moderator_id)
        .eq('group_id', group.id)
        .single()

      if (modMember) {
        await supabase
          .from('group_members')
          .update({ cine_points: (modMember.cine_points || 0) + points })
          .eq('user_id', week.moderator_id)
          .eq('group_id', group.id)
      }
    }
  }

  function getMoodLabel(val) {
    const idx = Math.round(val / 100 * (MOOD_LABELS.length - 1))
    return MOOD_LABELS[idx]
  }

  function getAverage() {
    if (!ratings.length) return 0
    return Math.round(ratings.reduce((a, b) => a + b.score, 0) / ratings.length)
  }

  if (!user) return null

  return (
    <main style={{ minHeight: '100vh', background: '#0e0e0f', color: '#e8e4dc', fontFamily: 'sans-serif' }}>


      <div style={{ padding: '2rem 24px', maxWidth: '700px' }}>
        <div style={{ fontSize: '22px', marginBottom: '4px' }}>Stimmungsbarometer</div>
        <div style={{ fontSize: '13px', color: '#666', marginBottom: '2rem' }}>{group?.name}</div>

        {winnerFilm ? (
          <>
            <div style={{ background: '#181614', border: '0.5px solid #2a2820', borderRadius: '12px', overflow: 'hidden', marginBottom: '1.5rem', display: 'flex', gap: '0' }}>
              {winnerFilm.poster_path && (
                <img src={`https://image.tmdb.org/t/p/w200${winnerFilm.poster_path}`} style={{ width: '80px', objectFit: 'cover' }} />
              )}
              <div style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '11px', color: '#c0392b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Film der Woche</div>
                <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '4px' }}>{winnerFilm.title}</div>
                <div style={{ fontSize: '13px', color: '#666' }}>{winnerFilm.year}</div>
              </div>
            </div>

            {!submitted ? (
              <div style={{ background: '#181614', border: '0.5px solid #2a2820', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '14px', marginBottom: '1.5rem' }}>Wie war der Film?</div>
                <input
                  type="range" min="0" max="100" step="1"
                  value={sliderVal}
                  onChange={e => setSliderVal(parseInt(e.target.value))}
                  style={{ width: '100%', marginBottom: '8px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#555', marginBottom: '1rem' }}>
                  <span>Zeitverschwendung</span>
                  <span>Interessant</span>
                  <span>Meisterwerk</span>
                </div>
                <div style={{ textAlign: 'center', fontSize: '20px', fontWeight: '500', color: '#c0392b', marginBottom: '1.5rem' }}>
                  {getMoodLabel(sliderVal)}
                </div>
                <button onClick={submitRating} style={{ width: '100%', background: '#c0392b', border: 'none', borderRadius: '8px', color: '#fff', padding: '11px', fontSize: '14px', cursor: 'pointer' }}>
                  Bewertung abgeben
                </button>
              </div>
            ) : (
              <div style={{ background: '#181614', border: '0.5px solid #2a2820', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>Deine Bewertung</div>
                <div style={{ fontSize: '24px', fontWeight: '500', color: '#c0392b', marginBottom: '4px' }}>{getMoodLabel(myRating)}</div>
                <div style={{ fontSize: '13px', color: '#555' }}>Score: {myRating}/100</div>
              </div>
            )}

            {ratings.length > 0 && (
              <div style={{ background: '#181614', border: '0.5px solid #2a2820', borderRadius: '12px', padding: '1.5rem' }}>
                <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                  Gruppen-Stimmung — {ratings.length} {ratings.length === 1 ? 'Bewertung' : 'Bewertungen'}
                </div>
                <div style={{ fontSize: '28px', fontWeight: '500', color: '#e8e4dc', marginBottom: '4px' }}>
                  {getMoodLabel(getAverage())}
                </div>
                <div style={{ fontSize: '13px', color: '#555', marginBottom: '16px' }}>Ø {getAverage()}/100</div>
                <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '48px' }}>
                  {Array.from({ length: 20 }, (_, i) => {
                    const bucket = i * 5
                    const count = ratings.filter(r => r.score >= bucket && r.score < bucket + 5).length
                    const max = Math.max(...Array.from({ length: 20 }, (_, j) => ratings.filter(r => r.score >= j * 5 && r.score < j * 5 + 5).length), 1)
                    return (
                      <div key={i} style={{ flex: 1, borderRadius: '2px 2px 0 0', background: '#c0392b', height: `${Math.round(count / max * 100)}%`, opacity: count > 0 ? 0.3 + (count / max) * 0.7 : 0.1 }} />
                    )
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#444', marginTop: '4px' }}>
                  <span>Zeitverschwendung</span>
                  <span>Meisterwerk</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ background: '#181614', border: '0.5px solid #2a2820', borderRadius: '12px', padding: '1.5rem' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>Noch kein Film dieser Woche — erst abstimmen im Screening Room.</div>
            <a href="/screening-room" style={{ display: 'inline-block', marginTop: '12px', background: '#c0392b', borderRadius: '8px', color: '#fff', padding: '9px 16px', fontSize: '13px', textDecoration: 'none' }}>Zum Screening Room</a>
          </div>
        )}
      </div>
    </main>
  )
}