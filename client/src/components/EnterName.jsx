import React, { useRef } from 'react';
import styles from '../css/WaitingForPlayer.module.css'

const EnterName = ({ handleSetNameClick, handleQuitGameClick }) => {
  const usernameRef = useRef()

  const handleSetName = (e) => {
    e.preventDefault()
    if (!usernameRef.current.value) return
    handleSetNameClick(usernameRef.current.value)
  }

  return (
    <div className={styles.waitingForPlayerWrapper}>
      <div className={styles.waitingForPlayerModal}>
        <p>ENTER NAME</p>
        <div className={`${styles.buttonsWrapper} ${styles.enterNameWrapper}`}>
          <form onSubmit={handleSetName}>
            <input type="text" ref={usernameRef} autoFocus required />
            <div className={styles.enterNameButtonsWrapper}>
              <button className="outlined" type="submit">SET NAME</button>
              <button className="outlined" onClick={(e) => {
                e.preventDefault()
                handleQuitGameClick()
              }}>QUIT GAME</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
};

export default EnterName;
