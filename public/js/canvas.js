const socket = io();
const canvas = document.getElementById('whiteboard');
const ctx = canvas.getContext('2d');
const colors = document.querySelectorAll('.color');
const clearBtn = document.getElementById('clearBtn');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let drawing = false;
let currentColor = '#000000';
let currentStroke = []; // Holds points for the line currently being drawn

// Color Selection
colors.forEach(color => {
    color.addEventListener('click', (e) => {
        colors.forEach(c => c.classList.remove('selected'));
        e.target.classList.add('selected');
        currentColor = e.target.dataset.color;
    });
});

// 1. Load History (Draw everything already in MongoDB)
socket.on('history', (history) => {
    history.forEach(stroke => {
        drawFullStroke(stroke.points, stroke.color);
    });
});

canvas.onmousedown = (e) => {
    drawing = true;
    currentStroke = [{ x: e.clientX, y: e.clientY }];
    draw(e.clientX, e.clientY, currentColor);
};

canvas.onmousemove = (e) => {
    if (!drawing) return;
    
    const newPoint = { x: e.clientX, y: e.clientY };
    draw(newPoint.x, newPoint.y, currentColor);
    currentStroke.push(newPoint);

    // Optional: Keep real-time feel by sending individual points too
    socket.emit('draw', { x: e.clientX, y: e.clientY, color: currentColor });
};

canvas.onmouseup = () => {
    if (!drawing) return;
    drawing = false;
    
    // 2. Save to DB: Send the entire finished line to MongoDB
    socket.emit('stroke', { points: currentStroke, color: currentColor });
    ctx.beginPath();
};

// Listen for drawing from other users
socket.on('draw', (data) => {
    draw(data.x, data.y, data.color);
});

// Listen for full strokes (from history or other users finishing a line)
socket.on('stroke', (data) => {
    drawFullStroke(data.points, data.color);
});

socket.on('clear', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

clearBtn.onclick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit('clear');
};

// Helper: Basic Draw
function draw(x, y, color) {
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
}

// Helper: Draw an entire stroke (used for history)
function drawFullStroke(points, color) {
    if (!points || points.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
        ctx.stroke();
    }
    ctx.beginPath();
}