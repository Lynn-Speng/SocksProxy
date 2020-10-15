const net = require('net')
const Frap = require('frap')
const crypto = require('./utils/crypto')

module.exports.createServer = (REMOTE_PORT, REMOTE_ADDRESS) => net.createServer(local => {
    let remote = net.connect(REMOTE_PORT, REMOTE_ADDRESS)
    let frap = new Frap(remote)

    local.on('data', data => {
        data = crypto.encrypt(data)
        frap.write(data)
    })

    frap.on('data', data => {
        data = crypto.decrypt(data)
        local.write(data)
    })

    local.on('error', () => {})
    frap.on('error', () => {})
})