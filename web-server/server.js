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

// Post route to handle Tenlyx event and forward to WebSocket clients
app.post('/tenlyx', async (req, res) => {
 const event = req.body;
 console.log('Received Tenlyx Event:', event);

 // Forward event to connected WebSocket clients
 clients.forEach(ws => {
   if (ws.readyState === WebSocket.OPEN) {
     ws.send(JSON.stringify(event));
   }
 });

 // Trigger n8n webhook with the event data
 try {
   const webhookUrl = process.env.N8N_WEBHOOK_URL || 'https://your-n8n-instance-url/webhook/telnyx-call-events';
   const response = await axios.post(webhookUrl, {
     event: event.event_type,
     call_control_id: event.payload.call_control_id,
     from: event.payload.from,
     to: event.payload.to,
     timestamp: event.payload.timestamp,
   });
   console.log('Successfully triggered n8n webhook:', response.data);
 } catch (error) {
   console.error('Error triggering n8n webhook:', error);
 }

 res.sendStatus(200); // Acknowledge the request
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
 console.log(`Server listening on port ${PORT}`);
});