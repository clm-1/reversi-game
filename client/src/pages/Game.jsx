import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import EnterName from '../components/EnterName'
import WaitingForPlayer from '../components/WaitingForPlayer'
import { useGameContext } from '../contexts/GameContext'
import styles from '../css/Game.module.css'

const Game = () => {
  // const { socket, setSocket, setGame, closeSocket } = useSocketContext()
  const { setInGame, playerNames, localPlayer, setLocalPlayer } = useGameContext()
  // const [you, setYou] = useState(null)
  const [currentPlayer, setCurrentPlayer] = useState('B')
  const [blackPos, setBlackPos] = useState(1)
  const [playersInGame, setPlayersInGame] = useState([])
  const [enterName, setEnterName] = useState(false)
  const [noMoves, setNoMoves] = useState(0)
  const [wins, setWins] = useState([0, 0])
  const [gameOver, setGameOver] = useState(false)
  const { gameId } = useParams()
  const [socket, setSocket] = useState()
  const [score, setScore] = useState({ white: 2, black: 2 })
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
  const [gameBoardState, setGameBoardState] = useState(initialGameBoardState)
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

  const resetGame = () => {
    setGameBoardMsg('starting new game...')
    setScore({ white: 2, black: 2 })
    setTimeout(() => {
      setGameBoardMsg('switching player colors')
    }, 1500)
    setTimeout(() => {
      setGameBoardState(initialGameBoardState)
      setCurrentPlayer('B')
      setPlacedPieces([39, 40, 48, 49])
      setCurrentValidMoves({})
      setGameOver(false)
      checkValidMoves(initialGameBoardState, [39, 40, 48, 49], 'B')
      setGameBoardMsg(null)
    }, 4500)
  }

  // Set up socket connection
  useEffect(() => {
    const s = io(import.meta.env.VITE_BACKEND_URL)

    // const s = io('http://localhost:3001', {
    //   reconnection: true,
    //   reconnectionAttempts: Infinity,
    //   reconnectionDelay: 1000,
    //   reconnectionDelayMax: 5000,
    // })

    setSocket(s)
  }, [])

  useEffect(() => {
    let outcome = `${playerNames[score.white > score.black ? 'W' : 'B']} wins!`
  }, [score])


  useEffect(() => {
    console.log('localPlayer', localPlayer)
    if (localPlayer.color) {
      setGameMsg(localPlayer.color === currentPlayer ? 'Your turn' : 'Opponent\'s turn')
    }
  }, [localPlayer])

  useEffect(() => {
    if (socket == null) return
    console.log('socket', socket);
    socket.emit('join-game', { gameId, newPlayerName: localPlayer.name })

    socket.on('game-joined', ({ msg, newPlayerColor, newPlayerName, newPlayerNumber }) => {
      console.log(msg);
      setLocalPlayer({ name: newPlayerName, color: newPlayerColor, number: newPlayerNumber })
      setInGame(true)
    })

    socket.on('set-players', ({ players }) => {
      console.log('playersFromSocket', players)
      if (players && players.length) setPlayersInGame(players)
    })

    socket.on('get-game-state', game => {
      console.log('getting game state:', game);
      setGameBoardState(game.gameState)
      if (!game.gameOver) setCurrentPlayer(game.currentPlayer)
      setPlacedPieces(game.placedPieces)
      countScore(game.gameState)
      setGameOver(game.gameOver)
      if (!game.gameOver) checkValidMoves(game.gameState, game.placedPieces, game.currentPlayer)
    })

    socket.on('get-initial-states', (newBlackPos, newWins) => {
      console.log('initial states', newBlackPos, newWins)
      setBlackPos(newBlackPos)
      setWins(newWins)
    })

    // Prompt user to enter name if none is found on server
    socket.on('enter-name', message => {
      setEnterName(true)
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

    socket.on('reset-game', (blackPos) => {
      resetGame()
      setBlackPos(blackPos)
    })

    socket.on('sender-reset', playerData => {
      setLocalPlayer({
        name: playerData.name,
        opponent: playerData.opponent,
        color: playerData.color,
        number: playerData.number,
      })
      setGameMsg(playerData.color === 'B' ? 'Your turn' : 'Opponent\s turn')
      console.log('You reset the game', playerData)
    })

    socket.on('opponent-reset', playerData => {
      setLocalPlayer({
        name: playerData.name,
        opponent: playerData.opponent,
        color: playerData.color,
        number: playerData.number,
      })
      setGameMsg(playerData.color === 'B' ? 'Your turn' : 'Opponent\s turn')
      console.log('Opponent reset the game', playerData)
    })

  }, [socket])

  useEffect(() => {
    let opponent = 'not joined'
    if (playersInGame && playersInGame.length === 2) {
      opponent = playersInGame.filter(player => player.name !== localPlayer.name)[0]?.name
      if (!opponent) opponent = localPlayer.name
      setLocalPlayer({ ...localPlayer, opponent })
    }
  }, [playersInGame])

  useEffect(() => {
    if (!localPlayer.color) return
    console.log('You are:', localPlayer.color);
  }, [localPlayer.color])

  useEffect(() => {
    console.log('blackPos', blackPos)
  }, [blackPos])

  const handleQuitGameClick = () => {
    socket.disconnect()
    // socket.emit('leave-game')
    navigate('/')
  }

  const handleSetNameClick = (newName) => {
    socket.emit('join-game', { gameId, newPlayerName: newName })
    setEnterName(false)
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
    return newScore
  }

  const endGame = (score) => {
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
    setTimeout(() => {
      setGameBoardMsg(null)
    }, 4500)
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
    let movesList = Object.keys(validMoves)
    // movesList = []
    if (!movesList.length) {
      if (!gameOver) {
        let noMovesMsg = ''
        if (localPlayer.color && localPlayer.color === currentPlayer) {
          noMovesMsg = 'You have no moves...'
        } else noMovesMsg = 'Opponent has no moves...'
        setGameBoardMsg(noMovesMsg)
      }

      setTimeout(() => {
        setGameBoardMsg(null)
        setNoMoves(noMoves + 1)
        setNewMsg(true);
        setTimeout(() => { setNewMsg(false) }, 1500)
        setCurrentPlayer(currentPlayer === 'W' ? 'B' : 'W')
      }, 4500)
    }

    // Set the valid moves available to the player
    setNoMoves(0)
    setCurrentValidMoves(validMoves)
  }

  // Check for no moves, end game if there are no moves for both players
  useEffect(() => {
    if (noMoves >= 2) {
      console.log('end game here')
      setNoMoves(0)
      endGame(score)
    }
  }, [noMoves])

  // Check valid moves for the new player
  useEffect(() => {
    setSquareClicked(null)
    console.log('NO MOVES IN USEeffect', noMoves)
    if (!gameOver) {
      if (localPlayer.color) {
        setGameMsg(localPlayer.color === currentPlayer ? 'Your turn' : 'Opponent\s turn')
      }
      checkValidMoves(gameBoardState, placedPieces, currentPlayer)
    }
  }, [currentPlayer])

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

  useEffect(() => {
    if (moveToMake.current && moveToMake.current.piecesToChange.length) {
      let tempGameStateArray = [...gameBoardState]

      // Use this to change all pieces at once
      moveToMake.current.piecesToChange.forEach(index => tempGameStateArray[index] = currentPlayer)
      moveToMake.current.piecesToChange = []
      setGameBoardState(tempGameStateArray)

      // Use this to change one piece at a time
      // console.log('place:', moveToMake.current.piecesToChange[0])
      // tempGameStateArray[moveToMake.current.piecesToChange[0]] = currentPlayer
      // moveToMake.current.piecesToChange.shift()
      // setTimeout(() => {
      //   setGameBoardState(tempGameStateArray)
      // }, 0)

      if (!moveToMake.current.piecesToChange.length) {
        moveToMake.current = null;
        let newScore = countScore(tempGameStateArray)
        const emptySquares = tempGameStateArray.filter(square => square === '0').length
        socket.emit('set-game-state', tempGameStateArray, placedPieces, currentPlayer === 'W' ? 'B' : 'W', blackPos, gameOver, wins)
        if (emptySquares !== 0) {
          setTimeout(() => {
            setNewMsg(true);
            setTimeout(() => { setNewMsg(false) }, 1500)
            setCurrentPlayer(currentPlayer === 'W' ? 'B' : 'W')
          }, 1400);
        } else {
          endGame(newScore)
        }
      }
    }
  }, [gameBoardState])

  const handleGameSquareClick = async (i) => {
    if (gameOver || (localPlayer.color !== currentPlayer)) return

    // Return if clicked square is not in currentValidMoves
    if (!currentValidMoves[i]) return;
    if (squareClicked) return
    setSquareClicked(true)
    moveToMake.current = {
      moveIndex: i,
      piecesToChange: [...currentValidMoves[i]]
    }
    let test = moveToMake.current.piecesToChange.join(' ')

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
  const handleGameIdClick = (idToCopy) => {
    navigator.clipboard.writeText(idToCopy)
  }

  // Send reset game event to server, will emit back to both players
  const handleResetGameClick = () => {
    socket.emit('reset-game', gameId)
  }

  const renderGameBoard = () => {
    if (gameBoardState && gameBoardState.length) return (
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

  return (
    <>
      {playersInGame && playersInGame.length < 2 && !enterName && !roomFull && <WaitingForPlayer gameId={gameIdRef.current?.innerText} handleGameIdClick={handleGameIdClick} handleQuitGameClick={handleQuitGameClick} />}
      {enterName && <EnterName handleQuitGameClick={handleQuitGameClick} handleSetNameClick={handleSetNameClick} />}
      <div className={styles.gameId}>
        <p>Game ID:</p>
        <span ref={gameIdRef}>{gameId}</span>
        <button onClick={() => handleGameIdClick(gameIdRef.current?.innerText)}><i className="fas fa-paste"></i></button>
      </div>
      <div className={`${styles.gameWrapper} ${roomFull ? styles.roomFull : ''}`}>
        <div className={`${styles.scoreBoard}`}>
          <div className={`${styles.playerScore} ${setCurrentPlayerStyle(1)}`}>
            <div className={styles.winsWrapper}>
              <span>{wins && wins[0]}</span>
            </div>
            {localPlayer.number === 1 &&
              <span>{localPlayer.name ? localPlayer.name.toUpperCase() : "N / A"}</span>
            }
            {localPlayer.number === 2 &&
              <span>{localPlayer.opponent ? localPlayer.opponent.toUpperCase() : "N / A"}</span>
            }
            {localPlayer.color && localPlayer.number === 1 &&
              renderScore(localPlayer.color)}
            {localPlayer.color && localPlayer.number === 2 &&
              renderScore(localPlayer.color === 'B' ? 'W' : 'B')}
          </div>
          <div className={styles.scoreDivider}></div>
          <div className={`${styles.playerScore} ${setCurrentPlayerStyle(2)}`}>
            <div className={styles.winsWrapper}>
              <span>{wins && wins[1]}</span>
            </div>
            {localPlayer.number === 2 &&
              <span>{localPlayer.name ? localPlayer.name.toUpperCase() : "N / A"}</span>
            }
            {localPlayer.number === 1 &&
              <span>{localPlayer.opponent ? localPlayer.opponent.toUpperCase() : "N / A"}</span>
            }
            {localPlayer.color && localPlayer.number === 2 &&
              renderScore(localPlayer.color)}
            {localPlayer.color && localPlayer.number === 1 &&
              renderScore(localPlayer.color === 'B' ? 'W' : 'B')}
          </div>
        </div>

        {gameBoardState?.length &&
          <div className={`${styles.gameBoardWrapper} ${gameOver ? styles.gameBoardDisabled : ''}`}>
            {renderGameBoard()}
          </div>}

        <div className={styles.gameUI}>
          {/* <div className={`${styles.scoreBoard} ${styles.landscape}`}>
            <div className={`${styles.playerScore} ${currentPlayer === 'W' ? styles.currentPlayer : ''}`}>
              <div className={styles.scoreWhite}></div>
              <span>{score.white}</span>
            </div>
            <div className={`${styles.playerScore} ${currentPlayer === 'B' ? styles.currentPlayer : ''}`}>
              <div className={styles.scoreBlack}></div>
              <span>{score.black}</span>
            </div>
          </div> */}

          <div className={`${styles.gameMessageWrapper}`}>
            {!gameOver &&
              <p className={newMsg ? styles.newMsg : ''}>{gameMsg.toUpperCase()}</p>
            }
            {gameOver && score && <p className={newMsg ? styles.newMsg : ''}>
              {printGameOverMsg(score)}
            </p>}
          </div>

          {/* <hr className={styles.gameHr} /> */}

          <div className={styles.gameBtnWrapper}>
            {gameOver &&
              <button className="outlined" onClick={handleResetGameClick}>PLAY AGAIN</button>
            }
            <button className="outlined" onClick={handleQuitGameClick}>QUIT GAME</button>
          </div>

        </div>

        {gameBoardMsg &&
          <div className={styles.gameBoardMessage}>
            <p>{gameBoardMsg.toUpperCase()}</p>
          </div>
        }
      </div>
    </>
  )
}

export default Game
