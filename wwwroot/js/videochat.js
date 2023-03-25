"use strict"


const roomInput = document.getElementById("roomId-input");
const connectButton = document.getElementById("connectButton");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

let localStream;
let remoteStream;
let roomId;
let rtcPeerConnection;


const connection = new signalR.HubConnectionBuilder()
    .withUrl("/videoChatHub")
    .configureLogging(signalR.LogLevel.Information)
    .build();

connection.start();



connectButton.addEventListener("click", connect);

function connect() {
    roomId = roomInput.value;

    if (roomId) {
        connection.invoke("JoinRoom", roomId);
        createPeerConnection();

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(handleStream)
            .catch(handleError);
    }
}

function handleStream(stream) {
    localVideo.srcObject = stream;
    localStream = stream;
    remoteVideo.load();
    rtcPeerConnection.addTrack(stream.getVideoTracks()[0], localStream);
    rtcPeerConnection.addTrack(stream.getAudioTracks()[0], localStream);
}


function createPeerConnection() {
    rtcPeerConnection = new RTCPeerConnection(null);

    rtcPeerConnection.onicecandidate = handleIceCandidate;
    rtcPeerConnection.ontrack = handleTrackEvent;
    rtcPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;
}


function handleIceCandidate(event) {
    if (event.candidate) {
        connection.invoke("Send", JSON.stringify({ "candidate": event.candidate }), roomId);
    }
}


function handleTrackEvent(event) {
    if (event.streams[0]) {
        remoteStream = event.streams[0];
        remoteVideo.srcObject = remoteStream;
    }
}


function handleNegotiationNeededEvent() {
    rtcPeerConnection.createOffer()
        .then((offer) => rtcPeerConnection.setLocalDescription(offer))
        .then(() => connection.invoke("Send", JSON.stringify({ "sdp": rtcPeerConnection.localDescription }), roomId));
}


function handleReceiveEvent(data) {
    var message = JSON.parse(data)

    if (message.sdp) {

        if (message.sdp.type == 'offer') {
            createPeerConnection();

            rtcPeerConnection
                .setRemoteDescription(new RTCSessionDescription(message.sdp))
                .then(() => navigator.mediaDevices.getUserMedia({ video: true, audio: true }))
                .then(handleUserMedia)
                .then(() => rtcPeerConnection.createAnswer())
                .then((answer) => rtcPeerConnection.setLocalDescription(answer))
                .then(() => connection.invoke("Send", JSON.stringify({ 'sdp': rtcPeerConnection.localDescription }), roomId));
        }
        else if (message.sdp.type == 'answer') {
            rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp));
        }

    }
    else if (message.candidate) {
        rtcPeerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
    }
}


function handleUserMedia(stream) {
   
    remoteStream = stream;
    localVideo.srcObject = stream;
    localVideo.play();
    rtcPeerConnection.addTrack(stream.getVideoTracks()[0], localStream);
    rtcPeerConnection.addTrack(stream.getAudioTracks()[0], localStream);
}

function handleError(error) {
    console.log(error);
}

connection.on("Receive", handleReceiveEvent);