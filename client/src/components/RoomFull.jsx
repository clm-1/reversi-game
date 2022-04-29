import React from 'react';
import styles from '../css/WaitingForPlayer.module.css'
import BeatLoader from 'react-spinners/BeatLoader'

const RoomFull = ({ handleQuitGameClick }) => {
  return (
    <div className={styles.waitingForPlayerWrapper}>
      <div className={`${styles.waitingForPlayerModal} ${styles.roomFullModal}`}>
        <p>ROOM FULL</p>
        <BeatLoader speedMultiplier=".55" color="rgb(123, 245, 253)" />
        <div className={styles.buttonsWrapper}>
          <button className="outlined" onClick={handleQuitGameClick}>QUIT GAME</button>
        </div>
      </div>
    </div>
  )
};

export default RoomFull;
