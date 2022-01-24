import React, { useRef, useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import styles from '../css/Home.module.css'

const Home = () => {
  const navigate = useNavigate()
  const usernameRef = useRef()
  const gameIdRef = useRef()

  useEffect(() => {
    const socket = io(import.meta.env.VITE_BACKEND_URL)
    socket.on('connection-made', data => {
      console.log(data);
    })
  }, [])

  const handleGenerateIdClick = () => (
    gameIdRef.current.value = uuidv4()
  )

  const handleEnterGameClick = (e) => {
    e.preventDefault()
    if (!gameIdRef.current.value) return console.log('enter username and game id');
    navigate(`/game/${gameIdRef.current.value}`)
  }

  return (
    <div className={styles.homeWrapper}>
      <h1>Reversi</h1>
      <div className={styles.enterGameWrapper}>
        <form onSubmit={handleEnterGameClick}>
          <label htmlFor="user-name">USERNAME:</label>
          <input name="user-name" type="text" ref={usernameRef} />
          <div className={styles.idLabelWrapper}>
            <label htmlFor="game-id">GAME ID:</label>
            <div className={styles.generateId} onClick={handleGenerateIdClick}>GENERATE NEW ID</div>
          </div>
          <input name="game-id" type="text" ref={gameIdRef} />
          <button type="submit">ENTER GAME</button>
        </form>
      </div>
    </div>
  )
}

export default Home
