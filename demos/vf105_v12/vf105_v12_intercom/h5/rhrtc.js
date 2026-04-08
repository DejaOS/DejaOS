

//RTCPeerConnection
var myPeerConnection = null;
var myDataChannel = null;
// MediaStream from webcam
var stream = null;
// Whether RTCPeerConnection has been created for this client
var RTCPeerConnectionCreated = false;
var CheckedgetUserMedia = false;
var StartCalled = false;

var speak = true;
var mute = true;

var peerid = "";
var meid = uuid();
var sessionId = uuid();
var connectmode = "live";
var connectsource = "MainStream";
var conn = null;
var remoteVideo = null;
var IceCandidate = new Array();
var IsLocalAudioTrack = false;
var IsLocalVideoTrack = false;
var IsLocalDataChannel = true;
var messagecallback = null;
var IsWebSocketConnected = false;
var IsWebSocketCreateed = false;
var IsVideoPlaying = false;
var IsSystemAudioDeviceOK = true;
var serveraddr = "";
var serverurl = "";
var IsReconnect = false;

var u = navigator.userAgent;
var app = navigator.appVersion;
var isAndroid = u.indexOf('Android') > -1 || u.indexOf('Linux') > -1; // Android
var isIos = !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/); // iOS
var isChrome = u.indexOf("Chrome") !== -1 // Chrome
var isWeixin = u.indexOf('micromessenger') != -1;  // WeChat in-app browser



var configuration = {
	"iceServers": [{
		'urls': [
			'stun:webrtc.qq-kan.com:3478?transport=udp',
		]
	}]
};


// Hide loading spinner etc. when video starts playing
function OnVideoPlaying() {
	console.log("<video>   OnVideoPlaying----------------");
	IsVideoPlaying = true;

	var loading = document.getElementById('loading');
	loading.style.display = "none";

	if (isChrome == true) {
		// remoteVideo.muted = false;
	}

};
function OnVideoPlay() {
	// console.log("<video> event OnVideoPlay------");

};
function OnVideoLoadedMetaData() {
	console.log("<video> event OnVideoLoadedMetaData----------------");
	var playPromise = remoteVideo.play();
	if (playPromise) {
		playPromise.then(() => {

		}).catch((e) => {
			console.log("play.", e.message);
		});
	}


};
function OnVideoCanPlay() {

	console.log("<video>  OnVideoCanPlay-----videoWidth = ", remoteVideo.videoWidth);
	console.log("<video>  OnVideoCanPlay-----videoHeight = ", remoteVideo.videoHeight);
	console.log("<body>  OnVideoCanPlay------clientWidth = ", document.documentElement.clientWidth);
	console.log("<body>  OnVideoCanPlay------clientHeight = ", document.documentElement.clientHeight);

	var Videos = document.querySelector('#videos');
	Videos.style.width = "100%";
	var temheight = document.documentElement.clientWidth * remoteVideo.videoHeight / remoteVideo.videoWidth;

	if (temheight > document.documentElement.clientHeight) {
		if (isIos) {
			Videos.style.height = Math.floor(document.documentElement.clientWidth * remoteVideo.videoHeight / remoteVideo.videoWidth) + "px";
		} else {
			Videos.style.height = Math.floor(document.documentElement.clientHeight) + "px";
		}
	} else {
		Videos.style.height = Math.floor(document.documentElement.clientWidth * remoteVideo.videoHeight / remoteVideo.videoWidth) + "px";
	}
	console.log("<video>----------------height ", Videos.style.height);



};
function OnVideoError() {
	// console.log("<video> event OnVideoError----------------");

};
function OnVideoLoadedData() {
	// console.log("<video> event OnVideoLoadedData----------------");

};


