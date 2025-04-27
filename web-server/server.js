const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});


let clients = [];

function heartbeat() {
 this.isAlive = true;
}

wss.on('connection', ws => {
 ws.isAlive = true;
 ws.on('pong', heartbeat);

 console.log('Client connected');
 clients.push(ws);

 ws.on('close', () => {
   clients = clients.filter(client => client !== ws);
 });
});

// Health check interval
const interval = setInterval(() => {
 wss.clients.forEach(ws => {
   if (!ws.isAlive) return ws.terminate();
   ws.isAlive = false;
   ws.ping();
 });
}, 30000);

wss.on('close', () => clearInterval(interval));

app.post('/tenlyx', (req, res) => {
 const event = req.body;
 console.log('Received Tenlyx Event:', event);

 clients.forEach(ws => {
   if (ws.readyState === WebSocket.OPEN) {
     ws.send(JSON.stringify(event));
   }
 });

 res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
 console.log(`Server listening on port ${PORT}`);
});