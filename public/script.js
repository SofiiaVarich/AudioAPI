const socket = io(); 
let localStream;
let peerConnection;
const config = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

const statusElement = document.getElementById('status');
const startCallButton = document.getElementById('startCall');
const endCallButton = document.getElementById('endCall');
const roomIDInput = document.getElementById('roomID');

// Get microphone stream
navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
        localStream = stream;
        console.log("Microphone access granted!"); 
        statusElement.textContent = "Microphone accessible!";
        startCallButton.disabled = false; 
    })
    .catch(error => {
        console.error('Error accessing microphone:', error); 
        statusElement.textContent = 'Microphone could not be accessed!';
        startCallButton.disabled = true;  
    });

// Join room
document.getElementById('joinRoom').onclick = () => {
    const roomID = roomIDInput.value;
    if (!roomID) {
        alert('Please enter room code!');
        return;
    }

    console.log(`Attempting to join room ${roomID}...`); 
    socket.emit('join-room', roomID);
    statusElement.textContent = `Joined room ${roomID}.`;

    
    startCallButton.disabled = false;
};

// Start call
startCallButton.onclick = () => {
    console.log("Start Call Button clicked"); 
    const roomID = roomIDInput.value;

    if (!localStream) {
        console.error('No microphone access!');
        return;
    }

    console.log('Starting call...'); 
    peerConnection = new RTCPeerConnection(config);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            console.log('Sending ICE candidate...'); 
            socket.emit('ice-candidate', { roomID, candidate: event.candidate });
        }
    };

    peerConnection.ontrack = event => {
        const audio = document.createElement('audio');
        audio.srcObject = event.streams[0];
        audio.play();
    };

   
    peerConnection.createOffer()
        .then(offer => {
            console.log('Sending offer to peer...');
            return peerConnection.setLocalDescription(offer);
        })
        .then(() => {
            socket.emit('offer', { roomID, offer: peerConnection.localDescription });
            console.log('Offer sent to signaling server'); 
        })
        .catch(error => {
            console.error("Error creating offer:", error); 
        });
};


endCallButton.onclick = () => {
    if (peerConnection) {
        peerConnection.close();
        socket.emit('disconnect');
        statusElement.textContent = 'Call ended.';
        startCallButton.disabled = true;
        endCallButton.disabled = true;
    }
};


socket.on('offer', offer => {
    const roomID = roomIDInput.value;
    console.log('Received offer from peer:', offer); 
    peerConnection = new RTCPeerConnection(config);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    peerConnection.setRemoteDescription(offer);

    peerConnection.createAnswer()
        .then(answer => peerConnection.setLocalDescription(answer))
        .then(() => socket.emit('answer', { roomID, answer: peerConnection.localDescription }));

    peerConnection.ontrack = event => {
        const audio = document.createElement('audio');
        audio.srcObject = event.streams[0];
        audio.play();
    };

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('ice-candidate', { roomID, candidate: event.candidate });
        }
    };
});


socket.on('answer', answer => {
    console.log('Received answer from peer:', answer); 
    peerConnection.setRemoteDescription(answer);
});


socket.on('ice-candidate', candidate => {
    console.log('Received ICE candidate:', candidate); 
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});


socket.on('message', message => {
    statusElement.textContent = message;
});
