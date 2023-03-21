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
let roomId;
let rtcPeerConnection;


connectButton.addEventListener("click", function () {

    roomId = roomInput.value;

    if (roomId) {
        connection.invoke("JoinRoom", roomId);
        createPeerConnection();

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(function (stream) {
                localVideo.srcObject = stream;
                localStream = stream;
                remoteVideo.play();
                //rtcPeerConnection.addStream(localStream);
                stream.getTracks().forEach(track => rtcPeerConnection.addTrack(track));
            })
            .catch(function (err) {
                console.log("An error occurred: " + err);
            });

    }


    

});




function createPeerConnection() {
    
    rtcPeerConnection = new RTCPeerConnection(null);

    rtcPeerConnection.onicecandidate = function (event) {
        if (event.candidate) {
            connection.invoke("Send", JSON.stringify({ "candidate": event.candidate }), roomId);
        }
    }

    rtcPeerConnection.onaddstream = function (event) {

        if (!remoteVideo.paused) {
            remoteVideo.pause();
        }
        remoteVideo.srcObject = event.stream;
        
        remoteVideo.play();
    }

    /*rtcPeerConnection.ontrack = (ev) => {
        ev.streams.forEach((stream) => doAddStream(stream));
    };*/

    rtcPeerConnection.ontrack = (event) => {

        if (event.streams[0]) {
            remoteSteam = event.streams[0];
            remoteVideo.srcObject = event.streams[0];
        }
    }


    rtcPeerConnection.onnegotiationneeded = function () {
        rtcPeerConnection.createOffer()
            .then(function (offer) {
                return rtcPeerConnection.setLocalDescription(offer)
            })
            .then(function () {
                console.log(JSON.stringify({ "sdp": rtcPeerConnection.localDescription }));
                connection.invoke("Send", JSON.stringify({ "sdp": rtcPeerConnection.localDescription }), roomId)
            })
    }
}


connection.on("Receive", data => {
    var message = JSON.parse(data)

    if (message.sdp) {
        if (message.sdp.type == 'offer') {
            createPeerConnection();
            rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp))
                .then(function () {
                    return navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                })
                .then(function (stream) {

                    let remoteVideo = document.getElementById("localVideo");
                    localStream = stream;
                
                    remoteVideo.srcObject = stream;
                    remoteVideo.play();
                    stream.getTracks().forEach(track => rtcPeerConnection.addTrack(track));
                    //rtcPeerConnection.addStream(localStream);
                })
                .then(function () {
                    return rtcPeerConnection.createAnswer();
                })
                .then(function (answer) {
                    return rtcPeerConnection.setLocalDescription(answer);
                })
                .then(function () {
                    connection.invoke("Send", JSON.stringify({ 'sdp': rtcPeerConnection.localDescription }), roomId);
                })
        }
        else if (message.sdp.type == 'answer') {
            rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp));
        }
    } else if (message.candidate) {
        rtcPeerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
    }
});