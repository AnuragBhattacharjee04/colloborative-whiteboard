const socket = io();
const canvas = document.getElementById('whiteboard');
const ctx = canvas.getContext('2d');
const colors = document.querySelectorAll('.color');
const clearBtn = document.getElementById('clearBtn');
const undoBtn = document.getElementById('undoBtn');
const brushSize = document.getElementById('brushSize');
const brushShape = document.getElementById('brushShape');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let drawing = false;
let currentColor = '#000000';
let currentSize = 3;
let currentShape = 'round';
let currentStroke = [];

colors.forEach(color => {
    color.addEventListener('click', (e) => {
        colors.forEach(c => c.classList.remove('selected'));
        e.target.classList.add('selected');
        currentColor = e.target.dataset.color;
    });
});

brushSize.oninput = (e) => currentSize = e.target.value;
brushShape.onchange = (e) => currentShape = e.target.value;

canvas.onmousedown = (e) => {
    drawing = true;
    currentStroke = {
        points: [{ x: e.clientX, y: e.clientY }],
        color: currentColor,
        size: currentSize,
        shape: currentShape
    };
    ctx.beginPath();
    ctx.moveTo(e.clientX, e.clientY);
};

canvas.onmousemove = (e) => {
    if (!drawing) return;
    
    const x = e.clientX;
    const y = e.clientY;
    
    draw(x, y, currentColor, currentSize, currentShape);
    currentStroke.points.push({ x, y });
    
    socket.emit('draw', { x, y, color: currentColor, size: currentSize, shape: currentShape });
};

canvas.onmouseup = () => {
    if (!drawing) return;
    drawing = false;
    socket.emit('stroke', currentStroke);
    ctx.beginPath();
};


undoBtn.onclick = () => {
    socket.emit('undo');
};


socket.on('history', (history) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    history.forEach(stroke => {
        drawFullStroke(stroke.points, stroke.color, stroke.size, stroke.shape);
    });
});

socket.on('draw', (data) => {
    draw(data.x, data.y, data.color, data.size, data.shape);
});

socket.on('stroke', (data) => {
    drawFullStroke(data.points, data.color, data.size, data.shape);
});

socket.on('clear', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

function draw(x, y, color, size, shape) {
    ctx.lineWidth = size;
    ctx.lineCap = shape;
    ctx.strokeStyle = color;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
}

function drawFullStroke(points, color, size, shape) {
    if (!points || points.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = shape;
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.beginPath();
}

clearBtn.onclick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit('clear');
};