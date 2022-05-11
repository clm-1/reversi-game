import React, { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import EnterName from '../components/EnterName'
import RoomFull from '../components/RoomFull'
import WaitingForPlayer from '../components/WaitingForPlayer'
import { useGameContext } from '../contexts/GameContext'
import styles from '../css/Game.module.css'

const Game = () => {
  const {
    socket,
    setSocket,
    enterName,
    setEnterName,
    roomFull,
    setRoomFull,
    initialGameBoardState,
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
    gameMsg,
    resetClicked,
    newMsg,
    setNewMsg,
    setGameMsg,
    gameBoardMsgTimer,
    gameBoardMsg,
    setGameBoardMsg,
    setCurrentPlayerStyle,
    countScore,
    renderScore,
    endGame,
    printGameOverMsg,
    handleResetGameClick,
  } = useGameContext()

  const navigate = useNavigate()

  // Get game id from params in url
  const { gameId } = useParams()
  const gameIdRef = useRef()

  // Current move to make
  const moveToMake = useRef()

  // Reset game
  const resetGame = () => {
    resetClicked.current = true
    setGameBoardMsg(null)
    if (gameBoardMsgTimer.current) {
      clearTimeout(gameBoardMsgTimer.current)
      gameBoardMsgTimer.current = null
    }
    setGameBoardMsg('starting new game...')
    setCurrentPlayer('B')
    setScore({ white: 2, black: 2 })
    setTimeout(() => {
      setGameBoardMsg('switching player colors')
    }, 1500)
    setTimeout(() => {
      resetClicked.current = false
      setGameMsg(localPlayer.color === 'B' ? 'Your turn' : 'Opponent\'s turn')
      setGameBoardState(initialGameBoardState)
      setPlacedPieces([39, 40, 48, 49])
      setCurrentValidMoves({})
      setGameOver(false)
      checkValidMoves(initialGameBoardState, [39, 40, 48, 49], 'B')
      setGameBoardMsg(null)
    }, 4500)
  }

  // Leave game and disconnect from socket
  const handleQuitGameClick = () => {
    socket.disconnect()
    navigate('/')
  }

  // Set up socket connection at start
  useEffect(() => {
    // Use this connection for live connection
    const s = io(import.meta.env.VITE_BACKEND_URL)

    // Use this for local host connection
    // const s = io('http://localhost:3001')

    setSocket(s)
  }, [])

  // When socket is set, this will run and establish game
  useEffect(() => {
    if (socket == null) return
    // First, join game (if no name is entered here the socket will send a message back and prompting user for name)
    socket.emit('join-game', { gameId, newPlayerName: localPlayer.name })

    // If game is joined, set the local player
    socket.on('game-joined', ({ msg, newPlayerColor, newPlayerName, newPlayerNumber, currentPlayer }) => {
      // console.log(msg)
      setLocalPlayer({ name: newPlayerName, color: newPlayerColor, number: newPlayerNumber })
      setCurrentPlayer(currentPlayer)
      setInGame(true)
    })

    // Set players that were found for this gameId on server
    socket.on('set-players', ({ players }) => {
      // console.log('playersFromSocket', players)
      if (players && players.length) setPlayersInGame(players)
    })

    // Get the current game state
    // This is used if a player joined an active game (if someone else started the game, or if the player quit and rejoins)
    socket.on('get-game-state', game => {
      // console.log('getting game state:', game);
      setGameBoardState(game.gameState)
      setPlacedPieces(game.placedPieces)
      countScore(game.gameState)
      if (!game.gameOver) {
        setTimeout(() => {
          setCurrentPlayer(game.currentPlayer)
        }, 300)
      }
      setGameOver(game.gameOver)
      // Check valid moves for the current player when joining game
      if (!game.gameOver) checkValidMoves(game.gameState, game.placedPieces, game.currentPlayer)
    })

    // Get these states first, position of black on scoreboard and total wins
    socket.on('get-initial-states', (newBlackPos, newWins) => {
      // console.log('initial states', newBlackPos, newWins)
      setBlackPos(newBlackPos)
      setWins(newWins)
    })

    // Prompt user to enter name if none is found on server (will open EnterName-modal)
    socket.on('enter-name', message => {
      setEnterName(true)
    })

    // Send player back to main menu if disconnected (if computer goes into sleep mode for example)
    socket.on('disconnect', () => {
      handleQuitGameClick()
    })

    // Console log if opponent is disconnected
    socket.on('player-disconnected', player => {
      // console.log(`${player} disconnected`);
    })

    // If room already has 2 players (will open RoomFull-modal)
    socket.on('room-full', message => {
      // console.log(message);
      setRoomFull(true)
    })

    // When move is made by opponent, make same move here and update game state
    socket.on('move-made', (move, gameState, newPlacedPieces) => {
      moveToMake.current = move
      setPlacedPieces(newPlacedPieces)
      setGameBoardState(gameState)
    })

    // Reset game to initial state (but changing player colors and position of black on scoreboard)
    socket.on('reset-game', (blackPos) => {
      resetGame()
      setBlackPos(blackPos)
    })

    // Recieve this from socket if you are the one that reset the game
    socket.on('sender-reset', playerData => {
      setLocalPlayer({
        name: playerData.name,
        opponent: playerData.opponent,
        color: playerData.color,
        number: playerData.number,
      })
      console.log('sender-reset', playerData.color === 'B' ? 'Your turn' : 'Opponent\'s turn')
      setGameMsg(playerData.color === 'B' ? 'Your turn' : 'Opponent\'s turn')
    })

    // Recieve this from socket if opponent reset the game
    socket.on('opponent-reset', playerData => {
      setLocalPlayer({
        name: playerData.name,
        opponent: playerData.opponent,
        color: playerData.color,
        number: playerData.number,
      })
      console.log('opponent-reset', playerData.color === 'B' ? 'Your turn' : 'Opponent\'s turn')
      setGameMsg(playerData.color === 'B' ? 'Your turn' : 'Opponent\'s turn')
    })

  }, [socket])

  // Check local player color and set game message
  useEffect(() => {
    // console.log('localPlayer', localPlayer)
    if (localPlayer.color) {
      setGameMsg(localPlayer.color === currentPlayer ? 'Your turn' : 'Opponent\'s turn')
    }
  }, [localPlayer])

  // Check players length and set the name of the opponent player
  useEffect(() => {
    let opponent = 'not joined'
    if (playersInGame && playersInGame.length === 2) {
      opponent = playersInGame.filter(player => player.name !== localPlayer.name)[0]?.name
      // If nothing is found above, players have the same name
      if (!opponent) opponent = localPlayer.name
      setLocalPlayer({ ...localPlayer, opponent })
    }
  }, [playersInGame])

  // If name is entered in "EnterName" modal, send new join-game with name to socket
  const handleSetNameClick = (newName) => {
    socket.emit('join-game', { gameId, newPlayerName: newName })
    setEnterName(false)
  }

  // Check valid moves for the current player (runs when current player changes)
  // squaresToCheck = All indexes currently in placesPieces-state
  const checkValidMoves = (gameBoardArray, squaresToCheck, player) => {
    if (!player) return;
    // console.log('Running valid moves check for:', player)
    // Establish opponent
    const opponent = player === 'W' ? 'B' : 'W'

    // Put all valid moves here
    const validMoves = {}

    // Squares that will be changed for each move in validMoves
    // (Resets when starting square changes)
    let squaresForCurrentMoveCheck = []

    // Function for checking each square in a chosen direction
    // This function is used below and runs itself multiple times if needed
    const checkFromCurrentSquare = (startSquare, numPerStep, step) => {
      const checkSquare = startSquare + (numPerStep * step)

      // Return if the current index contains your color, X or 0 on first step
      if (
        gameBoardArray[checkSquare] === player ||
        gameBoardArray[checkSquare] === 'X' ||
        (gameBoardArray[checkSquare] === '0' && step === 1)
      ) return

      // If square contains opponent piece, keep going to next step
      if (gameBoardArray[checkSquare] === opponent) {
        squaresForCurrentMoveCheck.unshift(checkSquare)
        return checkFromCurrentSquare(startSquare, numPerStep, step + 1)
      }

      if (gameBoardArray[checkSquare] === '0') {
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
    squaresToCheck.forEach((square) => {
      if (gameBoardArray[square] === player) {
        steps.forEach(numPerStep => {
          // Reset squares for current move check for each step
          squaresForCurrentMoveCheck = []
          checkFromCurrentSquare(square, numPerStep, 1)
        })
      }
    })

    // If there are no valid moves (show message and change current player)
    let movesList = Object.keys(validMoves)
    // console.log('MOVES LIST', movesList)
    if (!movesList.length) {
      if (!gameOver) {
        let noMovesMsg = ''
        if (localPlayer.color && localPlayer.color === currentPlayer) {
          noMovesMsg = 'You have no moves...'
        } else noMovesMsg = 'Opponent has no moves...'
        setGameBoardMsg(noMovesMsg)
        socket.emit('set-game-state', gameBoardArray, squaresToCheck, currentPlayer === 'W' ? 'B' : 'W', blackPos, gameOver, wins)
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
      setNoMoves(0)
      endGame(gameId, score)
    }
  }, [noMoves])

  // Check valid moves for the new player when switching players
  useEffect(() => {
    // console.log('CURRENT PLAYER', currentPlayer)
    setSquareClicked(null)
    if (!gameOver) {
      if (localPlayer.color) {
        setGameMsg(localPlayer.color === currentPlayer ? 'Your turn' : 'Opponent\'s turn')
      }
      checkValidMoves(gameBoardState, placedPieces, currentPlayer)
    }
  }, [currentPlayer])

  // This will run on gameBoardState change
  // The first piece is placed below on click for local player (and triggers this)
  useEffect(() => {
    // Check if there is a move to make
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

      // This length-check was used before when animating in each piece one by one
      // Not really needed now but kept in if needed later
      if (!moveToMake.current.piecesToChange.length) {
        // All moves done, set movesToMake to null
        moveToMake.current = null;
        // Set new score in temp variable to make sure it's updated when sending score to socket (setScore has slight delay)
        let newScore = countScore(tempGameStateArray)
        // Check if there are any empty squares left (to see if game is over)
        const emptySquares = tempGameStateArray.filter(square => square === '0').length
        // Send game state to socket
        socket.emit('set-game-state', tempGameStateArray, placedPieces, currentPlayer === 'W' ? 'B' : 'W', blackPos, gameOver, wins)
        if (emptySquares !== 0) {
          // Change player after slight delay
          setTimeout(() => {
            setNewMsg(true);
            setTimeout(() => { setNewMsg(false) }, 1500)
            setCurrentPlayer(currentPlayer === 'W' ? 'B' : 'W')
          }, 1400);
        } else {
          endGame(gameId, newScore)
          // endGame(gameId, { white: 32, black: 32 })
        }
      }
    }
  }, [gameBoardState])

  const handleGameSquareClick = async (i) => {
    // If game over or not local players turn, do nothing on click
    if (gameOver || (localPlayer.color !== currentPlayer)) return

    // Return if clicked square is not in currentValidMoves
    if (!currentValidMoves[i]) return;
    // Return if a square was already clicked before
    if (squareClicked) return

    setSquareClicked(true)

    // Set current move to make
    // moveIndex = square clicked by player
    moveToMake.current = {
      moveIndex: i,
      piecesToChange: [...currentValidMoves[i]]
    }

    // Copy gameBoardState to start making changes
    let tempGameStateArray = [...gameBoardState]
    // Set the first piece in the copied game state (clicked square)
    tempGameStateArray[i] = currentPlayer

    // Add the first piece to array of placed pieces (used when checking valid moves)
    const newPlacedPieces = [...placedPieces, i]
    // Send to socket that a move has been made
    socket.emit('move-made', moveToMake.current, tempGameStateArray, newPlacedPieces)
    // Set the game state with the tempGameState (only one piece changed at this point, the rest will change in useEffect above)
    setGameBoardState(tempGameStateArray)
    // Add first piece to placed pieces-state
    setPlacedPieces([...placedPieces, i])
  }

  // Save game id to clipboard on click
  const handleGameIdClick = (idToCopy) => {
    navigator.clipboard.writeText(idToCopy)
  }

  // Render the game board with square and pieces in correct colors
  // Set CSS based on what color is set there / or no piece placed
  const renderGameBoard = () => {
    if (gameBoardState && gameBoardState.length) return (
      gameBoardState.map((square, i) => {
        if (square === 'X') return
        return (
          <div
            key={i}
            className={`${styles.gameSquare} ${currentValidMoves[i] ? styles.validMove : ''}`}
            onClick={() => handleGameSquareClick(i)}>
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
      {/* Waiting for player-modal */}
      {playersInGame && playersInGame.length < 2 && !enterName && !roomFull && <WaitingForPlayer gameId={gameIdRef.current?.innerText} handleGameIdClick={handleGameIdClick} handleQuitGameClick={handleQuitGameClick} />}

      {/* Enter name-modal */}
      {enterName && <EnterName handleQuitGameClick={handleQuitGameClick} handleSetNameClick={handleSetNameClick} />}

      {/* Room full-modal */}
      {roomFull && <RoomFull handleQuitGameClick={handleQuitGameClick} />}

      {/* Game ID at top of page */}
      <div className={styles.gameId}>
        <p>Game ID:</p>
        <span ref={gameIdRef}>{gameId}</span>
        <button onClick={() => handleGameIdClick(gameIdRef.current?.innerText)}><i className="fas fa-paste"></i></button>
      </div>

      {/* Game wrapper (UI + gameboard) */}
      <div className={`${styles.gameWrapper} ${roomFull ? styles.roomFull : ''}`}>
        {/* Scoreboard */}
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
            {/* Render score based on color positions on scoreboard */}
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
            {/* Render score based on color positions on scoreboard */}
            {localPlayer.color && localPlayer.number === 2 &&
              renderScore(localPlayer.color)}
            {localPlayer.color && localPlayer.number === 1 &&
              renderScore(localPlayer.color === 'B' ? 'W' : 'B')}
          </div>
        </div>

        {/* Gameboard */}
        {gameBoardState?.length &&
          <div className={`${styles.gameBoardWrapper} ${gameOver ? styles.gameBoardDisabled : ''}`}>
            {renderGameBoard()}
          </div>}

        {/* Message below gameboard */}
        <div className={styles.gameUI}>
          <div className={`${styles.gameMessageWrapper}`}>
            {!gameOver &&
              <p className={`${newMsg ? styles.newMsg : ''} ${gameMsg === 'New game' ? styles.hideGameMsg : ''}`}>{gameMsg.toUpperCase()}</p>
            }
            {gameOver && score && <p className={`${newMsg ? styles.newMsg : ''} ${resetClicked.current === true ? styles.hideGameMsg : ''}`}>
              {printGameOverMsg(score)}
            </p>}
          </div>

          {/* Buttons below game-message */}
          <div className={styles.gameBtnWrapper}>
            {gameOver && !resetClicked.current &&
              <button className="outlined" onClick={() => handleResetGameClick(gameId)}>PLAY AGAIN</button>
            }
            <button className="outlined" onClick={handleQuitGameClick}>QUIT GAME</button>
          </div>

        </div>

        {/* Message on top of game board (no moves, game over, game reset) */}
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