import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../context/SocketContext'
import { useGame } from '../context/GameContext'
import headerVideo from '../assets/55a20eb284034c0590c8dec3ed78660a (1).webm'
import doodlzCharacters from '../assets/doodlz_characters.png'

const randomSeed = () => Math.random().toString(36).substring(2, 10)
const avatarUrl = seed =>
  `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`

const howToPlaySteps = [
  {
    title: '1. TIME TO DRAW',
    desc: "You're gonna receive a bizarre sentence to draw.",
    icon: 'draw',
    color: '#000000'
  },
  {
    title: '2. GUESS THE ART',
    desc: "Type your guesses as fast as you can to earn maximum points!",
    icon: 'psychology',
    color: '#000000'
  },
  {
    title: '3. SEE WHAT HAPPENED',
    desc: "Watch the hilarious results of this Doodlz game.",
    icon: 'auto_awesome',
    color: '#000000'
  }
]

// Neo-brutalist input/select styles
const neoLabel = { display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#555555', marginBottom: 5, fontWeight: 800 }
const neoLabelCompact = { display: 'inline-block', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#000000', fontWeight: 800, margin: 0 }
const neoSelect = { width: '100%', border: '3px solid #000000', background: '#ffffff', color: '#000000', borderRadius: 4, padding: '8px 10px', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13, outline: 'none', cursor: 'pointer', boxShadow: 'inset 0 0 0 2px #ffffff, 3px 3px 0px #000000' }
const neoSelectCompact = { width: '160px', border: '3px solid #000000', background: '#ffffff', color: '#000000', borderRadius: 4, padding: '4px 8px', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12, outline: 'none', cursor: 'pointer', boxShadow: 'inset 0 0 0 1px #ffffff, 2px 2px 0px #000000' }
const neoInput = { width: '100%', border: '3px solid #000000', background: '#ffffff', color: '#000000', borderRadius: 4, padding: '8px 10px', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, outline: 'none', boxShadow: 'inset 0 0 0 2px #ffffff, 3px 3px 0px #000000', boxSizing: 'border-box' }

// Chunky button press handler
const pressDown = (e) => { e.currentTarget.style.boxShadow = '1px 1px 0px #000'; e.currentTarget.style.transform = 'translate(3px, 3px)'; }
const pressUp = (e) => { e.currentTarget.style.boxShadow = '4px 4px 0px #000'; e.currentTarget.style.transform = 'translate(0, 0)'; }

export default function HomePage() {
  const navigate = useNavigate()
  const { socket, connected } = useSocket()
  const { room, myPlayer } = useGame()

  const [activeTab, setActiveTab] = useState('anonymous')
  const [playerName, setPlayerName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState('')
  const [avatarSeed, setAvatarSeed] = useState(randomSeed)
  const [isSpectator, setIsSpectator] = useState(false)
  const [howToPlayStep, setHowToPlayStep] = useState(0)
  const [isHoveringHelp, setIsHoveringHelp] = useState(false)
  const [iconAnimKey, setIconAnimKey] = useState(0)

  // Room settings (integrated from CreateRoomPage)
  const [maxPlayers, setMaxPlayers] = useState(8)
  const [rounds, setRounds] = useState(3)
  const [drawTime, setDrawTime] = useState(80)
  const [wordCount, setWordCount] = useState(3)
  const [wordMode, setWordMode] = useState('standard')
  const [language, setLanguage] = useState('English')
  const [gameMode, setGameMode] = useState('Normal')
  const [hints, setHints] = useState(2)
  const [customWords, setCustomWords] = useState('')

  // Navigate once room state is set by GameContext
  useEffect(() => {
    if (room && myPlayer) {
      setLoading('')
      navigate(`/game/${room.roomId}`)
    }
  }, [room, myPlayer, navigate])

  const validate = () => {
    if (!playerName.trim()) { alert('Enter your artist name first!'); return false }
    return true
  }

  const handleCreateRoom = (isInvite = false) => {
    if (!validate()) return
    setLoading('create')
    if (isInvite) {
      sessionStorage.setItem('copy_invite', 'true')
    }
    socket.emit('create_room', {
      playerName: playerName.trim(),
      avatarSeed,
      settings: { maxPlayers, rounds, drawTime, wordCount, wordMode, language, gameMode, hints, customWords, isPublic: false },
    })
  }

  const handleJoin = () => {
    if (!validate()) return
    if (!joinCode.trim()) { alert('Enter a room code!'); return }
    setLoading('join')
    socket.emit('join_room', { roomId: joinCode.trim().toUpperCase(), playerName: playerName.trim(), avatarSeed, isSpectator })
  }

  const handleNextStep = () => {
    setHowToPlayStep((prev) => (prev + 1) % howToPlaySteps.length)
    setIconAnimKey(k => k + 1)
  }

  const handlePrevStep = () => {
    setHowToPlayStep((prev) => (prev - 1 + howToPlaySteps.length) % howToPlaySteps.length)
    setIconAnimKey(k => k + 1)
  }

  // Auto-advance carousel every 3s, pause when hovering
  useEffect(() => {
    if (isHoveringHelp) return
    const timer = setInterval(() => {
      setHowToPlayStep(prev => (prev + 1) % howToPlaySteps.length)
      setIconAnimKey(k => k + 1)
    }, 3000)
    return () => clearInterval(timer)
  }, [isHoveringHelp])

  return (
    <div className="page-wrapper" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      {/* Header Area */}
      <div style={{ textAlign: 'left', padding: '0 20px 0', position: 'relative', width: '100%', flexShrink: 0 }}>
        {/* Connection Status (Top Right) */}
        <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#00FA9A' : '#aaa', display: 'inline-block', border: '1px solid rgba(0,0,0,0.2)' }} />
          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'rgba(255, 255, 255, 0.75)', fontWeight: 600 }}>
            {connected ? 'ONLINE' : 'CONNECTING…'}
          </span>
        </div>

        {/* Video Wrapper for centering the vignette blob */}
        <div style={{ position: 'relative', display: 'inline-block', flexShrink: 0, marginTop: '-20px', marginLeft: '-10px', marginBottom: '-25px' }}>

          <video
            src={headerVideo}
            autoPlay
            loop
            muted
            playsInline
            style={{
              height: '210px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 5px 10px rgba(0,0,0,0.5))',
              left: '22px',
              display: 'block',
              position: 'relative',
              zIndex: 2,
            }}
          />
        </div>
      </div>

      {/* Main Dual-Panel Area */}
      <main style={{
        flex: 1,
        padding: '0 20px 20px',
        maxWidth: 900,
        margin: activeTab === 'anonymous' ? '-15px auto 0' : '-95px auto 0',
        width: '100%',
        gap: '20px',
        position: 'relative',
        zIndex: 10,
        transition: 'margin-top 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>

        {/* Swapping Container */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: activeTab === 'anonymous' ? 310 : 390,
          transition: 'height 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>

          {/* Panel 1: Forms & Settings */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 'calc(50% - 20px)',
            height: '100%',
            transform: activeTab === 'anonymous' ? 'translateX(0)' : 'translateX(calc(100% + 40px))',
            transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: activeTab === 'anonymous' ? 2 : 1
          }}>
            <div className="folder-tabs-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* Tabs Header */}
              <div className="folder-tabs-header">
                <div className={`folder-tab ${activeTab === 'anonymous' ? 'active' : ''}`} onClick={() => setActiveTab('anonymous')}>ANONYMOUS</div>
                <div className={`folder-tab ${activeTab === 'createRoom' ? 'active' : ''}`} onClick={() => setActiveTab('createRoom')}>CREATE ROOM</div>
              </div>

              {/* Panel Content */}
              <div className="folder-content" style={{ justifyContent: 'space-evenly', flex: 1, minHeight: 0, overflowY: 'auto', padding: activeTab === 'createRoom' ? '12px 20px' : '8px 20px', gap: activeTab === 'createRoom' ? 0 : undefined }}>

                {activeTab === 'anonymous' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, gap: 8, padding: '2px 0' }}>
                    {/* Stacked Avatar & Inputs Area */}
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      {/* Avatar (Left) */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <div style={{ position: 'relative' }}>
                          <img src={avatarUrl(avatarSeed)} alt="Your avatar"
                            style={{ width: 100, height: 100, borderRadius: '50%', border: '3px solid #000000', boxShadow: 'inset 0 0 0 1.5px #ffffff, 3px 3px 0px #000000', background: 'var(--secondary-container)' }}
                          />
                          <button
                            onClick={() => setAvatarSeed(randomSeed())}
                            title="Get a new avatar!"
                            style={{
                              position: 'absolute', bottom: 2, right: 2,
                              width: 32, height: 32, borderRadius: '50%',
                              background: '#ffffff', border: '2px solid #000000',
                              boxShadow: 'inset 0 0 0 1px #ffffff, 1.5px 1.5px 0px #000000', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'transform 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1) rotate(0deg)'}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#000000', fontWeight: 'bold' }}>refresh</span>
                          </button>
                        </div>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 10, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Choose a character
                        </span>
                      </div>

                      {/* Name & Code Inputs stacked (Right) */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div>
                          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 11, marginBottom: 4, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Nickname
                          </p>
                          <input
                            className="input"
                            placeholder="e.g. sachinsingh"
                            value={playerName}
                            onChange={e => setPlayerName(e.target.value)}
                            maxLength={20}
                            onKeyDown={e => e.key === 'Enter' && handleJoin()}
                            style={{ fontSize: 12, fontWeight: 700, padding: '6px 10px', background: '#ffffff', border: '3px solid #000000', boxShadow: 'inset 0 0 0 1.5px #ffffff, 2.5px 2.5px 0px #000000', width: 170, boxSizing: 'border-box', color: '#000000' }}
                          />
                        </div>

                        <div>
                          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 11, marginBottom: 4, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>meeting_room</span>
                            Enter Room Code
                          </p>
                          <input className="input"
                            placeholder="ENTER CODE"
                            value={joinCode}
                            onChange={e => setJoinCode(e.target.value.toUpperCase())}
                            maxLength={8}
                            onKeyDown={e => e.key === 'Enter' && handleJoin()}
                            style={{ letterSpacing: '0.1em', fontWeight: 800, fontSize: 12, textAlign: 'center', padding: '6px', background: '#ffffff', border: '3px solid #000000', boxShadow: 'inset 0 0 0 1.5px #ffffff, 2.5px 2.5px 0px #000000', boxSizing: 'border-box', color: '#000000', width: 170 }}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <input
                            type="checkbox"
                            id="spectator-join"
                            checked={isSpectator}
                            onChange={e => setIsSpectator(e.target.checked)}
                            style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--primary)' }}
                          />
                          <label htmlFor="spectator-join" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 11, color: '#000000', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Join as Spectator
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Join Button (Bottom) */}
                    <button className="btn" style={{ width: '100%', fontSize: 14, padding: '8px 0', marginTop: 6, borderRadius: 6, background: '#a78bfa', color: '#000000', border: '3px solid #000000', boxShadow: 'inset 0 0 0 1.5px #ffffff, 3px 3px 0px #000000', fontWeight: 900, transition: 'all 0.1s' }}
                      onClick={handleJoin} disabled={loading === 'join'}
                      onMouseDown={pressDown} onMouseUp={pressUp} onMouseLeave={pressUp}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18, marginRight: 6, marginBottom: -6, verticalAlign: 'middle' }}>login</span>
                      {loading === 'join' ? 'JOINING…' : 'JOIN ROOM'}
                    </button>
                  </div>
                ) : (
                  /* Create Room Tab Content */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '2px 0' }}>
                    {/* Avatar & Nickname Selection */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                      {/* Avatar */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <img src={avatarUrl(avatarSeed)} alt="Your avatar"
                          style={{ width: 72, height: 72, borderRadius: '50%', border: '3px solid #000000', boxShadow: 'inset 0 0 0 1.5px #ffffff, 2.5px 2.5px 0px #000000', background: 'var(--secondary-container)' }}
                        />
                        <button
                          onClick={() => setAvatarSeed(randomSeed())}
                          title="Get a new avatar!"
                          style={{
                            position: 'absolute', bottom: -2, right: -2,
                            width: 26, height: 26, borderRadius: '50%',
                            background: '#ffffff', border: '2px solid #000000',
                            boxShadow: 'inset 0 0 0 1px #ffffff, 1.5px 1.5px 0px #000000', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'transform 0.2s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1) rotate(0deg)'}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#000000', fontWeight: 'bold' }}>refresh</span>
                        </button>
                      </div>

                      {/* Name Input */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 11, marginBottom: 2, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Nickname
                        </p>
                        <input
                          className="input"
                          placeholder="e.g. sachinsingh"
                          value={playerName}
                          onChange={e => setPlayerName(e.target.value)}
                          maxLength={20}
                          onKeyDown={e => e.key === 'Enter' && handleCreateRoom(false)}
                          style={{ fontSize: 13, fontWeight: 700, padding: '6px 8px', background: '#ffffff', border: '3px solid #000000', boxShadow: 'inset 0 0 0 1.5px #ffffff, 2.5px 2.5px 0px #000000', width: '100%', boxSizing: 'border-box', color: '#000000' }}
                        />
                      </div>
                    </div>

                    {/* Room Settings Section in 2-Column Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginTop: 2 }}>
                      {/* Players */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#000000', fontWeight: 'bold' }}>groups</span>
                          <span style={{ ...neoLabelCompact, fontSize: 10 }}>Players</span>
                        </div>
                        <select value={maxPlayers} onChange={e => setMaxPlayers(+e.target.value)} style={{ ...neoSelectCompact, width: '70px', padding: '2px 4px', fontSize: 11, border: '2px solid #00', boxShadow: '1.5px 1.5px 0px #000' }}>
                          {[2, 4, 6, 8, 10, 12, 16].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>

                      {/* Language */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#000000', fontWeight: 'bold' }}>translate</span>
                          <span style={{ ...neoLabelCompact, fontSize: 10 }}>Language</span>
                        </div>
                        <select value={language} onChange={e => setLanguage(e.target.value)} style={{ ...neoSelectCompact, width: '70px', padding: '2px 4px', fontSize: 11, border: '2px solid #00', boxShadow: '1.5px 1.5px 0px #000' }}>
                          {['English', 'Spanish', 'French', 'German', 'Portuguese', 'Italian'].map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>

                      {/* Drawtime */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#000000', fontWeight: 'bold' }}>schedule</span>
                          <span style={{ ...neoLabelCompact, fontSize: 10 }}>Drawtime</span>
                        </div>
                        <select value={drawTime} onChange={e => setDrawTime(+e.target.value)} style={{ ...neoSelectCompact, width: '70px', padding: '2px 4px', fontSize: 11, border: '2px solid #00', boxShadow: '1.5px 1.5px 0px #000' }}>
                          {[15, 30, 45, 60, 80, 100, 120, 150, 180, 240].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>

                      {/* Rounds */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#000000', fontWeight: 'bold' }}>loop</span>
                          <span style={{ ...neoLabelCompact, fontSize: 10 }}>Rounds</span>
                        </div>
                        <select value={rounds} onChange={e => setRounds(+e.target.value)} style={{ ...neoSelectCompact, width: '70px', padding: '2px 4px', fontSize: 11, border: '2px solid #00', boxShadow: '1.5px 1.5px 0px #000' }}>
                          {[2, 3, 4, 5, 6, 8, 10].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>

                      {/* Word Count */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#000000', fontWeight: 'bold' }}>notes</span>
                          <span style={{ ...neoLabelCompact, fontSize: 10 }}>Word Count</span>
                        </div>
                        <select value={wordCount} onChange={e => setWordCount(+e.target.value)} style={{ ...neoSelectCompact, width: '70px', padding: '2px 4px', fontSize: 11, border: '2px solid #00', boxShadow: '1.5px 1.5px 0px #000' }}>
                          {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>

                      {/* Hints */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#000000', fontWeight: 'bold' }}>help</span>
                          <span style={{ ...neoLabelCompact, fontSize: 10 }}>Hints</span>
                        </div>
                        <select value={hints} onChange={e => setHints(+e.target.value)} style={{ ...neoSelectCompact, width: '70px', padding: '2px 4px', fontSize: 11, border: '2px solid #00', boxShadow: '1.5px 1.5px 0px #000' }}>
                          {[0, 1, 2].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Custom words title & Checkbox */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 2 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 11, color: '#000000', textTransform: 'uppercase' }}>
                        Custom words
                      </span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 9, color: '#000000', textTransform: 'uppercase' }}>
                          Use custom words only
                        </span>
                        <input
                          type="checkbox"
                          checked={wordMode === 'custom'}
                          onChange={e => setWordMode(e.target.checked ? 'custom' : 'standard')}
                          style={{ width: 14, height: 14, cursor: 'pointer' }}
                        />
                      </label>
                    </div>

                    {/* Custom words textarea */}
                    <textarea
                      placeholder="Minimum of 10 words. 1-32 characters per word. Separated by a , (comma)"
                      value={customWords}
                      onChange={e => setCustomWords(e.target.value)}
                      style={{
                        width: '100%',
                        height: 52,
                        padding: '4px 6px',
                        border: '2px solid #000000',
                        borderRadius: 4,
                        background: '#ffffff',
                        color: '#000000',
                        fontFamily: 'var(--font-body)',
                        fontWeight: 700,
                        fontSize: 11,
                        outline: 'none',
                        boxShadow: 'inset 0 0 0 1px #ffffff, 2px 2px 0px #000000',
                        boxSizing: 'border-box',
                        resize: 'none'
                      }}
                    />

                    {/* Start Room Button */}
                    <div style={{ display: 'flex', marginTop: 2 }}>
                      <button className="btn" style={{ width: '100%', fontSize: 13, padding: '5px 0', borderRadius: 6, background: '#4ade80', color: '#000000', border: '3px solid #000000', boxShadow: 'inset 0 0 0 1px #ffffff, 2px 2px 0px #000000', fontWeight: 900, transition: 'all 0.1s' }}
                        onClick={() => handleCreateRoom(false)}
                        onMouseDown={pressDown} onMouseUp={pressUp} onMouseLeave={pressUp}
                      >
                        {loading === 'create' ? 'CREATING…' : 'Start!'}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* Panel 2: How To Play + Decorative Image */}
          <div style={{
            position: 'absolute', top: 0, right: 0, width: 'calc(50% - 20px)', height: '100%',
            transform: activeTab === 'anonymous' ? 'translateX(0)' : 'translateX(calc(-100% - 40px))',
            transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 1,
            display: 'flex', flexDirection: 'column', gap: 12
          }}>
            {/* How To Play Card */}
            <div
              className="folder-content interactive-help-card"
              style={{
                flex: 1,
                marginTop: activeTab === 'anonymous' ? 46 : 125,
                padding: '8px 12px',
                transition: 'margin-top 0.5s cubic-bezier(0.4, 0, 0.2, 1), padding 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={() => setIsHoveringHelp(true)}
              onMouseLeave={() => setIsHoveringHelp(false)}
            >
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 900, color: '#000000', textAlign: 'center', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                How To Play
              </h2>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  {/* Icon emblem — animates on step change */}
                  <div key={iconAnimKey} className="icon-emblem step-change" style={{ width: 40, height: 40, borderWidth: 2.5, marginBottom: 4, boxShadow: '2px 2px 0px #000' }}>
                    <span className="material-symbols-outlined help-icon" style={{ fontSize: 20 }}>
                      {howToPlaySteps[howToPlayStep].icon}
                    </span>
                  </div>
                  <h3 key={`title-${iconAnimKey}`} className="step-text-animate"
                    style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 900, marginBottom: 1, color: '#000000' }}>
                    {howToPlaySteps[howToPlayStep].title}
                  </h3>
                  <p key={`desc-${iconAnimKey}`} className="step-text-animate"
                    style={{ color: '#555555', fontSize: 10, fontWeight: 600, maxWidth: 210, margin: '0 auto', lineHeight: 1.25 }}>
                    {howToPlaySteps[howToPlayStep].desc}
                  </p>
                </div>
              </div>

              {/* Controls + Progress Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <button className="carousel-btn" onClick={handlePrevStep} style={{ width: 24, height: 24, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#000000' }}>navigate_before</span>
                </button>

                {/* Segmented progress bar */}
                <div className="help-progress-bar" style={{ flex: 1 }}>
                  {howToPlaySteps.map((_, i) => (
                    <div
                      key={i}
                      className={`help-progress-segment ${i === howToPlayStep ? 'active' : ''}`}
                      onClick={() => { setHowToPlayStep(i); setIconAnimKey(k => k + 1) }}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </div>

                <button className="carousel-btn" onClick={handleNextStep} style={{ width: 24, height: 24, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#000000' }}>navigate_next</span>
                </button>
              </div>

              {/* Auto-play hint */}
              <p style={{ textAlign: 'center', fontSize: 8, fontFamily: 'var(--font-mono)', color: '#aaaaaa', marginTop: 1, letterSpacing: '0.05em' }}>
                {isHoveringHelp ? 'PAUSED' : 'AUTO ▶'}
              </p>
            </div>

            {/* Decorative Quote Card (like PEBLO) */}
            <div style={{
              background: '#fffce0',
              border: '4px solid #000000',
              borderRadius: 12,
              boxShadow: 'inset 0 0 0 2px #ffffff, 8px 8px 0px #000000',
              padding: activeTab === 'createRoom' ? '8px 12px' : '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: activeTab === 'createRoom' ? 10 : 8,
              position: 'relative',
            }}>
              <img src={doodlzCharacters} alt="Doodlz characters" style={{ width: activeTab === 'createRoom' ? 44 : 36, height: activeTab === 'createRoom' ? 44 : 36, objectFit: 'contain', flexShrink: 0 }} />
              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: activeTab === 'createRoom' ? 11 : 10, fontWeight: 700, color: '#333333', lineHeight: activeTab === 'createRoom' ? 1.3 : 1.25, fontStyle: 'italic' }}>
                  "Creativity is the enemy of boredom. Let's make something weird today... because Picasso had to start somewhere too."
                </p>
              </div>
              {/* Speech bubble tail */}
              <div style={{
                position: 'absolute', top: activeTab === 'createRoom' ? -11 : -9, left: 30,
                width: 0, height: 0,
                borderLeft: activeTab === 'createRoom' ? '8px solid transparent' : '7px solid transparent',
                borderRight: activeTab === 'createRoom' ? '8px solid transparent' : '7px solid transparent',
                borderBottom: activeTab === 'createRoom' ? '11px solid #000000' : '9px solid #000000',
              }} />
              <div style={{
                position: 'absolute', top: activeTab === 'createRoom' ? -7 : -6, left: 31,
                width: 0, height: 0,
                borderLeft: activeTab === 'createRoom' ? '7px solid transparent' : '6px solid transparent',
                borderRight: activeTab === 'createRoom' ? '7px solid transparent' : '6px solid transparent',
                borderBottom: activeTab === 'createRoom' ? '9px solid #fffce0' : '7px solid #fffce0',
              }} />
            </div>
          </div>

        </div>

      </main>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '16px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(255, 255, 255, 0.6)', letterSpacing: '0.05em' }}>
        TERMS OF SERVICE &nbsp;|&nbsp; PRIVACY &nbsp;|&nbsp; ASSETS &nbsp;|&nbsp; CONTACT
      </div>

    </div>
  )
}
