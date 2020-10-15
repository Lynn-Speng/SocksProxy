const net = require('net')
const dns = require('dns')

const AUTHMETHODS = {
    NOAUTH: 0,
    USERPASS: 2
}

let authorHandler = function (data) {
    let sock = this
    // console.log('authorHandler ', data)
    // <Buffer 05 02 00 01>

    const VERSION = parseInt(data[0], 10);
    if (VERSION !== 5) {
        sock.destroyed || sock.destroy()
        return false
    }

    const methodBuf = data.slice(2)
    // <Buffer 00 01>

    let methods = []
    for (let i = 0; i < methodBuf.length; ++i)
        methods.push(methodBuf[i])
    
    if (methods.includes(AUTHMETHODS.USERPASS)) {
        let buf = Buffer.from([VERSION, AUTHMETHODS.USERPASS])
        sock.write(buf)
        sock.once('data', passwdHandler.bind(sock))
    }
    else if (methods.includes(AUTHMETHODS.NOAUTH)) {
        let buf = Buffer.from([VERSION, AUTHMETHODS.NOAUTH])
        sock.write(buf)
        sock.once('data', requestHandler.bind(sock))
    }
    else {
        let buf = Buffer.from([VERSION, 0xff]) // 0xff: No supported method 
        sock.write(buf)
        return false
    }
}

let passwdHandler = function (data) {
    let sock = this
    // console.log('data ', data);
    let ulen = parseInt(data[1], 10)
    let username = data.slice(2, 2+ulen).toString('utf8')
    let password = data.slice(3 + ulen).toString('utf8')
    if (username === 'admin' && password === '123456') {
        sock.write(Buffer.from([5, 0]))
    }
    else {
        sock.write(Buffer.from([5, 1]))
        return false
    }
    sock.once('data', requestHandler.bind(sock))
}

let requestHandler = function (data) {
    let sock = this
    const [ VERSION, CMD, RSV, ATYP ] = data // destructing assignment

    if (CMD !== 1)
        console.error('Not support other type connection %d', cmd)

    if (!(VERSION === 5 && CMD < 4 && RSV === 0)) 
        return false;

    let host, port = data.slice(data.length - 2).readInt16BE(0)
    let copyBuf = Buffer.allocUnsafe(data.length)
    data.copy(copyBuf)
    if (ATYP === 1) { // ipv4
        // DST.ADDR = data.slice(4, 8)
        host = hostname(data.slice(4, 8))
        connect(host, port, copyBuf, sock)
    }
    else if (ATYP === 3) { // domain
        // DST.ADDR = data[4]
        let len = parseInt(data[4], 10)
        host = data.slice(5, 5 + len).toString('utf8')
        if (!domainVerify(host)) {
            console.log('domain format error %s', host)
            return false
        }
        // console.log('host %s', host)
        dns.lookup(host, (err, ip, version) => {
            if (err) {
                console.log(err)
                return
            }
            connect(ip, port, copyBuf, sock)
        })
    }
}

let connect = function (host, port, data, sock) {
    if (port < 0 || host === '127.0.0.1')  return
    console.log('host %s port %d', host, port)
    let socket = new net.Socket()
    socket.connect(port, host, () => {
        data[1] = 0x00
        if (sock.writable) {
            sock.write(data)
            sock.pipe(socket)
            socket.pipe(sock)
        }
    })

    socket.on('close', () => {
        socket.destroyed || socket.destroy()
    })

    socket.on('error', err => {
        if (err) {
            console.error('connect to %s:%d error', host, port)
            data[1] = 0x03
            if (sock.writable)
                sock.end(data)
            console.error(err)
            socket.end();
        }
    })
}

let hostname = function (buf) {
    let hostName = ''
    if (buf.length === 4) {
        for (let i = 0; i < buf.length; ++i) {
            hostName += parseInt(buf[i], 10);
            if (i != 3) hostName += '.'
        }
    }
    else if (buf.length === 16) {
        for (let i = 0; i < 16; i += 2) {
            let part = buf.slice(i ,i + 2).readUInt16BE(0).toString(16)
            hostName += part
            if (i != 14) hostName += ':'
        }
    }
    return hostName
}

let domainVerify = function (host) {
    let regex = new RegExp(/^([a-zA-Z0-9|\-|_]+\.)?[a-zA-Z0-9|\-|_]+\.[a-zA-Z0-9|\-|_]+(\.[a-zA-Z0-9|\-|_]+)*$/)
    return regex.test(host)
}

module.exports.createServer = () => net.createServer(sock => {
    // sock.on(<event>, <callback>) 监听事件 
    sock.on('error', (err) => {
        console.error('error code: %s', err.code)
        console.error(err)
    })

    sock.on('close', () => {
        sock.destroyed || sock.destroy()
    })
    
    sock.once('data', authorHandler.bind(sock))
})