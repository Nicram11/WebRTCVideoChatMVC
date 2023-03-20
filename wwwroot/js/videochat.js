"use strict"


const connection = new signalR.HubConnectionBuilder()
    .withUrl("/videoChatHub")
    .configureLogging(signalR.LogLevel.Information)
    .build();

connection.start();

const roomInput = document.getElementById("roomId-input");
const connectButton = document.getElementById("connectButton");
const localVideo = document.getElementById("localVideo");
let remoteVideo = document.getElementById("remoteVideo");

let localStream;
let remoteSteam;

let rtcConnection;


connectButton.addEventListener("click", function () {

    let roomId = roomInput.value;

    if (roomId) {
        connection.invoke("JoinRoom", roomId);
        createPeerConnection();

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(function (stream) {
                localVideo.srcObject = stream;
                localStream = stream;

                rtcConnection.addStream(localStream);
            })
            .catch(function (err) {
                console.log("An error occurred: " + err);
            });

    }


    

});




function createPeerConnection() {
    
    rtcConnection = new RTCPeerConnection(null);
    let roomId = roomInput.value;


    rtcConnection.onicecandidate = function (event) {
        if (event.candidate) {
            // send to peers over SignalR
            connection.invoke("Send", JSON.stringify({ "candidate": event.candidate }), roomId);
        }
    }

    rtcConnection.onaddstream = function (event) {
  

        // Attach the stream to the Video element via adapter.js
        if (!remoteVideo.paused) {
            remoteVideo.pause();
        }
        remoteVideo.srcObject = event.stream;
        
        remoteVideo.play();
    }

    rtcConnection.onnegotiationneeded = function () {
        rtcConnection.createOffer()
            .then(function (offer) {
                return rtcConnection.setLocalDescription(offer)
            })
            .then(function () {
                connection.invoke("Send", JSON.stringify({ "sdp": rtcConnection.localDescription }), roomId)
            })
    }
}


connection.on("Receive", data => {
    var message = JSON.parse(data)

    if (message.sdp) {
        if (message.sdp.type == 'offer') {
            createPeerConnection()
            rtcConnection.setRemoteDescription(new RTCSessionDescription(message.sdp))
                .then(function () {
                    return navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                })
                .then(function (stream) {

                    let remoteVideo = document.getElementById("localVideo");
                    localStream = stream;
                
                    remoteVideo.srcObject = stream
                    // Add our stream to the connection to be shared
                    rtcConnection.addStream(localStream);
                })
                .then(function () {
                    return rtcConnection.createAnswer()
                })
                .then(function (answer) {
                    return rtcConnection.setLocalDescription(answer);
                })
                .then(function () {
                    connection.invoke("Send", JSON.stringify({ 'sdp': rtcConnection.localDescription }), roomInput.value)
                })
        }
        else if (message.sdp.type == 'answer') {
            rtcConnection.setRemoteDescription(new RTCSessionDescription(message.sdp))
        }
    } else if (message.candidate) {
        rtcConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
    }
});