const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const mongoose = require("mongoose");
const strokeSchema = new mongoose.Schema({
    points: [{ x: Number, y: Number }],
    color: String,
    timestamp: { type: Date, default: Date.now }
});

const Stroke = mongoose.model('Stroke', strokeSchema);

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

const PORT = 6000;
server.listen(PORT, () => console.log(`Server running at ${PORT}`));