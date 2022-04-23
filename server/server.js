const io = require('socket.io')(process.env.PORT || 3001, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
})

let activePlayers = []

const activeGames = {}

io.on('connection', socket => {
  console.log('connection made');
  socket.emit('connection-made', { msg: 'hello' })
  socket.on('join-game', (gameId, newPlayerName) => {
    const players = io.sockets.adapter.rooms.get(gameId)
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
    if (!activeGames[gameId]) activeGames[gameId] = { gameState: [], placedPieces: [], currentPlayer: 'B'}
    if (activeGames[gameId] && activeGames[gameId].gameState.length) {
      socket.emit('get-game-state', activeGames[gameId])
    }
    
    // Find other players in game and set color to the available color
    const newPlayerColor = playersInGame.length && playersInGame[0]?.color === 'B' ? 'W' : 'B'
    activePlayers.push({ player: socket.id, name: newPlayerName, gameId, color: newPlayerColor, opponent })
    playersInGame = activePlayers.filter(player => player.gameId === gameId)
    // console.log('playersInGame', playersInGame)
    socket.emit('game-joined', `Joined game as: ${newPlayerColor}: ${newPlayerName}`, newPlayerColor, newPlayerName)
    io.in(gameId).emit('set-players', playersInGame)
  })

  socket.on('new-name', newName => {
    
  })

  socket.on('set-game-state', (gameState, placedPieces, currentPlayer )=> {
    // Take a look at this later, add error handling
    console.log('activePlayers', activePlayers)
    const game = activePlayers.filter(player => player.player === socket.id)[0]?.gameId
    activeGames[game] = { gameState, placedPieces, currentPlayer }
  })

  socket.on('reset-game', (gameId) => {
    console.log('game', gameId);
    activeGames[gameId] = { gameState: [], placedPieces: [], currentPlayer: 'B'}
    io.in(gameId).emit('reset-game')
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