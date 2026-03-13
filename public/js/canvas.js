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
};


undoBtn.onclick = () => socket.emit('undo');
clearBtn.onclick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit('clear');
};


downloadBtn.onclick = () => {
    const format = exportFormat.value;
    const fileName = `drawing-${Date.now()}`;

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