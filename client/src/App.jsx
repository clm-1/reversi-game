import { Route, Routes } from 'react-router-dom'
import Game from './pages/Game'
import Home from './pages/Home'

function App() {

  return (
    <div className="App">
      <div className="mainContainer">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game/:gameId" element={<Game />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
