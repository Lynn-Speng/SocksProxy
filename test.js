// client
const LOCAL_PORT = 1080
const LOCAL_ADDRESS = 'localhost'

// server
const REMOTE_PORT = 8888
const REMOTE_ADDRESS = 'localhost'

// socks5
const SERVER_PORT = 8080
const SERVER_ADDRESS = 'localhost'

const Client = require('./lib/client')
const Server = require('./lib/server')
const Socks5 = require('./lib/socks5')

let client = Client.createServer(REMOTE_PORT, REMOTE_ADDRESS)
let server = Server.createServer(SERVER_PORT, SERVER_ADDRESS)
let socks5 = Socks5.createServer()

client.listen(LOCAL_PORT, LOCAL_ADDRESS)
server.listen(REMOTE_PORT, REMOTE_ADDRESS)
socks5.listen(SERVER_PORT, SERVER_ADDRESS)
