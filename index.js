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
    timestamp: { type: Date, default: Date.now }
});

const Stroke = mongoose.model('Stroke', strokeSchema);

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

app.get("/",(req,res)=>{
    res.render("index");

});

io.on('connection', async (socket) => {
    console.log('User connected:', socket.id);

    // Load History from MongoDB
    try {
        const history = await Stroke.find();
        socket.emit('history', history);
    } catch (err) {
        console.log("Error fetching history:", err);
    }

    // Save New Stroke to MongoDB
    socket.on('stroke', async (data) => {
        try {
            const newStroke = new Stroke(data);
            await newStroke.save();
            socket.broadcast.emit('stroke', data);
        } catch (err) {
            console.log("Error saving stroke:", err);
        }
    });

    socket.on('clear', async () => {
        await Stroke.deleteMany({});
        socket.broadcast.emit('clear');
    });
});


const PORT = 3000;

const PORT = process.env.PORT || 3000; 
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));