'use strict';

const videoChatHubUrl = '/videoChatHub';
const peerConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

var peerConnection = null;
var localStream = null;
var remoteStream = null;
var videoChatHub = null;
var localVideo = document.getElementById('local-video');
var remoteVideo = document.getElementById('remote-video');
var username = '';
var peerId = '';
var isConnected = false;

function connect() {
    if (isConnected) {
        return;
    }

    username = document.getElementById('username').value;
    peerId = document.getElementById('peerid').value;

    if (!username || !peerId) {
        return;
    }

    isConnected = true;

    videoChatHub = new signalR.HubConnectionBuilder()
        .withUrl(videoChatHubUrl)
        .build();

    videoChatHub.on('offer', handleOffer);
    videoChatHub.on('answer', handleAnswer);
    videoChatHub.on('candidate', handleCandidate);

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(function (stream) {
            localStream = stream;
            localVideo.srcObject = stream;
            localVideo.play();

            peerConnection = new RTCPeerConnection(peerConfig);
            peerConnection.addStream(stream);

            peerConnection.onicecandidate = handleIceCandidate;
            peerConnection.onaddstream = handleAddStream;

            peerConnection.createOffer()
                .then(function (offer) {
                    peerConnection.setLocalDescription(offer);
                    videoChatHub.invoke('Offer', peerId, JSON.stringify(offer), username);
                });
        })
        .catch(function (error) {
            console.error('Error accessing media devices.', error);
        });

    videoChatHub.start()
        .then(function () {
            console.log('Connected to SignalR hub.');
        })
        .catch(function (error) {
            console.error('Error connecting to SignalR hub.', error);
        });
}

function disconnect() {
    if (!isConnected) {
        return;
    }

    isConnected = false;

    if (localStream) {
        localStream.getTracks().forEach(function (track) {
            track.stop();
        });

        localStream = null;
    }

    if (remoteStream) {
        remoteStream.getTracks().forEach(function (track) {
            track.stop();
        });

        remoteStream = null;
    }

    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    if (videoChatHub) {
        videoChatHub.off('offer', handleOffer);
        videoChatHub.off('answer', handleAnswer);
        videoChatHub.off('candidate', handleCandidate);

        videoChatHub.stop();
        videoChatHub = null;
    }

    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
}

function handleOffer(offerJson, username) {
    var offer = JSON.parse(offerJson);
    peerConnection = new RTCPeerConnection(peerConfig);

    peerConnection.onicecandidate = handleIceCandidate;
    peerConnection.onaddstream = handleAddStream;

    peerConnection.setRemoteDescription(offer);

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(function (stream) {
            localStream = stream;
            localVideo.srcObject = stream;
            localVideo.play();

            peerConnection.addStream(stream);

            peerConnection.createAnswer()
                .then(function (answer) {
                    peerConnection.setLocalDescription(answer);

                    videoChatHub.invoke('Answer', username, JSON.stringify(answer), peerId);
                });
        })
        .catch(function (error) {
            console.error('Error accessing media devices.', error);
        });
}

function handleAnswer(answerJson) {
    var answer = JSON.parse(answerJson);
    peerConnection.setRemoteDescription(answer);
}

function handleCandidate(candidateJson) {
    var candidate = JSON.parse(candidateJson);
    peerConnection.addIceCandidate(candidate);
}

function handleIceCandidate(event) {
    if (event.candidate) {
        videoChatHub.invoke('Candidate', peerId, JSON.stringify(event.candidate), username);
    }
}

function handleAddStream(event) {
    remoteStream = event.stream;
    remoteVideo.srcObject = remoteStream;
    remoteVideo.play();
}

document.getElementById('connect').addEventListener('click', connect);
document.getElementById('disconnect').addEventListener('click', disconnect);