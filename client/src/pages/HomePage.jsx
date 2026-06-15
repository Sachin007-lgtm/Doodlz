import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../context/SocketContext'
import { useGame } from '../context/GameContext'
import headerVideo from '../assets/55a20eb284034c0590c8dec3ed78660a (1).webm'
import doodlzCharacters from '../assets/doodlz_characters.png'

const randomSeed = () => Math.random().toString(36).substring(2, 10)
const avatarUrl  = seed =>
  `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`

const howToPlaySteps = [
  {
    title: '1. TIME TO DRAW',
    desc: "You're gonna receive a bizarre sentence to draw.",
    icon: 'draw',
    color: '#000'
  },
  {
    title: '2. GUESS THE ART',
    desc: "Type your guesses as fast as you can to earn maximum points!",
    icon: 'psychology',
    color: '#000'
  },
  {
    title: '3. SEE WHAT HAPPENED',
    desc: "Watch the hilarious results of the telephone game.",
    icon: 'auto_awesome',
    color: '#000'
  }
]

// Neo-brutalist input/select styles
const neoLabel = { display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#555', marginBottom: 5, fontWeight: 800 }
const neoSelect = { width: '100%', border: '3px solid #000', background: '#fff', color: '#000', borderRadius: 4, padding: '8px 10px', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13, outline: 'none', cursor: 'pointer', boxShadow: '3px 3px 0px #000' }
const neoInput = { width: '100%', border: '3px solid #000', background: '#fff', color: '#000', borderRadius: 4, padding: '8px 10px', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, outline: 'none', boxShadow: '3px 3px 0px #000', boxSizing: 'border-box' }

// Chunky button press handler
const pressDown = (e) => { e.currentTarget.style.boxShadow = '1px 1px 0px #000'; e.currentTarget.style.transform = 'translate(3px, 3px)'; }
const pressUp = (e) => { e.currentTarget.style.boxShadow = '4px 4px 0px #000'; e.currentTarget.style.transform = 'translate(0, 0)'; }

export default function HomePage() {
  const navigate = useNavigate()
  const { socket, connected } = useSocket()
  const { room, myPlayer } = useGame()

  const [activeTab, setActiveTab] = useState('anonymous')
  const [playerName, setPlayerName] = useState('')
  const [joinCode,   setJoinCode]   = useState('')
  const [loading,    setLoading]    = useState('')
  const [avatarSeed, setAvatarSeed] = useState(randomSeed)
  const [howToPlayStep, setHowToPlayStep] = useState(0)

  // Room settings (integrated from CreateRoomPage)
  const [maxPlayers, setMaxPlayers] = useState(8)
  const [rounds, setRounds] = useState(3)
  const [drawTime, setDrawTime] = useState(60)
  const [wordCount, setWordCount] = useState(3)
  const [wordMode, setWordMode] = useState('standard')

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

  const handleCreateRoom = () => {
    if (!validate()) return
    setLoading('create')
    socket.emit('create_room', {
      playerName: playerName.trim(),
      avatarSeed,
      settings: { maxPlayers, rounds, drawTime, wordCount, wordMode, isPublic: false },
    })
  }

  const handleJoin = () => {
    if (!validate()) return
    if (!joinCode.trim()) { alert('Enter a room code!'); return }
    setLoading('join')
    socket.emit('join_room', { roomId: joinCode.trim().toUpperCase(), playerName: playerName.trim(), avatarSeed })
  }

  const handleNextStep = () => {
    setHowToPlayStep((prev) => (prev + 1) % howToPlaySteps.length)
  }

  const handlePrevStep = () => {
    setHowToPlayStep((prev) => (prev - 1 + howToPlaySteps.length) % howToPlaySteps.length)
  }

  return (
    <div className="page-wrapper" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      {/* Header Area */}
      <div style={{ textAlign: 'center', padding: '0 20px 0', position: 'relative', width: '100%', flexShrink: 0 }}>
        {/* Connection Status (Top Right) */}
        <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#00FA9A' : '#aaa', display: 'inline-block', border: '1px solid rgba(0,0,0,0.2)' }} />
          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--on-surface-variant)', fontWeight: 600 }}>
            {connected ? 'ONLINE' : 'CONNECTING…'}
          </span>
        </div>
        
        {/* Video Logo */}
        <video 
          src={headerVideo} 
          autoPlay 
          loop 
          muted 
          playsInline
          style={{ height: '190px', objectFit: 'contain', filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.6))', marginTop: '-15px' }} 
        />
      </div>

      {/* Main Dual-Panel Area */}
      <main style={{ flex: 1, padding: '0 20px 20px', maxWidth: 1000, margin: '-20px auto 0', width: '100%', position: 'relative', zIndex: 10 }}>
        
        {/* Swapping Container */}
        <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 480 }}>

          {/* Panel 1: Forms & Settings */}
          <div style={{ 
            position: 'absolute', top: 0, left: 0, width: 'calc(50% - 12px)', height: '100%', 
            transform: activeTab === 'anonymous' ? 'translateX(0)' : 'translateX(calc(100% + 24px))',
            transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: activeTab === 'anonymous' ? 2 : 1
          }}>
             <div className="folder-tabs-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Tabs Header */}
                <div className="folder-tabs-header">
                  <div className={`folder-tab ${activeTab === 'anonymous' ? 'active' : ''}`} onClick={() => setActiveTab('anonymous')}>ANONYMOUS</div>
                  <div className={`folder-tab ${activeTab === 'createRoom' ? 'active' : ''}`} onClick={() => setActiveTab('createRoom')}>CREATE ROOM</div>
                </div>
                
                {/* Panel Content */}
                <div className="folder-content" style={{ justifyContent: 'space-between', flex: 1, minHeight: 0, overflowY: 'auto' }}>
                  
                  {activeTab === 'anonymous' ? (
                    <>
                      {/* Avatar & Nickname Selection */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                        {/* Avatar */}
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <img src={avatarUrl(avatarSeed)} alt="Your avatar"
                            style={{ width: 80, height: 80, borderRadius: '50%', border: '4px solid #000', boxShadow: '4px 4px 0px #000', background: 'var(--secondary-container)' }}
                          />
                          <button
                            onClick={() => setAvatarSeed(randomSeed())}
                            title="Get a new avatar!"
                            style={{
                              position: 'absolute', bottom: -5, right: -5,
                              width: 30, height: 30, borderRadius: '50%',
                              background: '#fff', border: '3px solid #000',
                              boxShadow: '2px 2px 0px #000', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'transform 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1) rotate(0deg)'}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#000', fontWeight: 'bold' }}>refresh</span>
                          </button>
                        </div>

                        {/* Name Input */}
                        <div style={{ flex: 1 }}>
                          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, marginBottom: 4, color: '#000', textTransform: 'uppercase' }}>
                            Choose a character<br/>and a nickname
                          </p>
                          <input
                            className="input"
                            placeholder="e.g. sachinsingh"
                            value={playerName}
                            onChange={e => setPlayerName(e.target.value)}
                            maxLength={20}
                            onKeyDown={e => e.key === 'Enter' && handleJoin()}
                            style={{ fontSize: 14, fontWeight: 700, padding: '10px 12px', background: '#fff', border: '3px solid #000', boxShadow: '3px 3px 0px #000', width: '100%', boxSizing: 'border-box', color: '#000' }}
                          />
                        </div>
                      </div>

                      {/* Join Room Section */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
                        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: '#000', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>meeting_room</span>
                          Join Existing Room
                        </p>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input className="input"
                            placeholder="ENTER CODE"
                            value={joinCode}
                            onChange={e => setJoinCode(e.target.value.toUpperCase())}
                            maxLength={8}
                            onKeyDown={e => e.key === 'Enter' && handleJoin()}
                            style={{ flex: 1, letterSpacing: '0.1em', fontWeight: 800, fontSize: 14, textAlign: 'center', padding: '10px', background: '#fff', border: '3px solid #000', boxShadow: '3px 3px 0px #000', boxSizing: 'border-box', color: '#000' }}
                          />
                          <button className="btn" style={{ padding: '10px 20px', fontSize: 14, borderRadius: 8, background: '#a78bfa', color: '#000', border: '3px solid #000', boxShadow: '4px 4px 0px #000', fontWeight: 900, transition: 'all 0.1s' }}
                            onClick={handleJoin} disabled={loading === 'join'}
                            onMouseDown={pressDown} onMouseUp={pressUp} onMouseLeave={pressUp}
                          >
                            {loading === 'join' ? '...' : 'JOIN'}
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Create Room Tab Content */
                    <>
                      {/* Avatar & Nickname Selection */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                        {/* Avatar */}
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <img src={avatarUrl(avatarSeed)} alt="Your avatar"
                            style={{ width: 80, height: 80, borderRadius: '50%', border: '4px solid #000', boxShadow: '4px 4px 0px #000', background: 'var(--secondary-container)' }}
                          />
                          <button
                            onClick={() => setAvatarSeed(randomSeed())}
                            title="Get a new avatar!"
                            style={{
                              position: 'absolute', bottom: -5, right: -5,
                              width: 30, height: 30, borderRadius: '50%',
                              background: '#fff', border: '3px solid #000',
                              boxShadow: '2px 2px 0px #000', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'transform 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1) rotate(0deg)'}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#000', fontWeight: 'bold' }}>refresh</span>
                          </button>
                        </div>

                        {/* Name Input */}
                        <div style={{ flex: 1 }}>
                          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, marginBottom: 4, color: '#000', textTransform: 'uppercase' }}>
                            Choose a character<br/>and a nickname
                          </p>
                          <input
                            className="input"
                            placeholder="e.g. sachinsingh"
                            value={playerName}
                            onChange={e => setPlayerName(e.target.value)}
                            maxLength={20}
                            onKeyDown={e => e.key === 'Enter' && handleCreateRoom()}
                            style={{ fontSize: 14, fontWeight: 700, padding: '10px 12px', background: '#fff', border: '3px solid #000', boxShadow: '3px 3px 0px #000', width: '100%', boxSizing: 'border-box', color: '#000' }}
                          />
                        </div>
                      </div>

                      {/* Room Settings Section */}
                      <div style={{ marginBottom: 12 }}>
                        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, marginBottom: 8, color: '#000', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>settings</span>
                          Room Settings
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div>
                            <label style={neoLabel}>Players</label>
                            <select value={maxPlayers} onChange={e => setMaxPlayers(+e.target.value)} style={neoSelect}>
                              {[2,4,6,8,10,12].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={neoLabel}>Rounds</label>
                            <select value={rounds} onChange={e => setRounds(+e.target.value)} style={neoSelect}>
                              {[2,3,5,8,10].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={neoLabel}>Draw Time (s)</label>
                            <input type="number" min={15} max={240} step={15} value={drawTime}
                              onChange={e => setDrawTime(+e.target.value)} style={neoInput} />
                          </div>
                          <div>
                            <label style={neoLabel}>Word Choices</label>
                            <input type="number" min={1} max={5} value={wordCount}
                              onChange={e => setWordCount(+e.target.value)} style={neoInput} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          {['standard', 'custom'].map(m => (
                            <button key={m} onClick={() => setWordMode(m)} style={{
                              flex: 1, padding: '7px 0',
                              background: wordMode === m ? '#facc15' : '#fff',
                              color: '#000',
                              border: '3px solid #000', borderRadius: 4,
                              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12,
                              cursor: 'pointer', textTransform: 'uppercase',
                              boxShadow: wordMode === m ? '3px 3px 0px #000' : '2px 2px 0px #000',
                              transition: 'all 0.15s',
                            }}>
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Start Room Button */}
                      <button className="btn" style={{ width: '100%', fontSize: 16, padding: '10px 0', borderRadius: 8, background: '#4ade80', color: '#000', border: '4px solid #000', boxShadow: '4px 4px 0px #000', fontWeight: 900, transition: 'all 0.1s', marginTop: 'auto' }}
                        onClick={handleCreateRoom}
                        onMouseDown={pressDown} onMouseUp={pressUp} onMouseLeave={pressUp}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 22, marginRight: 8, verticalAlign: 'middle' }}>rocket_launch</span>
                        {loading === 'create' ? 'CREATING…' : 'START ROOM'}
                      </button>
                    </>
                  )}

                </div>
             </div>
          </div>

          {/* Panel 2: How To Play + Decorative Image */}
          <div style={{ 
            position: 'absolute', top: 0, right: 0, width: 'calc(50% - 12px)', height: '100%', 
            transform: activeTab === 'anonymous' ? 'translateX(0)' : 'translateX(calc(-100% - 24px))',
            transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 1,
            display: 'flex', flexDirection: 'column', gap: 16
          }}>
             {/* How To Play Card */}
             <div className="folder-content" style={{ flex: 1, marginTop: 38 }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, color: '#000', textAlign: 'center', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  How To Play
                </h2>
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 64, color: howToPlaySteps[howToPlayStep].color, marginBottom: 12 }}>
                      {howToPlaySteps[howToPlayStep].icon}
                    </span>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 900, marginBottom: 6, color: '#000' }}>
                      {howToPlaySteps[howToPlayStep].title}
                    </h3>
                    <p style={{ color: '#333', fontSize: 14, fontWeight: 600, maxWidth: 240, margin: '0 auto', lineHeight: 1.4 }}>
                      {howToPlaySteps[howToPlayStep].desc}
                    </p>
                  </div>
                </div>

                {/* Carousel Indicators */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
                  <span className="material-symbols-outlined" onClick={handlePrevStep}
                    style={{ color: '#000', fontSize: 28, cursor: 'pointer', userSelect: 'none', fontWeight: 'bold' }}>
                    navigate_before
                  </span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {howToPlaySteps.map((_, index) => (
                      <span key={index} onClick={() => setHowToPlayStep(index)}
                        style={{ 
                          width: index === howToPlayStep ? 14 : 8, height: index === howToPlayStep ? 14 : 8, 
                          borderRadius: '50%', border: '3px solid #000',
                          background: index === howToPlayStep ? '#000' : 'transparent',
                          cursor: 'pointer', transition: 'all 0.2s ease-in-out'
                        }} />
                    ))}
                  </div>
                  <span className="material-symbols-outlined" onClick={handleNextStep}
                    style={{ color: '#000', fontSize: 28, cursor: 'pointer', userSelect: 'none', fontWeight: 'bold' }}>
                    navigate_next
                  </span>
                </div>
             </div>

             {/* Decorative Quote Card (like PEBLO) */}
             <div style={{
               background: '#fffce0',
               border: '3px solid #000',
               borderRadius: 4,
               boxShadow: '5px 5px 0px #000',
               padding: '12px 16px',
               display: 'flex',
               alignItems: 'center',
               gap: 12,
               position: 'relative',
             }}>
               <img src={doodlzCharacters} alt="Doodlz characters" style={{ width: 56, height: 56, objectFit: 'contain', flexShrink: 0 }} />
               <div>
                 <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: '#333', lineHeight: 1.4, fontStyle: 'italic' }}>
                   "Creativity is the enemy of boredom. Let's make something weird today."
                 </p>
               </div>
               {/* Speech bubble tail */}
               <div style={{
                 position: 'absolute', top: -10, left: 30,
                 width: 0, height: 0,
                 borderLeft: '8px solid transparent',
                 borderRight: '8px solid transparent',
                 borderBottom: '10px solid #000',
               }} />
               <div style={{
                 position: 'absolute', top: -7, left: 31,
                 width: 0, height: 0,
                 borderLeft: '7px solid transparent',
                 borderRight: '7px solid transparent',
                 borderBottom: '9px solid #fffce0',
               }} />
             </div>
          </div>
          
        </div>

      </main>
      
      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '16px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--on-surface-variant)', letterSpacing: '0.05em' }}>
        TERMS OF SERVICE &nbsp;|&nbsp; PRIVACY &nbsp;|&nbsp; ASSETS &nbsp;|&nbsp; CONTACT
      </div>

    </div>
  )
}