function NewgetUserMedia(constrains, success, error) {// Compatibility shim for user media
	console.log("NewgetUserMedia----------------");
	if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {// Standard API
		navigator.mediaDevices.getUserMedia(constrains).then(success).catch(error);
	} else if (navigator.webkitGetUserMedia) {// WebKit
		navigator.webkitGetUserMedia(constrains).then(success).catch(error);
	} else if (navigator.mozGetUserMedia) {// Firefox
		navagator.mozGetUserMedia(constrains).then(success).catch(error);
	} else if (navigator.getUserMedia) {// Legacy API
		navigator.getUserMedia(constrains).then(success).catch(error);
	} else if (navigator.msGetUserMedia) {
		navigator.msGetUserMedia(constrains).then(success).catch(error);
	} else {
		CheckedgetUserMedia = true;
		IsLocalAudioTrack = false;
		console.log("Your browser no getUserMedia function");
	}
}
/**
 * Main entry: start WebRTC session.
 *
 * @param server      Signaling server host (and port)
 * @param serno       Remote device ID
 * @param videoview   <video> element for remote A/V
 * @param conmode     Connection mode: string "live" (real-time) or "play" (playback)
 * @param consource   If conmode is "live": main or sub stream ("MainStream", "SubStream").
 *                    If conmode is "play": media file name to play
 * @param twowayaudio Enable two-way audio (intercom), bool
 * @param datachannel Use RTCDataChannel for app data, bool
 */
