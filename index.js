const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const mongoose = require("mongoose");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

mongoose.connect('mongodb://127.0.0.1:27017/whiteboardDB')
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

const strokeSchema = new mongoose.Schema({
    points: [{ x: Number, y: Number }],
    color: String,
    size: Number,
    shape: String,
    timestamp: { type: Date, default: Date.now }
});

const Stroke = mongoose.model('Stroke', strokeSchema);

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

app.get("/", (req, res) => { res.render("index"); });

io.on('connection', async (socket) => {
    try {
        const history = await Stroke.find().sort({ timestamp: 1 });
        socket.emit('history', history);
    } catch (err) { console.log(err); }

    socket.on('draw', (data) => socket.broadcast.emit('draw', data));
    socket.on('stroke', async (data) => {
        const newStroke = new Stroke(data);
        await newStroke.save();
        socket.broadcast.emit('stroke', data);
    });

    socket.on('join-video', () => {
        socket.broadcast.emit('user-joined-video', socket.id);
    });

    socket.on('signal', (data) => {
        io.to(data.to).emit('signal', { from: socket.id, signal: data.signal });
    });

    socket.on('chat-message', (data) => {
        io.emit('chat-message', { text: data.text, user: socket.id.substring(0, 5) });
    });

    socket.on('laser-move', (data) => socket.broadcast.emit('laser-move', data));

    socket.on('undo', async () => {
        const last = await Stroke.findOne().sort({ timestamp: -1 });
        if (last) {
            await Stroke.findByIdAndDelete(last._id);
            const history = await Stroke.find().sort({ timestamp: 1 });
            io.emit('history', history);
        }
    });

    socket.on('clear', async () => {
        await Stroke.deleteMany({});
        socket.broadcast.emit('clear');
    });

    socket.on('disconnect', () => {
        io.emit('user-left-video', socket.id);
    });
});

server.listen(3000, () => console.log(`Server running on port 3000`));