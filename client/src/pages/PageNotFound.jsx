import React from 'react'
import styles from '../css/PageNotFound.module.css'
import { NavLink } from 'react-router-dom'

const PageNotFound = () => {
  return (
    <div className={styles.pageNotFoundWrapper}>
      <h1>Reversi</h1>
      <h2>PAGE NOT FOUND</h2>
      <NavLink to="/">BACK</NavLink>
    </div>
  )
}

export default PageNotFound