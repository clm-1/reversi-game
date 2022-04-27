const io = require('socket.io')(process.env.PORT || 3001, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  },
  pingInterval: 25000,
  pintTimeout: 30000,
  upgradeTimeout: 20000,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  transports: ['websocket', 'polling']
})

let activePlayers = []

const activeGames = {}

io.on('connection', socket => {
  console.log('connection made');
  socket.emit('connection-made', { msg: 'hello' })
  socket.on('join-game', ({ gameId, newPlayerName }) => {
    const players = io.sockets.adapter.rooms.get(gameId)
    console.log(newPlayerName, gameId)
    const numOfPlayers = players ? players.size : 0
    if (numOfPlayers >= 2) return io.to(socket.id).emit('room-full', 'room is full')
    let playersInGame = activePlayers.filter(player => player.gameId === gameId)

    // Set opponent name and fetch your name from opponent if one exists (used if client refreshes page in game)
    let opponent = null;
    if (playersInGame.length > 0) {
      if (newPlayerName) {
        playersInGame[0].opponent = newPlayerName
        activePlayers = activePlayers.filter(player => player.player !== playersInGame[0].player)
        activePlayers.push(playersInGame[0])
      } else {
        newPlayerName = playersInGame[0].opponent
      }
      opponent = playersInGame[0].name
    }

    // Check if player has a name before joining socket
    // If no name exists, prompt player for name on front end and then join again
    if (!newPlayerName) return socket.emit('enter-name', 'please enter name')
    socket.join(gameId)

    
    // Check if game id exists
    // Create new game or send existing game state to client
    if (!activeGames[gameId]) activeGames[gameId] = { gameState: [], placedPieces: [], currentPlayer: 'B', blackPos: 1, gameOver: false, wins: [0, 0] }
    if (activeGames[gameId]) {
      socket.emit('get-initial-states', activeGames[gameId].blackPos, activeGames[gameId].wins)
      if (activeGames[gameId].gameState.length) socket.emit('get-game-state', activeGames[gameId])
    }
    
    // Find other players in game and set color to the available color
    const newPlayerColor = playersInGame.length && playersInGame[0]?.color === 'B' ? 'W' : 'B'
    const newPlayerNumber = playersInGame.length && playersInGame[0].number === 1 ? 2 : 1
    activePlayers.push({ player: socket.id, name: newPlayerName, gameId: gameId, color: newPlayerColor, opponent: opponent, number: newPlayerNumber })
    playersInGame = activePlayers.filter(player => player.gameId === gameId)
    // console.log('playersInGame', playersInGame)
    socket.emit('game-joined', `Joined game as: ${newPlayerColor}`, newPlayerColor, newPlayerName, newPlayerNumber)
    io.in(gameId).emit('set-players', { playersInGame } )
  })

  socket.on('set-game-state', (gameState, placedPieces, currentPlayer, blackPos, gameOver, wins ) => {
    try {
      // Take a look at this later, add error handling
    const game = activePlayers.filter(player => player.player === socket.id)[0]?.gameId
    console.log('gameState on server', gameState)
    activeGames[game] = { gameState, placedPieces, currentPlayer, blackPos, gameOver, wins }
    } catch (err) {
      console.log(err)
    }
  })

  socket.on('set-game-over', (gameId, wins) => {
    activeGames[gameId].gameOver = true
    activeGames[gameId].wins = wins
  })

  socket.on('reset-game', (gameId) => {
    console.log('game', gameId);
    // Change colors of players in game
    let playersInGame = activePlayers.filter(player => player.gameId === gameId)
    activePlayers = activePlayers.filter(player => player.gameId !== gameId)
    playersInGame.forEach(player => {
      player.color = player.color === 'B' ? 'W' : 'B'
      activePlayers.push(player)
    })
    activeGames[gameId] = { gameState: [], placedPieces: [], currentPlayer: 'B', blackPos: activeGames[gameId].blackPos === 1 ? 2 : 1, gameOver: false, wins: activeGames[gameId].wins }

    const currentPlayer = playersInGame.filter(player => player.player === socket.id)
    socket.emit('sender-reset', currentPlayer[0])
    const opposingPlayer = playersInGame.filter(player => player.player !== socket.id)
    socket.broadcast.emit('opponent-reset', opposingPlayer[0])
    io.in(gameId).emit('reset-game', activeGames[gameId].blackPos)
  })

  socket.on('disconnect', (reason) => {
    console.log('reason', reason)
    const game = activePlayers.filter(player => player.player === socket.id)[0]?.gameId
    socket.leave(game)
    socket.broadcast.to(game).emit('player-disconnected', socket.id)
    activePlayers = activePlayers.filter(player => player.player !== socket.id)
    const playersInGame = activePlayers.filter(player => player.gameId === game)
    io.in(game).emit('set-players', playersInGame)
    if (!playersInGame.length) delete activeGames[game]
  })

  socket.on('move-made', (move, gameState, newPlacedPieces) => {
    const game = activePlayers.filter(player => player.player === socket.id)[0].gameId
    socket.broadcast.to(game).emit('move-made', move, gameState, newPlacedPieces)
  })
})