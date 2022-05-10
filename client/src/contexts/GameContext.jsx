import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import styles from '../css/Game.module.css'

const GameContext = createContext()

const useGameContext = () => {
  return useContext(GameContext)
}

const initialGameBoardState = [
  'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X',
  '0', '0', '0', '0', '0', '0', '0', '0', 'X',
  '0', '0', '0', '0', '0', '0', '0', '0', 'X',
  '0', '0', '0', '0', '0', '0', '0', '0', 'X',
  '0', '0', '0', 'W', 'B', '0', '0', '0', 'X',
  '0', '0', '0', 'B', 'W', '0', '0', '0', 'X',
  '0', '0', '0', '0', '0', '0', '0', '0', 'X',
  '0', '0', '0', '0', '0', '0', '0', '0', 'X',
  '0', '0', '0', '0', '0', '0', '0', '0', 'X',
  'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X',
]

const GameContextProvider = ({ children }) => {
  const [socket, setSocket] = useState()
  const [enterName, setEnterName] = useState(false)
  const [roomFull, setRoomFull] = useState(false)
  const [inGame, setInGame] = useState(false)
  const [gameBoardState, setGameBoardState] = useState(initialGameBoardState)
  const [placedPieces, setPlacedPieces] = useState([39, 40, 48, 49])
  const [currentValidMoves, setCurrentValidMoves] = useState({})
  const [wins, setWins] = useState([0, 0])
  const [gameOver, setGameOver] = useState(false)
  const [localPlayer, setLocalPlayer] = useState({
    name: '',
    color: '',
    opponent: '',
    number: 1,
  })
  const [blackPos, setBlackPos] = useState(1)
  const [currentPlayer, setCurrentPlayer] = useState(null)
  const [playersInGame, setPlayersInGame] = useState([])
  const [score, setScore] = useState({ white: 2, black: 2 })
  const [squareClicked, setSquareClicked] = useState(null)
  const [noMoves, setNoMoves] = useState(0)
  const resetClicked = useRef(false)

  const [newMsg, setNewMsg] = useState(false)
  const [gameMsg, setGameMsg] = useState('New game')
  const gameBoardMsgTimer = useRef(null)
  const [gameBoardMsg, setGameBoardMsg] = useState(null)

  // Check which position (top/bottom) on scoreboard should have the active player-style
  const setCurrentPlayerStyle = (num) => {
    let activePos = null
    if (gameOver) return ''
    if (blackPos === 1) {
      activePos = currentPlayer === 'B' ? 1 : 2
    }
    if (blackPos === 2) {
      activePos = currentPlayer === 'B' ? 2 : 1
    }
    if (activePos === num) return styles.currentPlayer
    else return ''
  }

  // Get winner number (player 1 or 2) to update total wins (will send to socket)
  const getWinner = (score) => {
    let winner;
    if (score.white === score.black) winner = 'draw'
    if (!winner) winner = score.black > score.white ? 'B' : 'W'
    let winnerNumber;
    if (localPlayer.color && localPlayer.color === winner) {
      winnerNumber = localPlayer.number
    } else {
      winnerNumber = localPlayer.number === 1 ? 2 : 1
    }
    if (winner === 'draw') winnerNumber = 0
    return winnerNumber
  }

  // Count score after each move
  const countScore = (arrayToCount) => {
    let newScore = { white: 0, black: 0 }
    arrayToCount.forEach((square => {
      if (square === 'W') newScore.white++
      if (square === 'B') newScore.black++
    }))
    setScore(newScore)
    return newScore
  }

  // Render score based on color sent to function
  // Check in JSX below if player is player 1 or 2 (top or bottom on scoreboard)
  const renderScore = color => {
    if (color === 'B') return (
      <div className={styles.scoreWrapper}>
        <div className={styles.scoreBlack}></div>
        <span className={styles.scoreX}>x</span>
        <span className={styles.scoreNumber}>{score.black}</span>
      </div>
    )
    if (color === 'W') return (
      <div className={styles.scoreWrapper}>
        <div className={styles.scoreWhite}></div>
        <span className={styles.scoreX}>x</span>
        <span className={styles.scoreNumber}>{score.white}</span>
      </div>
    )
  }

  // End game function, takes in current score
  const endGame = (gameId, score) => {
    let outcome = printGameOverMsg(score)
    setGameMsg(outcome)
    setGameBoardMsg(outcome)
    setNoMoves(0)
    setCurrentValidMoves({})
    let tempWins = wins
    tempWins[getWinner(score) - 1]++
    setWins(tempWins)
    socket.emit('set-game-over', gameId, getWinner(score) !== 0 ? tempWins : wins)
    setGameOver(true)
    gameBoardMsgTimer.current = setTimeout(() => {
      setGameBoardMsg(null)
    }, 4500)
  }

  // Check winner and local player color to see if you or opponent wins
  const printGameOverMsg = (score) => {
    let msg = 'You win!'
    if (localPlayer.color && localPlayer.color === 'B') {
      if (score.black > score.white) msg = 'You win!'
      else msg = 'Opponent wins!'
    }
    if (localPlayer.color && localPlayer.color === 'W') {
      if (score.white > score.black) msg = 'You win!'
      else msg = 'Opponent wins!'
    }
    if (score.white === score.black) msg = 'Draw!'
    return msg.toUpperCase()
  }

  // Send reset game event to server, will emit back to both players
  const handleResetGameClick = (gameId) => {
    resetClicked.current = true
    setLocalPlayer({ ...localPlayer, color: localPlayer.color = 'B' ? 'W' : 'B' })
    socket.emit('reset-game', gameId)
  }

  const values = {
    socket,
    setSocket,
    enterName,
    setEnterName,
    roomFull,
    setRoomFull,
    initialGameBoardState,
    inGame,
    setInGame,
    gameBoardState,
    setGameBoardState,
    placedPieces,
    setPlacedPieces,
    currentValidMoves,
    setCurrentValidMoves,
    wins,
    setWins,
    gameOver,
    setGameOver,
    localPlayer,
    setLocalPlayer,
    currentPlayer,
    setCurrentPlayer,
    playersInGame,
    setPlayersInGame,
    score,
    setScore,
    squareClicked,
    setSquareClicked,
    noMoves,
    setNoMoves,
    blackPos,
    setBlackPos,
    resetClicked,
    newMsg,
    setNewMsg,
    gameMsg,
    setGameMsg,
    gameBoardMsgTimer,
    gameBoardMsg,
    setGameBoardMsg,
    setCurrentPlayerStyle,
    getWinner,
    countScore,
    renderScore,
    endGame,
    printGameOverMsg,
    handleResetGameClick,
  }

  return (
    <GameContext.Provider value={values}>
      {children}
    </GameContext.Provider>
  )
};

export { useGameContext, GameContextProvider as default };
