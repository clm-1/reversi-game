import React from 'react';
import styles from '../css/WaitingForPlayer.module.css'
import BeatLoader from 'react-spinners/BeatLoader'

const WaitingForPlayer = ({ gameId, handleGameIdClick }) => {
  return (
    <div className={styles.waitingForPlayerWrapper}>
      <div className={styles.waitingForPlayerModal}>
        <p>WAITING FOR OPPONENT...</p>
        <BeatLoader speedMultiplier=".55" color="rgb(123, 245, 253)" />
        <button className="outlined" onClick={() => handleGameIdClick(gameId)}>COPY GAME ID</button>
      </div>
    </div>
  )
};

export default WaitingForPlayer;
