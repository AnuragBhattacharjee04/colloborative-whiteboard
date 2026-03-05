const socket = io();
const canvas = document.getElementById('whiteboard');
const ctx = canvas.getContext('2d');
const colors = document.querySelectorAll('.color');
const clearBtn = document.getElementById('clearBtn');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');

socket.on('connect', () => {
    statusIndicator.classList.add('online');
    statusText.innerText = 'Live / Connected';
});

socket.on('disconnect', () => {
    statusIndicator.classList.remove('online');
    statusText.innerText = 'Offline / Reconnecting';
});

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let drawing = false;
let currentColor = '#000000';
let currentStroke = [];


colors.forEach(color => {
    color.addEventListener('click', (e) => {
        colors.forEach(c => c.classList.remove('selected'));
        e.target.classList.add('selected');
        currentColor = e.target.dataset.color;
    });
});


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

    
    socket.emit('draw', { x: e.clientX, y: e.clientY, color: currentColor });
};

canvas.onmouseup = () => {
    if (!drawing) return;
    drawing = false;
    
    
    socket.emit('stroke', { points: currentStroke, color: currentColor });
    ctx.beginPath();
};


socket.on('draw', (data) => {
    draw(data.x, data.y, data.color);
});


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

function draw(x, y, color) {
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
}

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