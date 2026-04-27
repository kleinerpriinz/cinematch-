'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ScreeningRoom() {
  const [user, setUser] = useState(null)
  const [group, setGroup] = useState(null)
  const [week, setWeek] = useState(null)
  const [films, setFilms] = useState([])
  const [votes, setVotes] = useState([])
  const [myVote, setMyVote] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [revealedLevels, setRevealedLevels] = useState({})

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/'
      else {
        setUser(data.user)
        loadData(data.user.id)
      }
    })
  }, [])

  useEffect(() => {
    if (!week) return
    const channel = supabase
      .channel('screening-room')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'votes',
        filter: `week_id=eq.${week.id}`
      }, () => {
        loadFilms(week.id, user.id)
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'films',
        filter: `week_id=eq.${week.id}`
      }, () => {
        loadFilms(week.id, user.id)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [week])

  async function loadData(userId) {
    const { data: memberData } = await supabase
      .from('group_members')
      .select('group_id, groups(id, name, invite_code)')
      .eq('user_id', userId)
      .single()
    if (!memberData) { window.location.href = '/dashboard'; return }
    setGroup(memberData.groups)

    const { data: weekData } = await supabase
      .from('weeks')
      .select()
      .eq('group_id', memberData.groups.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (weekData) {
      setWeek(weekData)
      loadFilms(weekData.id, userId)
    }
  }

  async function loadFilms(weekId, userId) {
    const { data: filmData } = await supabase.from('films').select().eq('week_id', weekId)
    setFilms(filmData || [])
    const { data: voteData } = await supabase.from('votes').select().eq('week_id', weekId)
    setVotes(voteData || [])
    const myV = voteData?.find(v => v.user_id === userId)
    if (myV) setMyVote(myV.film_id)
  }

  async function searchFilms() {
    if (!searchQuery.trim()) return
    setSearching(true)
    const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}&language=de-DE`)
    const data = await res.json()
    setSearchResults(data.results?.slice(0, 5) || [])
    setSearching(false)
  }

  async function startWeek() {
    const { data } = await supabase.from('weeks').insert({
      group_id: group.id,
      week_number: 1,
      phase: 'voting',
      moderator_id: user.id
    }).select().single()
    setWeek(data)
    setFilms([])
  }

  async function proposeFilm(tmdbFilm) {
    const genres = tmdbFilm.genre_ids?.join(',') || ''
    const year = tmdbFilm.release_date?.substring(0, 4)
    await supabase.from('films').insert({
      week_id: week.id,
      tmdb_id: tmdbFilm.id,
      title: tmdbFilm.title,
      year: parseInt(year),
      genre: genres,
      poster_path: tmdbFilm.poster_path,
      proposed_by: user.id
    })
    setSearchResults([])
    setSearchQuery('')
    setShowSearch(false)
    loadFilms(week.id, user.id)
  }

  async function castVote(filmId) {
    if (myVote) return
    await supabase.from('votes').insert({ week_id: week.id, film_id: filmId, user_id: user.id })
    setMyVote(filmId)
    setVotes([...votes, { film_id: filmId, user_id: user.id }])
  }

  function toggleReveal(filmId, level) {
    setRevealedLevels(prev => ({
      ...prev,
      [filmId]: Math.max(prev[filmId] || 0, level)
    }))
  }

  function getVoteCount(filmId) {
    return votes.filter(v => v.film_id === filmId).length
  }

  if (!user || !group) return null

  return (
    <main style={{ minHeight: '100vh', background: '#0e0e0f', color: '#e8e4dc', fontFamily: 'sans-serif' }}>


      <div style={{ padding: '2rem 24px', maxWidth: '800px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>Screening Room</div>
            <div style={{ fontSize: '13px', color: '#666' }}>{group.name}</div>
          </div>
          {week && (
            <button onClick={() => setShowSearch(!showSearch)} style={{ background: '#c0392b', border: 'none', borderRadius: '8px', color: '#fff', padding: '9px 16px', fontSize: '13px', cursor: 'pointer' }}>
              + Film vorschlagen
            </button>
          )}
        </div>

        {!week ? (
          <div style={{ background: '#181614', border: '0.5px solid #2a2820', borderRadius: '12px', padding: '1.5rem' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>Noch keine aktive Filmwoche — starte die erste!</div>
            <button onClick={startWeek} style={{ background: '#c0392b', border: 'none', borderRadius: '8px', color: '#fff', padding: '10px 16px', fontSize: '14px', cursor: 'pointer' }}>Woche starten</button>
          </div>
        ) : (
          <>
            {showSearch && (
              <div style={{ background: '#181614', border: '0.5px solid #2a2820', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchFilms()}
                    placeholder="Filmtitel suchen..."
                    style={{ flex: 1, padding: '9px 12px', background: '#0e0e0f', border: '0.5px solid #2a2820', borderRadius: '8px', color: '#e8e4dc', fontSize: '14px', outline: 'none' }}
                  />
                  <button onClick={searchFilms} disabled={searching} style={{ background: '#c0392b', border: 'none', borderRadius: '8px', color: '#fff', padding: '9px 16px', fontSize: '14px', cursor: 'pointer' }}>
                    {searching ? '...' : 'Suchen'}
                  </button>
                </div>
                {searchResults.map(film => (
                  <div key={film.id} onClick={() => proposeFilm(film)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', borderRadius: '8px', cursor: 'pointer', marginBottom: '4px', background: '#0e0e0f' }}>
                    {film.poster_path && <img src={`https://image.tmdb.org/t/p/w45${film.poster_path}`} style={{ width: '32px', borderRadius: '4px' }} />}
                    <div>
                      <div style={{ fontSize: '13px' }}>{film.title}</div>
                      <div style={{ fontSize: '11px', color: '#666' }}>{film.release_date?.substring(0, 4)}</div>
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#c0392b' }}>+ Vorschlagen</div>
                  </div>
                ))}
              </div>
            )}

            {films.length === 0 ? (
              <div style={{ fontSize: '14px', color: '#666' }}>Noch keine Filme vorgeschlagen — leg los!</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                {films.map(film => {
                  const revealed = revealedLevels[film.id] || 0
                  const voteCount = getVoteCount(film.id)
                  const hasVoted = myVote === film.id
                  return (
                    <div key={film.id} style={{ background: '#181614', border: `1.5px solid ${hasVoted ? '#c0392b' : '#2a2820'}`, borderRadius: '12px', overflow: 'hidden' }}>
                      {film.poster_path && (
                        <img src={`https://image.tmdb.org/t/p/w300${film.poster_path}`} style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
                      )}
                      <div style={{ padding: '12px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>{film.title}</div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>{film.year}</div>

                        <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
                          {[1, 2, 3].map(level => (
                            <div key={level} style={{ height: '3px', flex: 1, borderRadius: '2px', background: revealed >= level ? '#c0392b' : '#2a2820', cursor: 'pointer' }} onClick={() => toggleReveal(film.id, level)} />
                          ))}
                        </div>

                        {revealed >= 1 && <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Jahr: {film.year}</div>}
                        {revealed >= 2 && <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>TMDB ID: {film.tmdb_id}</div>}
                        {revealed >= 3 && <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Vollständige Infos auf TMDB</div>}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                          <div style={{ fontSize: '12px', color: '#666' }}>{voteCount} {voteCount === 1 ? 'Vote' : 'Votes'}</div>
                          <button
                            onClick={() => castVote(film.id)}
                            disabled={!!myVote}
                            style={{ background: hasVoted ? '#c0392b' : '#0e0e0f', border: `0.5px solid ${hasVoted ? '#c0392b' : '#2a2820'}`, borderRadius: '6px', color: hasVoted ? '#fff' : '#888', padding: '5px 12px', fontSize: '12px', cursor: myVote ? 'default' : 'pointer' }}
                          >
                            {hasVoted ? 'Gewählt' : 'Abstimmen'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}