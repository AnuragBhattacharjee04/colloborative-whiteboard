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

app.get("/", (req, res) => {
    res.render("index");
});

io.on('connection', async (socket) => {
    console.log('User connected:', socket.id);

    try {
        const history = await Stroke.find().sort({ timestamp: 1 });
        socket.emit('history', history);
    } catch (err) {
        console.log("Error fetching history:", err);
    }

    socket.on('stroke', async (data) => {
        try {
            const newStroke = new Stroke(data);
            await newStroke.save();
            socket.broadcast.emit('stroke', data);
        } catch (err) {
            console.log("Error saving stroke:", err);
        }
    });

    socket.on('undo', async () => {
        try {
            const lastStroke = await Stroke.findOne().sort({ timestamp: -1 });
            if (lastStroke) {
                await Stroke.findByIdAndDelete(lastStroke._id);
                const history = await Stroke.find().sort({ timestamp: 1 });
                io.emit('history', history);
            }
        } catch (err) {
            console.log("Undo error:", err);
        }
    });

    socket.on('clear', async () => {
        await Stroke.deleteMany({});
        socket.broadcast.emit('clear');
    });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`Server running at ${PORT}`));