function RHRTCStart(server, serno, videoview, conmode, consource, twowayaudio, datachannel) {
	console.log("Your browser " + u);
	console.log("Your browser navigator appVersion " + app);
	if (isIos) {
		var Videos = document.querySelector('#videos');
		Videos.style.width = "100%";
		Videos.style.height = document.body.clientWidth * 720 / 1280 + "px";

	}
	videoview.addEventListener('playing', OnVideoPlaying);
	videoview.addEventListener('play', OnVideoPlay);
	videoview.addEventListener('loadedmetadata', OnVideoLoadedMetaData);
	videoview.addEventListener('canplay', OnVideoCanPlay);
	videoview.addEventListener('error', OnVideoError);
	videoview.addEventListener('loadeddata', OnVideoLoadedData);

	// Note: for two-way audio, obtain a stream via getUserMedia before/during RTCPeerConnection
	// and add it with addTrack or addStream; otherwise media is receive-only.
	remoteVideo = videoview;
	if (twowayaudio == true) {
		IsLocalAudioTrack = true;
		NewgetUserMedia({ video: false, audio: { autoGainControl: true, noiseSuppression: true, echoCancellation: true, volume: 1.0 } }, streamHandler, errorHandler);
	} else {
		if (isWeixin == true && isIos == false) {
			IsLocalAudioTrack = true;
			NewgetUserMedia({ video: false, audio: { autoGainControl: true, noiseSuppression: true, echoCancellation: true, volume: 1.0 } }, streamHandler, errorHandler);
		} else if (isWeixin == true && isIos == true) {
			console.log("Your browser Weixin addEventListener WeixinJSBridgeReady");
			document.addEventListener("WeixinJSBridgeReady", function () {
				var playPromise = remoteVideo.play();
				if (playPromise) {
					playPromise.then(() => {

					}).catch((e) => {
						console.log("play.", e.message);
					});
				}
			}, false);

		} else {
			if (isChrome == true && isIos == false) {
				//IsLocalAudioTrack = true;
				// NewgetUserMedia({video: false, audio: {autoGainControl:true,noiseSuppression: true,echoCancellation: true,volume:1.0}},streamHandler,errorHandler);
				CheckedgetUserMedia = true;
				remoteVideo.muted = true;

			} else {
				CheckedgetUserMedia = true;
			}
		}

	}

	IsLocalDataChannel = datachannel;
	serveraddr = server;
	peerid = serno;
	meid = uuid();
	sessionId = uuid();


	if (conmode === "live" || conmode === "play") {
		connectmode = conmode;
		connectsource = consource;
	} else {
		connectmode = "live";
		connectsource = "MainStream";
	}
	var ishttps = 'https:' == document.location.protocol ? true : false;
	if (ishttps) {
		serverurl = "wss://" + serveraddr + "/wswebclient/" + meid;
	} else {
		serverurl = "ws://" + serveraddr + "/wswebclient/" + meid;
	}
	websocketConnect(serverurl);

	var heartCheck = {
		timeout: 5000,
		timedelay: 0,
		serverTimeoutObj: null,
		reset: function () {
			clearTimeout(this.timeoutObj);
			clearTimeout(this.serverTimeoutObj);
			return this;
		},
		start: function () {
			var self = this;
			this.serverTimeoutObj = setInterval(function () {
				self.timedelay++;
				if (conn.readyState == 1) {
					if (IsReconnect == true) {
						handleLeave();
						sessionId = uuid();
						Connect();
					} else {
						if (self.timedelay > 30) {

							self.timedelay = 0;
							sendToServer({
								"eventName": "__ping",
								"data": {
									"sessionId": sessionId,
									"sessionType": "IE",
									"messageId": uuid(),
									"from": meid,
									"to": peerid
								}
							});

						}

					}

					heartCheck.reset().start();    // Connection OK — reset heartbeat
				} else {
					meid = uuid();
					sessionId = uuid();
					var ishttps = 'https:' == document.location.protocol ? true : false;
					if (ishttps) {
						serverurl = "wss://" + serveraddr + "/wswebclient/" + meid;
					} else {
						serverurl = "ws://" + serveraddr + "/wswebclient/" + meid;
					}

					websocketConnect(serverurl);
					console.log("Disconnected, attempting reconnect");

				}
			}, this.timeout)
		}
	};
	heartCheck.reset().start();

};
function uuid() {
	var s = [];
	var hexDigits = "0123456789abcdef";
	for (var i = 0; i < 36; i++) {
		s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
	}
	s[14] = "4"; // bits 12-15 of the time_hi_and_version field to 0010
	s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1); // bits 6-7 of the clock_seq_hi_and_reserved to 01
	s[8] = s[13] = s[18] = s[23] = "-";
	var uuid = s.join("");
	return uuid;
};
function websocketConnect(serverurl) {

	conn = new WebSocket(serverurl);
	conn.onmessage = function (msg) {

		var data = JSON.parse(msg.data);
		switch (data.eventName) {
			case "_create":
				handleCreate(data.data);
				break;
			case "_offer":
				handleOffer(data.data);
				break;
			case "_answer":
				handleAnswer(data.data);
				break;
			case "_ice_candidate":
				handleCandidate(data.data);
				break;
			case "_session_disconnected":
				handleDisconnect(data.data);
				break;
			case "_post_message":
				handlePostMessage(data.data);
				break;
			case "_connectinfo":
				handleConnectInfo(data.data);
				break;
			case "_session_failed":
				handleSessionFailed(data.data);
				break;
			case "_ping":
				break;
			default:
				console.log("Got default message", msg.data);
				break;
		}
	};

	conn.onerror = function (err) {
		IsWebSocketConnected = false;
		console.log("websocket onerror", err);
	};
	conn.onclose = function (data) {
		IsWebSocketConnected = false;
		console.log("websocket  onclose", data);
		handleLeave();
	};
	conn.onopen = function () {
		console.log("websocket open");
		IsWebSocketConnected = true;
		if (conn.readyState == 1) {
			Connect();

		} else {
			setTimeout(() => {
				if (conn.readyState == 1) {
					Connect();
				}
			}, 100);
		}
	};

}

function handleConnectInfo(data) {
	console.log("Got ConnectInfo Message:", data.message);
};

function handleSessionFailed(data) {
	console.log("handleSessionFailed ");
	sendDisconnect();
	IsReconnect = true;
};

/**
 * websocket for sending JSON encoded messages
 * Sent to server; server forwards to the other peer
 * @param message
 */
