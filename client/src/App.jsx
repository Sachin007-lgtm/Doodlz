import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { SocketProvider } from './context/SocketContext'
import { GameProvider } from './context/GameContext'
import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import GameOverPage from './pages/GameOverPage'

function AppContent() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <div className="app-root">
      <div 
        className="app-container" 
        style={{ 
          background: isHome ? 'rgba(255, 255, 255, 0.03)' : 'rgba(251, 251, 254, 0.1)',
          transition: 'background 0.5s ease'
        }}
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/game/:roomId" element={<GamePage />} />
          <Route path="/gameover/:roomId" element={<GameOverPage />} />
          {/* Legacy redirect if someone navigates to /lobby */}
          <Route path="/lobby/:roomId" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <SocketProvider>
      <GameProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </GameProvider>
    </SocketProvider>
  )
}
