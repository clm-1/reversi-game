import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client'

const GameContext = createContext()

const useGameContext = () => {
  return useContext(GameContext)
}

const GameContextProvider = ({ children }) => {
  // const [socket, setSocket] = useState(null)
  // const [game, setGame] = useState(null)
  const [inGame, setInGame] = useState(false)
  const [playerNames, setPlayerNames] = useState({
    W: 'White',
    B: 'Black'
  })

  // const socketConnection = () => {
  //   // const s = io(import.meta.env.VITE_BACKEND_URL)
  //   const s = io('http://localhost:3001')
  //   setSocket(s)
  //   s.on('connection-made', data => {
  //     console.log(data);
  //   })
  // }

  // const closeSocket = () => {
  //   socket.disconnect()
  // }

  // useEffect(() => {
  //   socketConnection()
  // }, [])

  // useEffect(() => {
  //   if (game === null) return
  //   socket.emit('join-game', game)
  // }, [game])
  

  const values = {
    // socket, 
    // setSocket,
    // game,
    // setGame,
    // socketConnection,
    // closeSocket,
    inGame,
    setInGame,
    playerNames
  }

  return (
    <GameContext.Provider value={values}>
      { children }
    </GameContext.Provider>
  )
};

export { useGameContext, GameContextProvider as default };