function sendToServer(message) {
	if (conn != null) {
		conn.send(JSON.stringify(message));
	}
};

/**
 * After login, server responds; handle success / failure here
 * @param success
 */
function handleCreate(data) {
	console.log("WebSocket _create", JSON.stringify(data));
	// ICE / peer list from server
	if (data.state === "online" || data.state === "sleep") {

		IsWebSocketCreateed = true;
		if (data.iceServers !== null || data.iceServers !== undefined || data.iceServers !== '') {
			//console.log("WebSocket iceServers", data.iceServers); 
			// Server supplies ICE config for RTCPeerConnection
			//configuration = JSON.parse(data.iceServers); 
			if (data.iceServers.constructor === Object) {

				//console.log(" _create  iceServers ---object ---- ", JSON.stringify(data.iceServers));
				configuration = JSON.parse(JSON.stringify(data.iceServers));

			} else {
				// console.log(" _create  iceServers ---string ---- :", data.iceServers);
				configuration = JSON.parse(data.iceServers);

			}
		}
		if (CheckedgetUserMedia == true && StartCalled == false) {

			console.log("handleCreate  start call");
			Call();
		} else {
			//console.log("handleCreate  CheckedgetUserMedia =",CheckedgetUserMedia," StartCalled=",StartCalled);
		}

	} else {
		console.log("WebSocket _create  offline");
	}
};
/**
 * Send __call so the device starts the offer.
 * @param
 * user / pwd: device auth; device validates via webrtc_streamer_authentication_callback (0 = fail).
 * Omit both if authentication is not required.
 */
function Connect() {

	sendToServer({
		"eventName": "__connectto",
		"data": {
			"sessionId": sessionId,
			"sessionType": "IE",
			"messageId": uuid(),
			"from": meid,
			"to": peerid
		}
	});

};
function Call() {
	//console.log("call");     
	StartCalled = true;
	var audioenable = "sendrecv";
	var videoenable = "sendrecv";
	var datachannelenable = "true";
	if (IsLocalDataChannel == false) {
		datachannelenable = "false";
	}
	if (IsLocalAudioTrack == false) {
		audioenable = "recvonly";
	}
	if (IsLocalVideoTrack == false) {
		videoenable = "recvonly";
	}
	console.log("call audio ", audioenable, " video ", videoenable, " datachannel", datachannelenable);
	sendToServer({
		"eventName": "__call",
		"data": {
			"sessionId": sessionId,
			"sessionType": "IE",
			"messageId": uuid(),
			"from": meid,
			"to": peerid,
			"mode": connectmode,
			"source": connectsource,
			"datachannel": datachannelenable,
			"audio": audioenable,
			"video": videoenable,
			"user": "admin",
			"pwd": "123456",
			"iceservers": JSON.stringify(configuration)
		}
	});


};
/**
 * When the device sends an offer
 * @param offer SDP offer
 * @returns {Promise<void>}
 * After offer: create RTCPeerConnection, setRemoteDescription, then send answer to device
 */
async function handleOffer(data) {
	// Create peer connection if missing
	console.log("Offer --- ---- sdp  :\n", data.sdp);
	IsReconnect = false;
	handleLeave();
	if (RTCPeerConnectionCreated == false) {
		initPeerConnection();
	}
	if (RTCPeerConnectionCreated == false) {
		console.log("handleOffer Failed   RTCPeerConnectionCreated = ", RTCPeerConnectionCreated);
		sendDisconnect();
		IsReconnect = true;
		return;
	}

	let nativeRTCSessionDescription = (window.mozRTCSessionDescription || window.RTCSessionDescription);
	try {
		await myPeerConnection.setRemoteDescription(new nativeRTCSessionDescription({ type: 'offer', sdp: data.sdp }));
	} catch (err) {
		console.log("Error when setRemoteDescription-----------------------------", err.message);
		IsReconnect = true;
		return;
	}


	//create an answer to an offer


	await myPeerConnection.createAnswer().then(function (answer) {
		answer.sdp = answer.sdp.replace('minptime=10;useinbandfec=1', 'minptime=10;useinbandfec=1;maxplaybackrate=8000;stereo=0');
		myPeerConnection.setLocalDescription(answer);
		console.log("Answer sdp :\n" + answer.sdp);
		sendToServer({
			"eventName": "__answer",
			"data": {
				"sessionId": sessionId,
				"sessionType": "IE",
				"messageId": uuid(),
				"from": meid,
				"to": peerid,
				"type": answer.type,
				"sdp": answer.sdp
			}
		});
	}).catch(function (error) {
		console.log("Error when create  Answer-----------------------------", error.message);
		sendDisconnect();
		IsReconnect = true;
	});


};

