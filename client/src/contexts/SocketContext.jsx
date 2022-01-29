import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client'

const SocketContext = createContext()

const useSocketContext = () => {
  return useContext(SocketContext)
}

const SocketContextProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)
  const [game, setGame] = useState(null)
  const [inGame, setInGame] = useState(false)

  const socketConnection = () => {
    // const s = io(import.meta.env.VITE_BACKEND_URL)
    const s = io('http://localhost:3001')
    setSocket(s)
    s.on('connection-made', data => {
      console.log(data);
    })
  }

  const closeSocket = () => {
    socket.disconnect()
  }

  // useEffect(() => {
  //   socketConnection()
  // }, [])

  useEffect(() => {
    if (game === null) return
    socket.emit('join-game', game)
  }, [game])
  

  const values = {
    socket, 
    setSocket,
    game,
    setGame,
    socketConnection,
    closeSocket,
    inGame,
    setInGame
  }

  return (
    <SocketContext.Provider value={values}>
      { children }
    </SocketContext.Provider>
  )
};

export { useSocketContext, SocketContextProvider as default };
