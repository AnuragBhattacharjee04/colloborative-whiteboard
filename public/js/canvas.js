const socket = io();
const canvas = document.getElementById('whiteboard');
const ctx = canvas.getContext('2d');


const colors = document.querySelectorAll('.color');
const clearBtn = document.getElementById('clearBtn');
const undoBtn = document.getElementById('undoBtn');
const brushSize = document.getElementById('brushSize');
const brushShape = document.getElementById('brushShape');
const downloadBtn = document.getElementById('downloadBtn');
const exportFormat = document.getElementById('exportFormat');


const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');


let drawing = false;
let currentColor = '#000000';
let currentSize = 3;
let currentShape = 'round';
let currentStroke = [];


function resizeCanvas() {
    const container = document.querySelector('.canvas-area');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();


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
    draw(e.clientX, e.clientY, currentColor, currentSize, currentShape);
    currentStroke.points.push({ x: e.clientX, y: e.clientY });
    socket.emit('draw', { x: e.clientX, y: e.clientY, color: currentColor, size: currentSize, shape: currentShape });
};

canvas.onmouseup = () => {
    if (!drawing) return;
    drawing = false;
    socket.emit('stroke', currentStroke);
};


chatForm.onsubmit = (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (text) {
        socket.emit('chat-message', { text });
        chatInput.value = '';
    }
};

socket.on('chat-message', (data) => {
    const msgDiv = document.createElement('div');
    const isMe = data.user === socket.id.substring(0, 5);
    msgDiv.classList.add('message');
    if (isMe) msgDiv.classList.add('me');
    
    msgDiv.innerHTML = `<strong>${isMe ? 'Me' : data.user}:</strong> ${data.text}`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});


colors.forEach(color => {
    color.addEventListener('click', (e) => {
        colors.forEach(c => c.classList.remove('selected'));
        e.target.classList.add('selected');
        currentColor = e.target.dataset.color;
    });
});

brushSize.oninput = (e) => currentSize = e.target.value;
brushShape.onchange = (e) => currentShape = e.target.value;
undoBtn.onclick = () => socket.emit('undo');
clearBtn.onclick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit('clear');
};


downloadBtn.onclick = () => {
    const format = exportFormat.value;
    const fileName = `whiteboard-${Date.now()}`;
    if (format === 'pdf') {
        const { jsPDF } = window.jspdf;
        const orientation = canvas.width > canvas.height ? 'l' : 'p';
        const pdf = new jsPDF(orientation, 'px', [canvas.width, canvas.height]);
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`${fileName}.pdf`);
    } else {
        const link = document.createElement('a');
        if (format === 'jpeg') {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tCtx = tempCanvas.getContext('2d');
            tCtx.fillStyle = '#FFFFFF';
            tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tCtx.drawImage(canvas, 0, 0);
            link.href = tempCanvas.toDataURL('image/jpeg', 1.0);
        } else {
            link.href = canvas.toDataURL('image/png');
        }
        link.download = `${fileName}.${format}`;
        link.click();
    }
};


socket.on('history', (history) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    history.forEach(s => drawFullStroke(s.points, s.color, s.size, s.shape));
});

socket.on('draw', (data) => draw(data.x, data.y, data.color, data.size, data.shape));
socket.on('stroke', (data) => drawFullStroke(data.points, data.color, data.size, data.shape));
socket.on('clear', () => ctx.clearRect(0, 0, canvas.width, canvas.height));

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