/**
 * when we got an answer from a remote user
 * @param answer SDP answer from peer
 * @returns {Promise<void>}
 */
async function handleAnswer(answer) {
	try {
		let nativeRTCSessionDescription = (window.mozRTCSessionDescription || window.RTCSessionDescription);
		await myPeerConnection.setRemoteDescription(new nativeRTCSessionDescription({ type: answer.type, sdp: answer.sdp }));
	} catch (err) {
		console.log("handleAnswer", err.message);
	}


};

/**
 * when we got an ice candidate from a remote user
 * @param candidate ICE candidate from peer
 */
function handleCandidate(data) {
	var obj = JSON.parse(data.candidate);

	if (myPeerConnection != null && RTCPeerConnectionCreated == true) {
		console.log("candidate --- ----   :", obj.candidate);
		let nativeRTCIceCandidate = (window.mozRTCIceCandidate || window.RTCIceCandidate);
		var candidate = new nativeRTCIceCandidate({ sdpMLineIndex: obj.sdpMLineIndex, sdpMid: obj.sdpMid, candidate: obj.candidate });
		myPeerConnection.addIceCandidate(candidate);
	} else {
		IceCandidate.push(obj);
	}
};
function handleDisconnect(data) {

	if (data.sessionId == sessionId) {
		console.log("handleDisconnect ", JSON.stringify(data));
		handleLeave();
		IsReconnect = true;
	}
};
/**
 * Send disconnect to peer via signaling
 */

function sendDisconnect() {
	console.log("sendDisconnect----------------");
	sendToServer({
		"eventName": "__disconnected",
		"data": {
			"sessionId": sessionId,
			"sessionType": "IE",
			"messageId": uuid(),
			"from": meid,
			"to": peerid
		}
	});
};
/**
 * Tear down peer connection and data channel
 */
function handleLeave() {
	// Disconnect all our event listeners; we don't want stray events
	// to interfere with the hangup while it's ongoing.
	if (myDataChannel != null) {
		myDataChannel.close();
		myDataChannel.onopen = null;
		myDataChannel.onclose = null;
		myDataChannel.onmessage = null;
		myDataChannel.onerror = null;

		myDataChannel = null;
	}
	if (myPeerConnection != null) {
		myPeerConnection.getSenders().forEach(sender => {
			myPeerConnection.removeTrack(sender);
		});
		myPeerConnection.close();
		myPeerConnection.onicecandidate = null;
		myPeerConnection.onaddstream = null;
		myPeerConnection.ontrack = null;
		myPeerConnection.onsignalingstatechange = null;
		myPeerConnection.onicegatheringstatechange = null;
		//myPeerConnection.onnotificationneeded = null;

		myPeerConnection = null;
	}
	RTCPeerConnectionCreated = false;
	StartCalled = false;
	IceCandidate.splice(0, IceCandidate.length);
};

