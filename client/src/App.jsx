import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SocketProvider } from './context/SocketContext'
import { GameProvider } from './context/GameContext'
import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import GameOverPage from './pages/GameOverPage'

export default function App() {
  return (
    <SocketProvider>
      <GameProvider>
        <div className="app-root">
          <div className="app-container">
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/game/:roomId" element={<GamePage />} />
                <Route path="/gameover/:roomId" element={<GameOverPage />} />
                {/* Legacy redirect if someone navigates to /lobby */}
                <Route path="/lobby/:roomId" element={<Navigate to="/" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </div>
        </div>
      </GameProvider>
    </SocketProvider>
  )
}
