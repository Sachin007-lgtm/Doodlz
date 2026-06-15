import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useSocket } from './SocketContext'

const GameContext = createContext(null)

export function GameProvider({ children }) {
  const { socket } = useSocket()

  const [room, setRoom]         = useState(null)
  const [myPlayer, setMyPlayer] = useState(null)
  const [players, setPlayers]   = useState([])
  const [chat, setChat]         = useState([])
  const [roundEndData, setRoundEndData]   = useState(null)
  const [gameOverData, setGameOverData]   = useState(null)
  const [gameState, setGameState] = useState({
    phase: 'waiting',
    currentRound: 0,
    totalRounds: 3,
    currentDrawerId: null,
    drawerName: '',
    timeLeft: 0,
    hint: '',
    blankWord: '',
    wordLength: 0,
    wordOptions: null,
    currentWord: null,
    correctGuessCount: 0,
  })

  const addChat = useCallback((msg) => {
    setChat(prev => [...prev.slice(-99), { id: Date.now() + Math.random(), ...msg }])
  }, [])

  useEffect(() => {
    if (!socket) return

    const handlers = {
      room_created: ({ player, room }) => {
        setMyPlayer(player)
        setRoom(room)
        setPlayers(room.players)
        setChat([])
      },
      room_joined: ({ player, room }) => {
        setMyPlayer(player)
        setRoom(room)
        setPlayers(room.players)
        setChat([])
        setGameState(s => ({ ...s, phase: 'waiting' }))
        setRoundEndData(null)
        setGameOverData(null)
      },
      player_joined: ({ player, players }) => {
        setPlayers(players)
        addChat({ type: 'system', text: `${player.name} joined! 🎉` })
      },
      player_left: ({ playerName, players }) => {
        setPlayers(players)
        addChat({ type: 'system', text: `${playerName} left.` })
      },
      players_updated: ({ players }) => setPlayers(players),
      settings_updated: ({ settings }) => setRoom(prev => prev ? { ...prev, settings } : prev),
      host_transferred: ({ newHostName }) => addChat({ type: 'system', text: `${newHostName} is now host.` }),

      game_starting: ({ room }) => {
        setRoom(room)
        setPlayers(room.players)
        setChat([])
        setRoundEndData(null)
        setGameOverData(null)
        setGameState(s => ({ ...s, phase: 'starting' }))
      },
      round_start: (data) => {
        setRoundEndData(null)
        setGameState(s => ({
          ...s,
          phase: 'word_selection',
          currentRound: data.round,
          totalRounds: data.totalRounds,
          currentDrawerId: data.drawerId,
          drawerName: data.drawerName,
          wordOptions: data.wordOptions,
          hint: '',
          blankWord: '',
          currentWord: null,
          correctGuessCount: 0,
        }))
        if (data.wordOptions) {
          addChat({ type: 'system', text: `🎨 You are drawing! Pick a word.` })
        } else {
          addChat({ type: 'system', text: `✏️ ${data.drawerName} is choosing a word...` })
        }
      },
      word_chosen: ({ word, blank, drawTime }) => {
        setGameState(s => ({
          ...s,
          phase: 'drawing',
          currentWord: word,
          blankWord: blank,
          hint: blank,
          timeLeft: drawTime,
          wordOptions: null,
        }))
      },
      timer_tick: ({ timeLeft }) => setGameState(s => ({ ...s, timeLeft })),
      hint_reveal: ({ hint }) => setGameState(s => ({ ...s, hint })),
      guess_result: ({ correct, playerName, points, players }) => {
        if (correct) {
          setPlayers(players)
          addChat({ type: 'correct', text: `${playerName} guessed the word! 😎 +${points}pts` })
          setGameState(s => ({ ...s, correctGuessCount: (s.correctGuessCount || 0) + 1 }))
        }
      },
      chat_message: ({ playerName, text, type }) => {
        addChat({ type: type || 'guess', sender: playerName, text })
      },
      round_end: (data) => {
        setRoundEndData(data)
        setPlayers(prev => prev.map(p => {
          const s = data.scores.find(x => x.id === p.id)
          return s ? { ...p, score: s.score } : p
        }))
        setGameState(s => ({ ...s, phase: 'round_end' }))
        addChat({ type: 'system', text: `🔔 Round over! Word was "${data.word}"` })
      },
      game_over: (data) => {
        setGameOverData(data)
        setGameState(s => ({ ...s, phase: 'game_over' }))
      },
      join_error: ({ message }) => alert(message),
      error: ({ message }) => console.error('[Server]', message),
    }

    Object.entries(handlers).forEach(([ev, fn]) => socket.on(ev, fn))
    return () => Object.entries(handlers).forEach(([ev, fn]) => socket.off(ev, fn))
  }, [socket, addChat])

  return (
    <GameContext.Provider value={{
      room, setRoom,
      myPlayer, setMyPlayer,
      players, setPlayers,
      gameState, setGameState,
      chat, addChat,
      roundEndData,
      gameOverData,
      resetGame: () => {
        setGameState(s => ({ ...s, phase: 'waiting' }))
        setChat([])
        setRoundEndData(null)
        setGameOverData(null)
      },
    }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  return useContext(GameContext)
}
