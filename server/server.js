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
  socket.on('join-game', gameId => {
    const players = io.sockets.adapter.rooms.get(gameId)
    const numOfPlayers = players ? players.size : 0
    if (numOfPlayers >= 2) return io.to(socket.id).emit('room-full', 'room is full')
    let playersInGame = activePlayers.filter(player => player.gameId === gameId)
    socket.join(gameId)

    if (!activeGames[gameId]) activeGames[gameId] = { gameState: [], placedPieces: [], currentPlayer: 'B'}
    if (activeGames[gameId] && activeGames[gameId].gameState.length) {
      socket.emit('get-game-state', activeGames[gameId])
    }

    // Find other players in game and set color to the available color
    const newPlayerColor = playersInGame.length && playersInGame[0]?.color === 'B' ? 'W' : 'B'
    activePlayers.push({ player: socket.id, gameId, color: newPlayerColor })
    playersInGame = activePlayers.filter(player => player.gameId === gameId)
    socket.emit('game-joined', `Joined game as: ${newPlayerColor}`, newPlayerColor)
    io.in(gameId).emit('set-players', playersInGame)
  })

  socket.on('set-game-state', (gameState, placedPieces, currentPlayer )=> {
    const game = activePlayers.filter(player => player.player === socket.id)[0].gameId
    activeGames[game] = { gameState, placedPieces, currentPlayer }
  })

  socket.on('disconnect', () => {
    const game = activePlayers.filter(player => player.player === socket.id)[0]?.gameId
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