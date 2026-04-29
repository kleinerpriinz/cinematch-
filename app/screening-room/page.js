'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ScreeningRoom() {
  const [user, setUser] = useState(null)
  const [group, setGroup] = useState(null)
  const [week, setWeek] = useState(null)
  const [films, setFilms] = useState([])
  const [votes, setVotes] = useState([])
  const [members, setMembers] = useState([])
  const [myVote, setMyVote] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [revealedLevels, setRevealedLevels] = useState({})
  const [revealed, setRevealed] = useState(false)
  const [winnerFilm, setWinnerFilm] = useState(null)
  const [noGroup, setNoGroup] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [groupName, setGroupName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [ratingSlider, setRatingSlider] = useState(50)
  const [ratingSubmitted, setRatingSubmitted] = useState(false)
  const [myRatingScore, setMyRatingScore] = useState(null)
  const [hoveredFilm, setHoveredFilm] = useState(null)
  const [bgFilm, setBgFilm] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/'
      else { setUser(data.user); loadData(data.user.id) }
    })
  }, [])

  useEffect(() => {
    if (!week || !user) return
    const channel = supabase.channel('screening-room')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `week_id=eq.${week.id}` }, () => loadFilms(week.id, user.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'films', filter: `week_id=eq.${week.id}` }, () => loadFilms(week.id, user.id))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [week])

  useEffect(() => {
    if (hoveredFilm) {
      const film = films.find(f => f.id === hoveredFilm)
      if (film?.backdrop_path) setBgFilm(film)
    }
  }, [hoveredFilm])

  async function loadData(userId) {
    const { data: memberData } = await supabase.from('group_members').select('group_id, groups(id, name, invite_code)').eq('user_id', userId).single()
    if (!memberData) { setNoGroup(true); return }
    setGroup(memberData.groups)
    const { data: membersData } = await supabase.from('group_members').select('user_id, users(username, email, avatar_url)').eq('group_id', memberData.groups.id)
    setMembers(membersData || [])
    const { data: weekData } = await supabase.from('weeks').select().eq('group_id', memberData.groups.id).order('created_at', { ascending: false }).limit(1).single()
    if (weekData) {
      setWeek(weekData)
      loadFilms(weekData.id, userId)
      if (weekData.phase === 'review' && weekData.winner_film_id) {
        const { data: wf } = await supabase.from('films').select().eq('id', weekData.winner_film_id).single()
        setWinnerFilm(wf); setRevealed(true)
      }
    }
  }

  async function loadFilms(weekId, userId) {
    const { data: filmData } = await supabase.from('films').select().eq('week_id', weekId)
    setFilms(filmData || [])
    const { data: voteData } = await supabase.from('votes').select().eq('week_id', weekId)
    setVotes(voteData || [])
    const mine = voteData?.find(v => v.user_id === userId)
    if (mine) setMyVote(mine.film_id)
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
    const { data: allMembers } = await supabase.from('group_members').select('user_id').eq('group_id', group.id)
    const { data: lastWeeks } = await supabase.from('weeks').select('moderator_id').eq('group_id', group.id).order('created_at', { ascending: false }).limit(10)
    const usedMods = lastWeeks?.map(w => w.moderator_id) || []
    let nextMod = allMembers?.find(m => !usedMods.includes(m.user_id))
    if (!nextMod) nextMod = allMembers?.[0]
    const weekNum = (lastWeeks?.length || 0) + 1
    const { data } = await supabase.from('weeks').insert({ group_id: group.id, week_number: weekNum, phase: 'voting', moderator_id: nextMod?.user_id || user.id }).select().single()
    setWeek(data); setFilms([]); setRevealed(false); setWinnerFilm(null); setBgFilm(null)
  }

  async function proposeFilm(tmdbFilm) {
    const year = tmdbFilm.release_date?.substring(0, 4)
    const details = await fetch(`https://api.themoviedb.org/3/movie/${tmdbFilm.id}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&language=de-DE&append_to_response=credits,watch/providers`).then(r => r.json())
    const director = details.credits?.crew?.find(c => c.job === 'Director')?.name || ''
    const genre = details.genres?.map(g => g.name).join(', ') || ''
    const runtime = details.runtime || null
    const providers = details['watch/providers']?.results?.DE?.flatrate?.map(p => p.provider_name).join(', ') || ''
    await supabase.from('films').insert({ week_id: week.id, tmdb_id: tmdbFilm.id, title: tmdbFilm.title, year: parseInt(year), genre, director, poster_path: tmdbFilm.poster_path, backdrop_path: tmdbFilm.backdrop_path || '', proposed_by: user.id, streaming_providers: providers })
    setSearchResults([]); setSearchQuery(''); setShowSearch(false)
    loadFilms(week.id, user.id)
  }

  async function castVote(filmId) {
    if (myVote) return
    await supabase.from('votes').insert({ week_id: week.id, film_id: filmId, user_id: user.id })
    setMyVote(filmId)
    setVotes([...votes, { film_id: filmId, user_id: user.id }])
  }

  async function closeWeek() {
    const counts = {}
    votes.forEach(v => counts[v.film_id] = (counts[v.film_id] || 0) + 1)
    if (!Object.keys(counts).length) return
    const winnerId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    await supabase.from('weeks').update({ phase: 'review', winner_film_id: winnerId }).eq('id', week.id)
    const wf = films.find(f => f.id === winnerId)
    setWinnerFilm(wf)
    setTimeout(() => setRevealed(true), 100)
    setWeek({ ...week, phase: 'review', winner_film_id: winnerId })
  }

  async function submitRating() {
    await supabase.from('ratings').insert({ week_id: week.id, user_id: user.id, score: ratingSlider })
    setMyRatingScore(ratingSlider)
    setRatingSubmitted(true)
    if (week.moderator_id) {
      const points = Math.round(ratingSlider / 10)
      const { data: modMember } = await supabase.from('group_members').select('cine_points').eq('user_id', week.moderator_id).eq('group_id', group.id).single()
      if (modMember) await supabase.from('group_members').update({ cine_points: (modMember.cine_points || 0) + points }).eq('user_id', week.moderator_id).eq('group_id', group.id)
    }
    setTimeout(() => { setShowRatingModal(false); setRatingSubmitted(false) }, 1500)
  }

  async function createGroup() {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data } = await supabase.from('groups').insert({ name: groupName, invite_code: code, created_by: user.id }).select().single()
    await supabase.from('group_members').insert({ group_id: data.id, user_id: user.id, is_moderator: true })
    await supabase.from('users').upsert({ id: user.id, email: user.email, username: user.email.split('@')[0] })
    setGroup(data); setNoGroup(false)
  }

  async function joinGroup() {
    const { data: groupData } = await supabase.from('groups').select().eq('invite_code', inviteCode.toUpperCase()).single()
    if (!groupData) return
    await supabase.from('group_members').insert({ group_id: groupData.id, user_id: user.id })
    setGroup(groupData); setNoGroup(false)
    loadData(user.id)
  }

  function getVoteCount(filmId) { return votes.filter(v => v.film_id === filmId).length }
  function getVoterAvatars(filmId) { return votes.filter(v => v.film_id === filmId).map(v => members.find(m => m.user_id === v.user_id)).filter(Boolean) }
  function getInitials(member) { return (member?.users?.username || member?.users?.email || '?').substring(0, 2).toUpperCase() }
  function getModerator() { return members.find(m => m.user_id === week?.moderator_id) }
  function getLeadingFilm() {
    if (!votes.length) return null
    const counts = {}
    votes.forEach(v => counts[v.film_id] = (counts[v.film_id] || 0) + 1)
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
  }

  if (!user) return null

  if (noGroup) return (
    <main style={{ minHeight: '100vh', background: '#080808', color: '#e8e4dc', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: '400px', width: '100%', padding: '2rem' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', letterSpacing: '0.25em', marginBottom: '3rem' }}>
          CINE<span style={{ color: '#c8a96e' }}>MATCH</span>
        </div>
        <div style={{ fontSize: '24px', fontWeight: '500', marginBottom: '8px' }}>Willkommen</div>
        <div style={{ fontSize: '14px', color: '#555', marginBottom: '2.5rem' }}>Erstelle eine Gruppe oder tritt einer bei.</div>
        {!showCreate ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ background: '#111', border: '0.5px solid #222', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ fontSize: '13px', color: '#888', marginBottom: '10px' }}>Invite-Code eingeben</div>
              <input value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="z.B. AB12CD" style={{ width: '100%', padding: '9px 12px', background: '#080808', border: '0.5px solid #222', borderRadius: '8px', color: '#e8e4dc', fontSize: '14px', outline: 'none', marginBottom: '10px', display: 'block' }} />
              <button onClick={joinGroup} style={{ width: '100%', background: '#c8a96e', border: 'none', borderRadius: '8px', color: '#080808', padding: '10px', fontSize: '14px', cursor: 'pointer', fontWeight: '500' }}>Beitreten</button>
            </div>
            <div style={{ textAlign: 'center', fontSize: '13px', color: '#444' }}>oder</div>
            <button onClick={() => setShowCreate(true)} style={{ background: 'none', border: '0.5px solid #222', borderRadius: '8px', color: '#666', padding: '10px', fontSize: '13px', cursor: 'pointer' }}>Neue Gruppe erstellen</button>
          </div>
        ) : (
          <div style={{ background: '#111', border: '0.5px solid #222', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ fontSize: '13px', color: '#888', marginBottom: '10px' }}>Gruppenname</div>
            <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="z.B. Filmclub Freitag" style={{ width: '100%', padding: '9px 12px', background: '#080808', border: '0.5px solid #222', borderRadius: '8px', color: '#e8e4dc', fontSize: '14px', outline: 'none', marginBottom: '10px', display: 'block' }} />
            <button onClick={createGroup} style={{ width: '100%', background: '#c8a96e', border: 'none', borderRadius: '8px', color: '#080808', padding: '10px', fontSize: '14px', cursor: 'pointer', fontWeight: '500' }}>Erstellen</button>
          </div>
        )}
      </div>
    </main>
  )

  const mod = getModerator()
  const allVoted = week && votes.length >= members.length && members.length > 0
  const leadingFilmId = getLeadingFilm()
  const activeBg = bgFilm || (films.length > 0 ? films[0] : null)

  const moderatorWeekPoints = members.find(m => m.user_id === week?.moderator_id)?.cine_points || 0
  
  return (
    <main style={{ minHeight: '100vh', background: '#080808', color: '#e8e4dc', fontFamily: 'sans-serif', display: 'flex', position: 'relative', overflow: 'hidden' }}>

      {/* Dynamic Background */}
      {!revealed && activeBg?.backdrop_path && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, transition: 'opacity 0.8s ease' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(https://image.tmdb.org/t/p/original${activeBg.backdrop_path})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(2px)', transform: 'scale(1.05)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,8,8,0.82)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(8,8,8,0.95) 280px, transparent)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,8,8,0.9) 0%, transparent 40%)' }} />
        </div>
      )}

      {/* Reveal Backdrop */}
      {revealed && winnerFilm?.backdrop_path && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(https://image.tmdb.org/t/p/original${winnerFilm.backdrop_path})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(8,8,8,0.97) 320px, rgba(8,8,8,0.4) 60%, rgba(8,8,8,0.2))' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,8,8,0.8) 0%, transparent 50%)' }} />
        </div>
      )}

      {/* Left Sidebar */}
      <div style={{ width: '260px', flexShrink: 0, padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', letterSpacing: '0.25em', color: '#e8e4dc', marginBottom: '3rem' }}>
          CINE<span style={{ color: '#c8a96e' }}>MATCH</span>
        </div>

        {week && mod && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', paddingBottom: '1rem', opacity: 0.3 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginLeft: '5px' }}>
                <div style={{ width: '1px', height: '1rem', background: '#333' }} />
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', border: '1px solid #444', background: '#080808' }} />
                <div style={{ width: '1px', height: '1rem', background: '#333' }} />
              </div>
              <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Nächste Woche</div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: '4px' }}>
                <div style={{ width: '1px', height: '0.5rem', background: '#c8a96e' }} />
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #c8a96e', background: '#c8a96e' }} />
                <div style={{ width: '1px', height: '100%', minHeight: '5rem', background: '#c8a96e', opacity: 0.4 }} />
              </div>
              <div style={{ background: 'rgba(200,169,110,0.07)', border: '1px solid rgba(200,169,110,0.25)', borderRadius: '12px', padding: '1.25rem', flex: 1, position: 'relative' }}>
  <div style={{ fontSize: '10px', color: '#c8a96e', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>Moderator</div>
  <div style={{ position: 'relative', width: '64px', height: '64px', marginBottom: '12px' }}>
    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#222', overflow: 'hidden', border: '2px solid rgba(200,169,110,0.3)' }}>
      {mod.users?.avatar_url
        ? <img src={mod.users.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '500', color: '#c8a96e' }}>{getInitials(mod)}</div>
      }
    </div>
    <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '22px', height: '22px', borderRadius: '50%', background: '#7B5EA7', border: '2px solid #080808', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>
      👑
    </div>
  </div>
  <div style={{ fontSize: '17px', fontWeight: '500', marginBottom: '10px' }}>{mod.users?.username || mod.users?.email}</div>
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
    <div style={{ fontSize: '18px' }}>⭐</div>
    <div>
      <div style={{ fontSize: '16px', fontWeight: '500', color: '#c8a96e' }}>+{moderatorWeekPoints}</div>
      <div style={{ fontSize: '11px', color: '#555' }}>Punkte diese Woche</div>
    </div>
  </div>
</div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', paddingTop: '1rem', opacity: 0.3 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginLeft: '5px' }}>
                <div style={{ width: '1px', height: '1rem', background: '#333' }} />
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', border: '1px solid #444', background: '#080808' }} />
              </div>
              <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Vorwoche</div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
          <div style={{ fontSize: '11px', color: '#444', marginBottom: '6px' }}>Invite-Code</div>
          <div style={{ fontSize: '15px', fontWeight: '500', color: '#c8a96e', letterSpacing: '0.15em' }}>{group?.invite_code}</div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '2rem 2.5rem', position: 'relative', zIndex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* REVEAL STATE */}
        {revealed && winnerFilm ? (
          <div style={{ maxWidth: '520px', paddingTop: '3rem' }}>
            <div style={{ fontSize: '11px', color: '#c8a96e', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>Gewählt von euch</div>
            <div style={{ fontSize: '64px', fontWeight: '600', lineHeight: 1.05, marginBottom: '1rem', letterSpacing: '-0.02em' }}>{winnerFilm.title}</div>
            <div style={{ fontSize: '16px', color: '#888', marginBottom: '2rem' }}>{[winnerFilm.genre?.split(',')[0], winnerFilm.year].filter(Boolean).join(' • ')}</div>
            <div style={{ width: '40px', height: '1px', background: '#333', marginBottom: '2rem' }} />
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '1.5rem' }}>{votes.length} von {members.length} haben abgestimmt</div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '2.5rem' }}>
              {members.map((member, i) => {
                const hasVoted = votes.some(v => v.user_id === member.user_id)
                return (
                  <div key={i} style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', background: hasVoted ? '#222' : '#111', border: `2px solid ${hasVoted ? '#c8a96e' : '#222'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: hasVoted ? '#c8a96e' : '#444', opacity: hasVoted ? 1 : 0.4 }}>
                    {member.users?.avatar_url ? <img src={member.users.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(member)}
                  </div>
                )
              })}
            </div>
            <button onClick={() => setShowRatingModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(200,169,110,0.1)', border: '1px solid rgba(200,169,110,0.4)', borderRadius: '8px', color: '#c8a96e', padding: '12px 24px', fontSize: '14px', cursor: 'pointer', marginBottom: '1rem' }}>
              ✏ Film bewerten
            </button>
            <div style={{ fontSize: '12px', color: '#444', marginBottom: '2rem' }}>🔒 Ergebnisse sichtbar wenn alle bewertet haben.</div>
            <button onClick={startWeek} style={{ background: 'none', border: '0.5px solid #333', borderRadius: '8px', color: '#555', padding: '9px 18px', fontSize: '13px', cursor: 'pointer' }}>
              Neue Woche starten
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
              {week ? (
                <>
                  <div style={{ fontSize: '13px', color: '#c8a96e', letterSpacing: '0.08em', marginBottom: '6px' }}>
                    {mod?.users?.username || 'Moderator'} hat Filme vorgeschlagen.
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '600', lineHeight: 1.1, marginBottom: '1rem' }}>Stimmt ab und entscheidet gemeinsam!</div>
                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '12px', color: '#444' }}>
                    <span>Klick = Vote</span><span>•</span><span>Pips = Details</span><span>•</span><span>Hover = Vorschau</span>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '32px', fontWeight: '600' }}>Screening Room</div>
              )}
            </div>

            {/* Search */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
              {week && (
                <button onClick={() => setShowSearch(!showSearch)} style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid #2a2a2a', borderRadius: '8px', color: '#e8e4dc', padding: '9px 18px', fontSize: '13px', cursor: 'pointer' }}>
                  + Film vorschlagen
                </button>
              )}
            </div>

            {showSearch && (
              <div style={{ background: 'rgba(17,17,17,0.95)', border: '0.5px solid #222', borderRadius: '12px', padding: '1.25rem', marginBottom: '2rem', backdropFilter: 'blur(10px)' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchFilms()} placeholder="Filmtitel suchen..." style={{ flex: 1, padding: '9px 12px', background: '#080808', border: '0.5px solid #222', borderRadius: '8px', color: '#e8e4dc', fontSize: '14px', outline: 'none' }} />
                  <button onClick={searchFilms} disabled={searching} style={{ background: '#c8a96e', border: 'none', borderRadius: '8px', color: '#080808', padding: '9px 18px', fontSize: '14px', cursor: 'pointer', fontWeight: '500' }}>
                    {searching ? '...' : 'Suchen'}
                  </button>
                </div>
                {searchResults.map(film => (
                  <div key={film.id} onClick={() => proposeFilm(film)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', borderRadius: '8px', cursor: 'pointer', marginBottom: '4px' }}>
                    {film.poster_path && <img src={`https://image.tmdb.org/t/p/w45${film.poster_path}`} style={{ width: '32px', borderRadius: '4px' }} />}
                    <div>
                      <div style={{ fontSize: '13px' }}>{film.title}</div>
                      <div style={{ fontSize: '11px', color: '#666' }}>{film.release_date?.substring(0, 4)}</div>
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#c8a96e' }}>+ Vorschlagen</div>
                  </div>
                ))}
              </div>
            )}

            {!week ? (
              <div style={{ background: 'rgba(17,17,17,0.8)', border: '0.5px solid #1a1a1a', borderRadius: '12px', padding: '2rem', maxWidth: '380px' }}>
                <div style={{ fontSize: '14px', color: '#555', marginBottom: '16px' }}>Noch keine aktive Filmwoche.</div>
                <button onClick={startWeek} style={{ background: '#c8a96e', border: 'none', borderRadius: '8px', color: '#080808', padding: '10px 20px', fontSize: '14px', cursor: 'pointer', fontWeight: '500' }}>Woche starten</button>
              </div>
            ) : films.length === 0 ? (
              <div style={{ fontSize: '14px', color: '#444' }}>Noch keine Filme vorgeschlagen.</div>
            ) : (
              <>
                {/* Film Cards */}
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '3rem' }}>
                  {films.map(film => {
                    const voteCount = getVoteCount(film.id)
                    const hasVoted = myVote === film.id
                    const voters = getVoterAvatars(film.id)
                    const rev = revealedLevels[film.id] || 0
                    const isHovered = hoveredFilm === film.id
                    const isLeading = leadingFilmId === film.id && voteCount > 0

                    return (
                      <div
                        key={film.id}
                        onClick={() => castVote(film.id)}
                        onMouseEnter={() => setHoveredFilm(film.id)}
                        onMouseLeave={() => setHoveredFilm(null)}
                        style={{
                          width: '240px',
                          borderRadius: '14px',
                          border: hasVoted ? '2px solid #c8a96e' : isLeading ? '1.5px solid rgba(200,169,110,0.4)' : isHovered ? '1px solid #333' : '1px solid #1a1a1a',
                          overflow: 'hidden',
                          cursor: myVote && !hasVoted ? 'default' : 'pointer',
                          background: 'rgba(14,14,14,0.9)',
                          transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                          transition: 'transform 0.2s ease, border-color 0.2s ease',
                          boxShadow: hasVoted ? '0 0 24px rgba(200,169,110,0.15)' : isHovered ? '0 8px 32px rgba(0,0,0,0.4)' : 'none'
                        }}
                      >
                        <div style={{ position: 'relative' }}>
                          {film.poster_path ? (
                            <img src={`https://image.tmdb.org/t/p/w342${film.poster_path}`} style={{ width: '100%', height: '340px', objectFit: 'cover', display: 'block' }} />
                          ) : (
                            <div style={{ width: '100%', height: '340px', background: '#1a1a1a' }} />
                          )}
                          {isLeading && (
                            <div style={{ position: 'absolute', top: '10px', left: '10px', background: '#c8a96e', color: '#080808', fontSize: '10px', fontWeight: '600', padding: '3px 8px', borderRadius: '4px', letterSpacing: '0.05em' }}>
                              VORNE
                            </div>
                          )}
                          {hasVoted && (
                            <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(200,169,110,0.9)', color: '#080808', fontSize: '10px', fontWeight: '600', padding: '3px 8px', borderRadius: '4px' }}>
                              ✓ Dein Vote
                            </div>
                          )}
                        </div>

                        <div style={{ padding: '14px' }}>
                          <div style={{ fontSize: '15px', fontWeight: '500', marginBottom: '4px', lineHeight: 1.3 }}>{film.title}</div>
                          <div style={{ fontSize: '12px', color: '#555', marginBottom: '10px' }}>
                            {[film.genre?.split(',')[0], film.year].filter(Boolean).join(' • ')}
                          </div>

                          <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
                            {[1, 2, 3].map(level => (
                              <div key={level} onClick={e => { e.stopPropagation(); setRevealedLevels(prev => ({ ...prev, [film.id]: Math.max(prev[film.id] || 0, level) })) }} style={{ height: '2px', flex: 1, borderRadius: '1px', background: rev >= level ? '#c8a96e' : '#2a2a2a', cursor: 'pointer' }} />
                            ))}
                          </div>

                          {rev >= 2 && film.director && <div style={{ fontSize: '11px', color: '#777', marginBottom: '3px' }}>Regie: {film.director}</div>}
                          {rev >= 3 && film.genre && <div style={{ fontSize: '11px', color: '#777', marginBottom: '6px' }}>{film.genre}</div>}

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                            <div style={{ fontSize: '14px', color: '#c8a96e', fontWeight: '500' }}>
                              {voteCount} {voteCount === 1 ? 'Stimme' : 'Stimmen'}
                            </div>
                            {film.streaming_providers && (
                              <div style={{ fontSize: '10px', color: '#555' }}>▶ {film.streaming_providers.split(',')[0]}</div>
                            )}
                          </div>

                          {voters.length > 0 && (
                            <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                              {voters.slice(0, 5).map((voter, i) => (
                                <div key={i} style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#222', border: '1.5px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#888', overflow: 'hidden' }}>
                                  {voter.users?.avatar_url ? <img src={voter.users.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(voter)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Vote Progress */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
                  <div style={{ fontSize: '13px', color: '#555' }}>{votes.length} von {members.length} haben abgestimmt</div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {members.map((member, i) => {
                      const hasVoted = votes.some(v => v.user_id === member.user_id)
                      return (
                        <div key={i} style={{ width: '20px', height: '20px', borderRadius: '50%', overflow: 'hidden', background: '#222', border: `1.5px solid ${hasVoted ? '#c8a96e' : '#222'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px', color: '#888', opacity: hasVoted ? 1 : 0.3 }}>
                          {member.users?.avatar_url ? <img src={member.users.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(member)}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Primary CTA */}
                {myVote && (
                  <div style={{ maxWidth: '500px' }}>
                    <button
                      onClick={closeWeek}
                      style={{
                        width: '100%', padding: '18px',
                        background: 'rgba(200,169,110,0.1)',
                        border: '1px solid rgba(200,169,110,0.5)',
                        borderRadius: '12px', color: '#c8a96e',
                        fontSize: '16px', fontWeight: '500',
                        cursor: 'pointer', letterSpacing: '0.05em',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={e => e.target.style.background = 'rgba(200,169,110,0.18)'}
                      onMouseLeave={e => e.target.style.background = 'rgba(200,169,110,0.1)'}
                    >
                      ✦ Ergebnis aufdecken
                    </button>
                    {!allVoted && (
                      <div style={{ textAlign: 'center', fontSize: '12px', color: '#444', marginTop: '8px' }}>
                        Noch nicht alle haben abgestimmt — du kannst trotzdem aufdecken
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Rating Modal */}
      {showRatingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#111', border: '0.5px solid #222', borderRadius: '16px', padding: '2.5rem', width: '100%', maxWidth: '520px', position: 'relative' }}>
            <button onClick={() => setShowRatingModal(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', color: '#555', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            {!ratingSubmitted ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Wie fandest DU</div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: '36px', fontWeight: '600', color: '#e8e4dc', marginBottom: '12px' }}>{winnerFilm?.title}?</div>
                  <div style={{ fontSize: '14px', color: '#555' }}>Bewege den Slider und logge deine Meinung.</div>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <input type="range" min="0" max="100" step="1" value={ratingSlider} onChange={e => setRatingSlider(parseInt(e.target.value))} style={{ width: '100%', height: '4px', appearance: 'none', background: `linear-gradient(to right, #c0392b 0%, #c8a96e ${ratingSlider}%, #333 ${ratingSlider}%)`, borderRadius: '2px', outline: 'none', cursor: 'pointer' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#444', marginTop: '8px' }}>
                    <span>Schlecht</span><span>Exzellent</span>
                  </div>
                </div>
                <button onClick={submitRating} style={{ width: '100%', padding: '14px', background: 'rgba(200,169,110,0.08)', border: '1px solid rgba(200,169,110,0.4)', borderRadius: '10px', color: '#c8a96e', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '1rem' }}>
                  ✦ Bewertung speichern
                </button>
                <div style={{ textAlign: 'center', fontSize: '12px', color: '#444' }}>
                  🔒 Ergebnisse sichtbar wenn alle bewertet haben.
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <div style={{ fontSize: '32px', color: '#c8a96e', marginBottom: '1rem' }}>✦</div>
                <div style={{ fontSize: '18px', color: '#e8e4dc' }}>Bewertung gespeichert</div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}