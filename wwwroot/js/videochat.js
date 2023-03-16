"use strict"

const connection = new signalR.HubConnectionBuilder()
    .withUrl("/videoChatHub")
    .configureLogging(signalR.LogLevel.Information)
    .build();

connection.start();



const localVideo = document.getElementById("localVideo");
let myVideoStream;
let rtcConnection = new RTCPeerConnection(null)
let mediaConstraints;
createPeerConnection();

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(function (stream) {
        localVideo.srcObject = stream;
        myVideoStream = stream;

        rtcConnection.addStream(myVideoStream);
    })
    .catch(function (err) {
        console.log("An error occurred: " + err);
    });

function createPeerConnection() {
    

    rtcConnection.onicecandidate = function (event) {
        if (event.candidate) {
            // send to peers over SignalR
            connection.invoke("Send", JSON.stringify({ "candidate": event.candidate }));
        }
    }

    rtcConnection.onaddstream = function (event) {
        let remoteVideo = document.getElementById("remoteVideo");

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
                connection.invoke("Send", JSON.stringify({ "sdp": rtcConnection.localDescription }))
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
                    myVideoStream = stream;
                
                    remoteVideo.srcObject = stream
                    // Add our stream to the connection to be shared
                    rtcConnection.addStream(myVideoStream);
                })
                .then(function () {
                    return rtcConnection.createAnswer()
                })
                .then(function (answer) {
                    return rtcConnection.setLocalDescription(answer);
                })
                .then(function () {
                    connection.invoke("Send", JSON.stringify({ 'sdp': rtcConnection.localDescription }))
                })
        }
        else if (message.sdp.type == 'answer') {
            rtcConnection.setRemoteDescription(new RTCSessionDescription(message.sdp))
        }
    } else if (message.candidate) {
        rtcConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
    }
});