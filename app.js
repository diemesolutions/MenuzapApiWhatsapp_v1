const { Client }     = require('whatsapp-web.js');
const express        = require('express');
const socketIO       = require('socket.io');
const qrcode         = require('qrcode');
const http           = require('http');
const fs             = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const SESSION_FILE_PATH = './whatsapp-session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: __dirname });
});

//const client = new Client({ puppeteer: { headless: true }, session: sessionCfg });
const client = new Client({
  puppeteer: {
    headless: true,
    args: ['--no-sandbox']
  },
  session: sessionCfg
});


client.on('message', msg => {
    const sender = msg.remote;
    console.log(`Mensagem recebida de ${sender}: ${msg.body}`);
    
    if (msg.body == '!ping') {
        msg.reply('pong');
    } else if (msg.body == 'Olá!') {
      msg.reply('selamat pagi');
    }
});

client.initialize();

// Socket IO
io.on('connection', function(socket) {
    socket.emit('message', 'Conectando...');

    client.on('qr', (qr) => {
        console.log('QR RECEBIDO', qr);
        qrcode.toDataURL(qr, (err, url) => {
            socket.emit('qr', url);
            socket.emit('message', 'QR Code recebido, faça o scan!');
        });
    });

    client.on('ready', () => {
        socket.emit('ready', 'Whatsapp está pronto!');
        socket.emit('message', 'Whatsapp está pronto!');
    });

    client.on('authenticated', (session) => {
        socket.emit('authenticated', 'Whatsapp autenticado!');
        socket.emit('message', 'Whatsapp autenticado!');
        console.log('AUTHENTICATED', session);
        sessionCfg=session;
        fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
            if (err) {
                console.error(err);
            }
        });
    });
});

// Send message
app.post('/enviar_mensagem', (req, res) => {
    const number     = req.body.number;
    const message     = req.body.message;
    
    if (!number || !message) {
        return res.status(400).json({
            status:     false,
            response:     'Número e mensagem são obrigatórios.',
        });
    }

    client.sendMessage(number, message).then(response => {
        res.status(200).json({
            status:     true,
            response:     response
        });
    }).catch(err => {
        res.status(500).json({
            status:     false,
            response:     err
        });
    });
});

server.listen(1313, function() {
    console.log('App running on *: ' + 1313);
});
