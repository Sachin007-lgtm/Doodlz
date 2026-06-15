import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

// Create socket EAGERLY — outside component so it's always available
const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
})

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const onConnect = () => {
      console.log('[Socket] Connected:', socket.id)
      setConnected(true)
    }
    const onDisconnect = () => {
      console.log('[Socket] Disconnected')
      setConnected(false)
    }
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    // Already connected?
    if (socket.connected) setConnected(true)
    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
    }
  }, [])

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  return useContext(SocketContext)
}
