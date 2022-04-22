import React from 'react';
import styles from '../css/WaitingForPlayer.module.css'
import BeatLoader from 'react-spinners/BeatLoader'

const WaitingForPlayer = ({ gameId, handleGameIdClick, handleQuitGameClick }) => {
  return (
    <div className={styles.waitingForPlayerWrapper}>
      <div className={styles.waitingForPlayerModal}>
        <p>WAITING FOR OPPONENT...</p>
        <BeatLoader speedMultiplier=".55" color="rgb(123, 245, 253)" />
        <div className={styles.buttonsWrapper}>
          <button className="outlined" onClick={() => handleGameIdClick(gameId)}>COPY GAME ID</button>
          <button className="outlined" onClick={handleQuitGameClick}>QUIT GAME</button>
        </div>
      </div>
    </div>
  )
};

export default WaitingForPlayer;
