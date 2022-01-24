import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import WaitingForPlayer from '../components/WaitingForPlayer'
import styles from '../css/Game.module.css'

const Game = () => {
  const [you, setYou] = useState(null)
  const [currentPlayer, setCurrentPlayer] = useState('B')
  const [playersInGame, setPlayersInGame] = useState([])
  const [playerNames, setPlayerNames] = useState({
    W: 'White',
    B: 'Black'
  })
  const { gameId } = useParams()
  const [socket, setSocket] = useState()
  const [score, setScore] = useState({ white: 2, black: 2 })
  const [gameBoardState, setGameBoardState] = useState([
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
  ])
  const [placedPieces, setPlacedPieces] = useState([39, 40, 48, 49])
  const [currentValidMoves, setCurrentValidMoves] = useState({})
  const [gameBoardMsg, setGameBoardMsg] = useState(null)
  const [newMsg, setNewMsg] = useState(false)
  const navigate = useNavigate()
  const [gameMsg, setGameMsg] = useState('Black\'s turn')
  const [squareClicked, setSquareClicked] = useState(null)
  const [roomFull, setRoomFull] = useState(false)
  const moveToMake = useRef()
  const gameIdRef = useRef()

  // Set up socket connection
  useEffect(() => {
    const s = io('http://localhost:3001')
    setSocket(s)

    // Might need to save socket in context
    // return () => {
    //   if (socket) {
    //     socket.disconnect()
    //   }
    // }
  }, [])

  useEffect(() => {
    if (socket == null) return
    console.log('socket', socket);
    socket.emit('join-game', gameId)

    socket.on('game-joined', (message, newPlayerColor) => {
      console.log(message);
      setYou(newPlayerColor)
    })

    socket.on('set-players', playersFromSocket => {
      setPlayersInGame(playersFromSocket)
    })

    socket.on('get-game-state', game => {
      setGameBoardState(game.gameState)
      setCurrentPlayer(game.currentPlayer)
      setPlacedPieces(game.placedPieces)
      countScore(game.gameState)
    })

    // Display message if opponent is disconnected
    socket.on('player-disconnected', player => {
      console.log(`${player} disconnected`);
    })

    // If room already has 2 players
    socket.on('room-full', message => {
      console.log(message);
      setRoomFull(true)
    })

    // When move is made by opponent, make same move here and update game state
    socket.on('move-made', (move, gameState, newPlacedPieces) => {
      moveToMake.current = move
      setPlacedPieces(newPlacedPieces)
      setGameBoardState(gameState)
    })
  }, [socket])

  useEffect(() => {
    if (!you) return
    console.log('You are:', you);
  }, [you])

  const handleQuitGameClick = () => {
    socket.disconnect()
    navigate('/')
  }

  // Count score after each move
  const countScore = (arrayToCount) => {
    let newScore = { white: 0, black: 0 }
    arrayToCount.forEach((square => {
      if (square === 'W') newScore.white++
      if (square === 'B') newScore.black++
    }))
    const leader = playerNames[newScore.white > newScore.black ? 'W' : 'B']
    console.log(`leader`, leader)
    setScore(newScore)
  }

  // Check valid moves for the current player (runs when current player changes)
  const checkValidMoves = (gameBoardArray, squaresToCheck, player) => {
    // console.log('checking', player)

    // Establish opponent
    const opponent = player === 'W' ? 'B' : 'W'

    // Put all valid moves here
    const validMoves = {}

    // Squares that will be changed for each move in validMoves
    // (Resets when starting square changes)
    let squaresForCurrentMoveCheck = []

    // Function for checking each square in a chosen direction
    const checkFromCurrentSquare = (startSquare, numPerStep, step) => {
      const checkSquare = startSquare + (numPerStep * step)

      if (
        gameBoardArray[checkSquare] === player ||
        gameBoardArray[checkSquare] === 'X' ||
        (gameBoardArray[checkSquare] === '0' && step === 1)
      ) return

      if (gameBoardArray[checkSquare] === opponent) {
        squaresForCurrentMoveCheck.unshift(checkSquare)
        return checkFromCurrentSquare(startSquare, numPerStep, step + 1)
      }

      if (gameBoardArray[checkSquare] === '0') {
        // console.log('valid move', (checkSquare))
        if (!validMoves[checkSquare]) {
          validMoves[checkSquare] = squaresForCurrentMoveCheck
        } else {
          validMoves[checkSquare] = [...validMoves[checkSquare], ...squaresForCurrentMoveCheck]
        }
        return;
      }
    }

    // The steps-array are directions to check on the board (1 = right, -1 = left etc)
    const steps = [1, -1, 9, -9, 8, -8, 10, -10]

    // Iterate through the directions listed above for each square containing a piece in the current player's color
    // console.log('squaresToCheck: ', squaresToCheck)
    squaresToCheck.forEach((square) => {
      if (gameBoardArray[square] === player) {
        steps.forEach(numPerStep => {
          squaresForCurrentMoveCheck = []
          checkFromCurrentSquare(square, numPerStep, 1)
        })
      }
    })

    // If there are no valid moves (show message and change current player)
    if (!Object.keys(validMoves).length) {
      setGameBoardMsg(`${playerNames[currentPlayer]} has no moves...`)
      setTimeout(() => {
        setGameBoardMsg(null)
        setNewMsg(true);
        setCurrentPlayer(currentPlayer === 'W' ? 'B' : 'W')
      }, 4500)
    }

    // Set the valid moves available to the player
    setCurrentValidMoves(validMoves)
  }

  // Check valid moves for the new player
  useEffect(() => {
    setSquareClicked(null)
    setGameMsg(`${playerNames[currentPlayer]}'s turn`)
    checkValidMoves(gameBoardState, placedPieces, currentPlayer)
  }, [currentPlayer])

  const endGame = () => {
    let outcome = `${playerNames[score.white > score.black ? 'W' : 'B']} wins!`
    if (score.white === score.black) outcome = 'Draw!'
    setGameMsg(outcome)
    setGameBoardMsg(outcome)
    setCurrentValidMoves({})
    setTimeout(() => { setGameBoardMsg(null) }, 4500)
  }

  useEffect(() => {
    console.log('game board state change')
    if (moveToMake.current && moveToMake.current.piecesToChange.length) {
      let tempGameStateArray = [...gameBoardState]
      // moveToMake.current.piecesToChange.forEach(index => tempGameStateArray[index] = currentPlayer)
      console.log('place:', moveToMake.current.piecesToChange[0])
      tempGameStateArray[moveToMake.current.piecesToChange[0]] = currentPlayer
      moveToMake.current.piecesToChange.shift()
      setTimeout(() => {
        setGameBoardState(tempGameStateArray)
      }, 5)

      if (!moveToMake.current.piecesToChange.length) {
        moveToMake.current = null;
        countScore(tempGameStateArray)
        const emptySquares = tempGameStateArray.filter(square => square === '0').length
        socket.emit('set-game-state', tempGameStateArray, placedPieces, currentPlayer === 'W' ? 'B' : 'W')
        console.log('empty', emptySquares)
        if (emptySquares !== 0) {
          setTimeout(() => {
            setNewMsg(true);
            setTimeout(() => { setNewMsg(false) }, 1500)
            setCurrentPlayer(currentPlayer === 'W' ? 'B' : 'W')
          }, 1400);
        } else {
          endGame()
        }
      }
    }
  }, [gameBoardState])

  const handleGameSquareClick = async (i) => {
    if (you !== currentPlayer) return
    console.log(i)
    // Return if clicked square is not in currentValidMoves
    if (!currentValidMoves[i]) return;
    if (squareClicked) return
    setSquareClicked(true)
    moveToMake.current = {
      moveIndex: i,
      piecesToChange: [...currentValidMoves[i]]
    }
    let test = moveToMake.current.piecesToChange.join(' ')
    console.log('test', test)
    console.log()
    console.log('move to make:', moveToMake.current)

    let tempGameStateArray = [...gameBoardState]
    tempGameStateArray[i] = currentPlayer
    console.log('place first piece')
    
    // currentValidMoves[i].forEach(index => tempGameStateArray[index] = currentPlayer)
    // countScore(tempGameStateArray)
    const newPlacedPieces = [...placedPieces, i]
    socket.emit('move-made', moveToMake.current, tempGameStateArray, newPlacedPieces)
    setGameBoardState(tempGameStateArray)
    setPlacedPieces([...placedPieces, i])


    // THE OLD WAY, NEW WAY IS IN USEEFFECT ABOVE

    // Check if there are empty squares left / else end game
    // const emptySquares = tempGameStateArray.filter(square => square === '0').length
    // console.log('empty', emptySquares)
    // if (emptySquares !== 0) {
    //   setTimeout(() => {
    //     setNewMsg(true);
    //     setTimeout(() => { setNewMsg(false) }, 1500)
    //     setCurrentPlayer(currentPlayer === 'W' ? 'B' : 'W')
    //   }, 1400);
    // } else {
    //   endGame()
    // }
  }

  // Save game id to clipboard on click
  const handleGameIdClick = () => {
    navigator.clipboard.writeText(gameIdRef.current.innerText)
  }

  const renderGameBoard = () => {
    return (
      gameBoardState.map((square, i) => {
        if (square === 'X') return
        return (
          <div
            key={i}
            className={`${styles.gameSquare} ${currentValidMoves[i] ? styles.validMove : ''}`}
            onClick={() => handleGameSquareClick(i)}>
            {/* <span>{i}</span> */}
            {square === '0' && ''}
            {square === 'W' && <div className={`${styles.gamePiece} ${styles.whitePiece}`}></div>}
            {square === 'B' && <div className={`${styles.gamePiece} ${styles.blackPiece}`}></div>}
          </div>
        )
      })
    )
  }

  return (
    <>
    { playersInGame.length < 2 && <WaitingForPlayer />}
    <div className={styles.gameId}>
      <p>Game ID:</p>
      <span ref={gameIdRef}>{gameId}</span>
      <button onClick={handleGameIdClick}><i className="fas fa-paste"></i></button>
    </div>
    <div className={`${styles.gameWrapper} ${roomFull ? styles.roomFull : ''}`}>
      <div className={`${styles.scoreBoard} ${styles.portrait}`}>
        <div className={`${styles.playerScore} ${currentPlayer === 'W' ? styles.currentPlayer : ''}`}>
          <div className={styles.scoreWhite}></div>
          <span>WHITE : </span>
          <span>{score.white}</span>
        </div>
        <div className={`${styles.playerScore} ${currentPlayer === 'B' ? styles.currentPlayer : ''}`}>
          <div className={styles.scoreBlack}></div>
          <span>BLACK : </span>
          <span>{score.black}</span>
        </div>
      </div>

      {gameBoardState?.length &&
        <div className={styles.gameBoardWrapper}>
          {renderGameBoard()}
        </div>}

      <div className={styles.gameUI}>
        <div className={`${styles.scoreBoard} ${styles.landscape}`}>
          <div className={`${styles.playerScore} ${currentPlayer === 'W' ? styles.currentPlayer : ''}`}>
            <div className={styles.scoreWhite}></div>
            <span>{score.white}</span>
          </div>
          <div className={`${styles.playerScore} ${currentPlayer === 'B' ? styles.currentPlayer : ''}`}>
            <div className={styles.scoreBlack}></div>
            <span>{score.black}</span>
          </div>
        </div>

        <div className={`${styles.gameMessageWrapper}`}>
          <p className={newMsg ? styles.newMsg : ''}>{gameMsg.toUpperCase()}</p>
        </div>

        {/* <hr className={styles.gameHr} /> */}

        <div className={styles.gameBtnWrapper}>
          <button onClick={handleQuitGameClick}>QUIT GAME</button>
        </div>
      </div>

      {gameBoardMsg &&
        <div className={styles.gameBoardMessage}>
          <p>{gameBoardMsg}</p>
        </div>
      }
    </div>
    </>
  )
}

export default Game