function getObjectURL(stream) {
	var url = null;
	try {
		if (window.createObjectURL != undefined) { // basic
			url = window.createObjectURL(stream);
		} else if (window.URL != undefined) { // mozilla(firefox)
			url = window.URL.createObjectURL(stream);
		} else if (window.webkitURL != undefined) { // webkit or chrome
			url = window.webkitURL.createObjectURL(stream);
		}
	}
	catch (error) {
		url = null;
	}
	return url;
};
//**********************
//Init a peer connection
//**********************
function initPeerConnection() {
	// Vendor-prefixed RTCPeerConnection where needed

	let PeerConnection = (window.RTCPeerConnection || window.PeerConnection || window.webkitPeerConnection00 || window.webkitRTCPeerConnection || window.mozRTCPeerConnection);

	try {
		myPeerConnection = new PeerConnection(configuration);
		if (myPeerConnection != null) {


			if ("addTrack" in myPeerConnection) {
				if (stream != null) {
					stream.getTracks().forEach(track => {
						myPeerConnection.addTrack(track, stream);
						if (track.kind === 'audio') {
							track.enabled = mute;

						}
					});
				} else {
					console.log('PeerConnection  addTrack  stream is null');
				}
			} else {
				if (stream != null) {
					myPeerConnection.addStream(stream);
					stream.getTracks().forEach(track => {
						if (track.kind === 'audio') {
							track.enabled = mute;
						}
					});

				} else {
					console.log('PeerConnection  addStream is null');

				}
			}


			//**********************
			//Register event process needed
			//**********************
			// setup stream listening
			if ("ontrack" in myPeerConnection) {
				//when a remote user adds stream to the peer connection, we display it
				myPeerConnection.ontrack = handleRemoteTrackAdded;

			} else {
				//when a remote user adds stream to the peer connection, we display it
				myPeerConnection.onaddstream = handleRemoteStreamAdded;

			}
			// Setup other events
			myPeerConnection.onicecandidate = handleIceCandidate;
			myPeerConnection.oniceconnectionstatechange = handleIceConnectionStateChangeEvent;
			myPeerConnection.onicegatheringstatechange = handleIceGatheringStateChangeEvent;
			myPeerConnection.onsignalingstatechange = handleSignalingStateChangeEvent;
			//myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;
			if (IsLocalDataChannel == true) {
				try {
					myDataChannel = myPeerConnection.createDataChannel("mydatachannel");
					if (myDataChannel) {
						myDataChannel.onopen = handleDataChannelOnOpen;
						myDataChannel.onclose = handleDataChannelOnClose;
						myDataChannel.onmessage = handleDataChannelOnMessage;
						myDataChannel.onerror = handleDataChannelOnError;
					}
				} catch (error) {
					console.log("data_channel_create_error  ");

				}
			}
			RTCPeerConnectionCreated = true;


		} else {
			console.log('Failed to create PeerConnection');
			RTCPeerConnectionCreated = false;
		}
	} catch (e) {
		console.log('Failed to create PeerConnection, exception: ' + e.message);
		RTCPeerConnectionCreated = false;
		return;
	}

};
// RTCDataChannel handlers: onopen, onclose, onmessage, onerror
////////////////////////////////////////////////////////////////////////
function handleDataChannelOnOpen() {
	console.log('handleDataChannelOnOpen');
};
function handleDataChannelOnClose(event) {
	console.log('handleDataChannelOnClose ', event);
};
function handleDataChannelOnMessage(message) {
	console.log('handleDataChannelOnMessage ', message);
	var json;
	json = JSON.parse(message.data);
	if (json.type === '__file') {
	} else if (json.type === '__msg') {
		console.log('handleDataChannelOnClose recive message data', json.data);

	} else {
		console.log('handleDataChannelOnClose recive message data', json.data);
	}

};
function handleDataChannelOnError(err) {
	console.log('handleDataChannelOnError ', err);
};
/////////////////////////////////////////////////////////////////////////////

