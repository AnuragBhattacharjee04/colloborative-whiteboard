const socket = io();
const canvas = document.getElementById('whiteboard');
const ctx = canvas.getContext('2d');
const videoGrid = document.getElementById('video-grid');
const localVideo = document.getElementById('local-video');
const startVideoBtn = document.getElementById('startVideoBtn');
const videoAuthOverlay = document.getElementById('video-auth-overlay');
const localVidContainer = document.getElementById('local-video-container');
const peers = {};

let drawing = false, laserMode = false;
let currentColor = '#000000', currentSize = 3, currentShape = 'round';
let myStream;

function resize() {
    const area = document.querySelector('.canvas-area');
    canvas.width = area.clientWidth;
    canvas.height = area.clientHeight;
}
window.onresize = resize; resize();


startVideoBtn.onclick = () => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
        myStream = stream;
        videoAuthOverlay.style.display = 'none';
        localVidContainer.style.display = 'block';
        localVideo.srcObject = stream;
        
        socket.emit('join-video');
        socket.on('user-joined-video', userId => connectToPeer(userId, stream, true));
        socket.on('signal', data => {
            if (!peers[data.from]) connectToPeer(data.from, stream, false);
            peers[data.from].signal(data.signal);
        });
    }).catch(() => alert("Could not access camera/mic"));
};

function connectToPeer(userId, stream, initiator) {
    const peer = new SimplePeer({ initiator, trickle: false, stream });
    peer.on('signal', signal => socket.emit('signal', { to: userId, signal }));
    peer.on('stream', remoteStream => {
        if (document.getElementById(userId)) return;
        const video = document.createElement('video');
        video.id = userId; video.srcObject = remoteStream;
        video.autoplay = true; video.playsinline = true;
        videoGrid.appendChild(video);
    });
    peers[userId] = peer;
}


document.getElementById('muteBtn').onclick = (e) => {
    const enabled = myStream.getAudioTracks()[0].enabled;
    myStream.getAudioTracks()[0].enabled = !enabled;
    e.target.innerText = enabled ? "Unmute" : "Mute";
};
document.getElementById('camBtn').onclick = (e) => {
    const enabled = myStream.getVideoTracks()[0].enabled;
    myStream.getVideoTracks()[0].enabled = !enabled;
    e.target.innerText = enabled ? "Start Cam" : "Stop Cam";
};


canvas.onmousedown = (e) => {
    if(laserMode) return;
    drawing = true;
    ctx.beginPath(); ctx.moveTo(e.clientX, e.clientY);
    currentStroke = { points: [{x: e.clientX, y: e.clientY}], color: currentColor, size: currentSize, shape: currentShape };
};

canvas.onmousemove = (e) => {
    if (laserMode) {
        socket.emit('laser-move', { x: e.clientX, y: e.clientY });
        showLaser(e.clientX, e.clientY);
        return;
    }
    if (!drawing) return;
    draw(e.clientX, e.clientY, currentColor, currentSize, currentShape);
    currentStroke.points.push({ x: e.clientX, y: e.clientY });
    socket.emit('draw', { x: e.clientX, y: e.clientY, color: currentColor, size: currentSize, shape: currentShape });
};

canvas.onmouseup = () => { drawing = false; if(!laserMode) socket.emit('stroke', currentStroke); };

function draw(x, y, c, s, sh) {
    ctx.lineWidth = s; ctx.lineCap = sh; ctx.strokeStyle = c;
    ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y);
}

function showLaser(x, y) {
    const dot = document.createElement('div');
    dot.className = 'laser-dot'; dot.style.left = x + 'px'; dot.style.top = y + 'px';
    document.body.appendChild(dot); setTimeout(() => dot.remove(), 400);
}


document.getElementById('chat-form').onsubmit = (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    if (input.value) { socket.emit('chat-message', { text: input.value }); input.value = ''; }
};

socket.on('chat-message', data => {
    const div = document.createElement('div');
    const isMe = data.user === socket.id.substring(0,5);
    div.className = `message ${isMe ? 'me' : ''}`;
    div.innerHTML = `<b>${isMe ? 'Me' : data.user}:</b> ${data.text}`;
    document.getElementById('chat-messages').appendChild(div);
    document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
});

document.querySelectorAll('.color').forEach(c => {
    c.onclick = () => {
        document.querySelector('.color.selected').classList.remove('selected');
        c.classList.add('selected');
        currentColor = c.dataset.color;
    };
});

document.getElementById('brushSize').oninput = (e) => currentSize = e.target.value;
document.getElementById('brushShape').onchange = (e) => currentShape = e.target.value;
document.getElementById('undoBtn').onclick = () => socket.emit('undo');
document.getElementById('clearBtn').onclick = () => { ctx.clearRect(0,0,canvas.width,canvas.height); socket.emit('clear'); };

document.getElementById('laserBtn').onclick = () => {
    laserMode = !laserMode;
    document.getElementById('laserBtn').style.background = laserMode ? 'red' : '#f39c12';
};

document.getElementById('downloadBtn').onclick = () => {
    if (document.getElementById('exportFormat').value === 'pdf') {
        const doc = new jspdf.jsPDF(canvas.width > canvas.height ? 'l' : 'p', 'px', [canvas.width, canvas.height]);
        doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
        doc.save('board.pdf');
    } else {
        const link = document.createElement('a');
        link.download = 'board.png'; link.href = canvas.toDataURL(); link.click();
    }
};


socket.on('history', (h) => { ctx.clearRect(0,0,canvas.width,canvas.height); h.forEach(s => drawStroke(s)); });
socket.on('draw', d => draw(d.x, d.y, d.color, d.size, d.shape));
socket.on('stroke', d => drawStroke(d));
socket.on('laser-move', d => showLaser(d.x, d.y));
socket.on('clear', () => ctx.clearRect(0,0,canvas.width,canvas.height));
socket.on('user-left-video', id => { if(peers[id]) peers[id].destroy(); const v = document.getElementById(id); if(v) v.remove(); });

function drawStroke(s) {
    if (!s.points || s.points.length < 2) return;
    ctx.beginPath(); ctx.strokeStyle = s.color; ctx.lineWidth = s.size; ctx.lineCap = s.shape;
    ctx.moveTo(s.points[0].x, s.points[0].y);
    s.points.forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke();
}