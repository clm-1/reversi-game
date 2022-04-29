import { Route, Routes } from 'react-router-dom'
import Game from './pages/Game'
import Home from './pages/Home'
import PageNotFound from './pages/PageNotFound'

function App() {

  return (
    <div className="App">
      <div className="mainContainer">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game/:gameId" element={<Game />} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