// Handles |icecandidate| events by forwarding the specified
// ICE candidate (created by our local ICE agent) to the other
// peer through the signaling server.
async function handleIceCandidate(event) {
	if (event.candidate) {
		console.log('onicecandidate: ' + event.candidate.candidate);
		sendToServer({
			"eventName": "__ice_candidate",
			"data": {
				"sessionId": sessionId,
				"sessionType": "IE",
				"messageId": uuid(),
				"to": peerid,
				"from": meid,
				"candidate": JSON.stringify({ 'candidate': event.candidate.candidate, 'sdpMid': event.candidate.sdpMid, 'sdpMLineIndex': event.candidate.sdpMLineIndex })
			}
		});
	}
};

// Called by the WebRTC layer when events occur on the media tracks
// on our WebRTC call. This includes when streams are added to and
// removed from the call.
//
// track events include the following fields:
//
// RTCRtpReceiver       receiver
// MediaStreamTrack     track
// MediaStream[]        streams
// RTCRtpTransceiver    transceiver
//
// In our case, we're just taking the first stream found and attaching
// it to the <video> element for incoming media.
async function handleRemoteTrackAdded(e) {

	if (remoteVideo != null) {
		if ("srcObject" in remoteVideo) {
			// console.log("handleRemoteTrackAdded attachStream srcObject stream id = ",e.streams[0].id); 
			e.streams[0].getTracks().forEach(track => {
				// console.log('handleRemoteTrackAdded  type',track.kind);
				if (track.kind === 'audio') {
					track.enabled = speak;
				}

			});
			remoteVideo.srcObject = e.streams[0];
			if (IsSystemAudioDeviceOK == false) {
				remoteVideo.muted = true;
			}

		} else {
			// Avoid on modern browsers; deprecated
			var objUrl = getObjectURL(e.streams[0]);
			// console.log("handleRemoteTrackAdded attachStream getObjectURL stream id = ",e.streams[0].id); 
			remoteVideo.src = objUrl;
			e.streams[0].getTracks().forEach(track => {
				// console.log('handleRemoteTrackAdded  type',track.kind);
				if (track.kind === 'audio') {
					track.enabled = speak;
				}

			});
			if (IsSystemAudioDeviceOK == false) {
				remoteVideo.muted = true;
			}

		}

	}

};
//since addstream is desperated
async function handleRemoteStreamAdded(e) {

	if (remoteVideo != null) {

		if ("srcObject" in remoteVideo) {
			//console.log("handleRemoteStreamAdded attachStream srcObject stream id = ",e.stream.id);  
			remoteVideo.srcObject = e.stream;

			e.stream.getTracks().forEach(track => {
				//console.log('handleRemoteTrackAdded  type',track.kind);
				if (track.kind === 'audio') {
					track.enabled = speak;
				}

			});



		} else {
			// Avoid on modern browsers; deprecated
			var objUrl = getObjectURL(e.stream);
			//console.log("handleRemoteStreamAdded attachStream getObjectURL stream id = ",e.stream.id); 
			remoteVideo.src = objUrl;

			e.stream.getTracks().forEach(track => {
				// console.log('handleRemoteTrackAdded  type',track.kind);
				if (track.kind === 'audio') {
					track.enabled = speak;
				}

			});

		}

	}
};

/**
 * getUserMedia success handler
 * @param myStream
 */
function streamHandler(myStream) {
	// console.log("getUserMedia::streamHandler",myStream);
	stream = myStream;
	//displaying local video stream on the page
	window.localStream = stream;
	CheckedgetUserMedia = true;
	IsSystemAudioDeviceOK = true;

	if ("getTracks" in stream) {
		// console.log('streamHandler getTracks');
		if (stream != null) {
			stream.getTracks().forEach(track => {
				//console.log('streamHandler getTracks type',track.kind);
				if (track.kind === "audio") {
					IsLocalAudioTrack = true;

				} else if (track.kind === "video") {
					IsLocalVideoTrack = true;
				}
			});
		}
	}

	if (StartCalled == false && IsWebSocketCreateed == true) {
		console.log("streamHandler  start call");
		Call();
	}

};
/**
 * getUserMedia error handler
 * @param error
 */
