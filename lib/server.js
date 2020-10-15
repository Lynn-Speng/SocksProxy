const Frap = require('frap/lib/frap')
const net = require('net')
const crypto = require('./utils/crypto')

module.exports.createServer = (SERVER_PORT, SERVER_ADDRESS) => net.createServer(local => {
    let remote = net.connect(SERVER_PORT, SERVER_ADDRESS)
    let frap = new Frap(local)

    frap.on('data', data => {
        data = crypto.decrypt(data)
        remote.write(data)
    })

    remote.on('data', data => {
        data = crypto.encrypt(data)
        frap.write(data)
    })

    frap.on('error', () => {})
    remote.on('error', () => {})
})