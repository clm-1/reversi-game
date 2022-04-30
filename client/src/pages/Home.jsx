import React, { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { useGameContext } from '../contexts/GameContext'
import styles from '../css/Home.module.css'

const Home = () => {
  const { inGame, setLocalPlayer, localPlayer, updateLocalPlayer } = useGameContext()
  const navigate = useNavigate()
  const usernameRef = useRef()
  const gameIdRef = useRef()

  useEffect(() => {
    if (inGame) {
      window.location.reload();
    }
    console.log(`env test`, import.meta.env.TEST_ENV)
  }, [])

  const handleGenerateIdClick = () => (
    gameIdRef.current.value = uuidv4().slice(0, 32)
  )

  const handleEnterGameClick = (e) => {
    e.preventDefault()
    if (!gameIdRef.current.value) return console.log('enter username and game id');
    setLocalPlayer({ ...localPlayer, name: usernameRef.current.value })
    navigate(`/game/${gameIdRef.current.value}`)
  }

  return (
    <div className={styles.homeWrapper}>
      <h1>Reversi</h1>
      <div className={styles.enterGameWrapper}>
        <form onSubmit={handleEnterGameClick}>
          <label htmlFor="user-name">USERNAME:</label>
          <input name="user-name" type="text" ref={usernameRef} autoFocus required />
          <div className={styles.idLabelWrapper}>
            <label htmlFor="game-id">GAME ID:</label>
            <div className={styles.generateId} onClick={handleGenerateIdClick}>GENERATE NEW ID</div>
          </div>
          <input className={styles.gameIdInput} name="game-id" type="text" ref={gameIdRef} required />
          <button type="submit">ENTER GAME</button>
        </form>
      </div>
    </div>
  )
}

export default Home