function errorHandler(error) {
	console.log("errorHandler", error);
	CheckedgetUserMedia = true;
	IsSystemAudioDeviceOK = false;
	if (StartCalled == false && IsWebSocketCreateed == true) {
		IsLocalAudioTrack = false;
		console.log("errorHandler  start call");
		Call();
	}
};

// Handle |iceconnectionstatechange| events. This will detect
// when the ICE connection is closed, failed, or disconnected.
//
// This is called when the state of the ICE agent changes.

async function handleIceConnectionStateChangeEvent(event) {
	if (myPeerConnection == null) {
		return;
	}
	console.log("*** ICE connection state changed to " + myPeerConnection.iceConnectionState);

	switch (myPeerConnection.iceConnectionState) {
		case "closed":
		case "failed":
		case "disconnected":
			sendDisconnect();
			IsReconnect = true;
			break;
		// zsc added — verify
		case "connected":


			break;
	}
};

// Handle the |icegatheringstatechange| event. This lets us know what the
// ICE engine is currently working on: "new" means no networking has happened
// yet, "gathering" means the ICE engine is currently gathering candidates,
// and "complete" means gathering is complete. Note that the engine can
// alternate between "gathering" and "complete" repeatedly as needs and
// circumstances change.
//
// We don't need to do anything when this happens, but we log it to the
// console so you can see what's going on when playing with the sample.

async function handleIceGatheringStateChangeEvent(event) {
	if (myPeerConnection == null) {
		return;
	}
	console.log("*** ICE gathering state changed to: " + myPeerConnection.iceGatheringState);
};

// Set up a |signalingstatechange| event handler. This will detect when
// the signaling connection is closed.
//
// NOTE: This will actually move to the new RTCPeerConnectionState enum
// returned in the property RTCPeerConnection.connectionState when
// browsers catch up with the latest version of the specification!

async function handleSignalingStateChangeEvent(event) {
	if (myPeerConnection == null) {
		return;
	}
	console.log("*** WebRTC signaling state changed to: " + myPeerConnection.signalingState);
	switch (myPeerConnection.signalingState) {
		case "closed":
			handleLeave();
			break;
	}
};
// PostMessage over signaling WebSocket
function PostMessage(message, callback) {
	if (IsWebSocketConnected == true) {
		var messageid = uuid();
		messagecallback = callback;
		sendToServer({
			"eventName": "__post_message",
			"data": {
				"sessionType": "IE",
				"messageId": messageid,
				"to": peerid,
				"from": meid,
				"message": message
			}
		});

	} else {
	}
};
// Signaling response for PostMessage
function handlePostMessage(data) {
	var messageid = data.messageId;
	if (messagecallback === undefined || messagecallback === null) {

	} else {
		typeof (messagecallback) === 'function' && messagecallback(data.message);
		messagecallback = null;
	}
};
// Send app message to device over DataChannel
function DataChannelSendMessage(message) {
	if (myDataChannel != null) {
		if (myDataChannel.readyState.toLowerCase() === 'open') {
			myDataChannel.send(JSON.stringify({
				type: "__msg",
				data: message
			}));
		} else {
			console.log("Failed sendMessage   ------------------------- -----", myDataChannel.readyState.toLowerCase());
		}
	}
};

function setlocalaudio(enable) {
	if (myPeerConnection != null) {
		mute = enable;
		myPeerConnection.getSenders().forEach(function (sender) {
			if (sender.track.kind === 'audio') {
				sender.track.enabled = mute;
			}

		});

	} else {

	}
};
function setlocalspeak(enable) {

	if (myPeerConnection != null) {
		speak = enable;
		myPeerConnection.getReceivers().forEach(function (receiver) {
			if (receiver.track.kind === 'audio') {
				receiver.track.enabled = speak;
			}

		});


	} else {

	}

};


