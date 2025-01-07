import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

import Home from './components/Home';
import Call from './components/Call';

import { peerConnectionConfig } from './js/webrtcUtils';


function App() {
  const [userPhone, setUserPhone] = useState(0);
  const [remotePhone, setRemotePhone] = useState(0);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [signalingSocket, setSignalingSocket] = useState(null);
  const [callStatus, setCallStatus] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [popup, setPopup] = useState({ present: false, message: "", class: "" });

  // webrtc
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);

  const iceCandidateQueue = [];

  const baseURL = (process.env.NODE_ENV === "production")
    ? process.env.REACT_APP_API_BASE_URL
    : process.env.REACT_APP_API_BASE_URL_DEV;
  const wsURL = baseURL.replace('http', 'ws');

  useEffect(() => {
    // Get userPhone on page load
    const fetchUserDetails = async () => {
      let url = `${baseURL}/api/get-user-details/`;
      try {
        const response = await axios.get(url, { withCredentials: true });

        console.log('fetchUserDetails > response.data', response.data)
        setUserPhone(response.data.user_phone);

      } catch (error) {
        console.error('Error fetching: ', error);
      }
    }
    fetchUserDetails();
  }, []);

  useEffect(() => {
    // Open websocket connection when userPhone is available
    const openSignalingSocket = () => {
      try {
        const ws = new WebSocket(`${wsURL}/ws/signaling/`);

        ws.onopen = () => {
          console.log('openWebSocket > WebSocket opened, registering userPhone:', userPhone);
          ws.send(JSON.stringify({
            type: 'register',
            user_phone: userPhone,
          }));
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          showErrorPopup(error.message);
        };

        ws.onclose = () => {
          console.log('WebSocket closed');
        };

        setSignalingSocket(ws);

      } catch (error) {
        console.error('Error initialising WebSocket:', error);
        showErrorPopup(error.message);
      }
    }

    // Open new signaling websocket when userPhone is updated
    if (userPhone !== 0) {
      if (signalingSocket) signalingSocket.close();
      openSignalingSocket();
    };

    return () => {
      if (signalingSocket) {
        signalingSocket.close();
      }
    };
  }, [userPhone]);

  useEffect(() => {
    // Set up the onmessage event handler when signalingSocket is available
    if (signalingSocket) {
      signalingSocket.onmessage = async (event) => {
        const eventData = JSON.parse(event.data);
        await handleIncomingSignalingData(eventData);
      };
    }
  }, [signalingSocket, localStream, peerConnection]);

  useEffect(() => {
    // Process each candidate in the queue when the peerConnection is established
    console.log('peerConnection:', peerConnection);
    if (peerConnection && peerConnection.remoteDescription) {
      processIceCandidateQueue();
    }
  }, [peerConnection?.remoteDescription]);


  // Close streams and peer connection when call ends
  useEffect(() => {
    if (!callStatus) {
      console.log('ending call');
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      }
      // if (localVideoRef.current) localVideoRef.current.srcObject = null;

      if (remoteStream) {
        remoteStream.getTracks().forEach((track) => track.stop());
        setRemoteStream(null);
      }
      // if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

      if (peerConnection) {
        peerConnection.close();
        setPeerConnection(null);
      }

      setIsConnected(false);

      setRemotePhone(0);
    }
  }, [callStatus]);




  const showErrorPopup = (message) => {
    if (callStatus) {
      sendSignalingMessage({
        type: 'disconnection',
        callerPhone: userPhone,
        remotePhone,
        message
      });
      setCallStatus(null);
    }
    setPopup({ present: true, message: `${message}, reload and try again`, class: "error" });
  }

  const sendSignalingMessage = (message) => {
    if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
      signalingSocket.send(JSON.stringify(message));
      if (message.type !== 'candidate')
        console.log('sendSignalingMessage > Signaling message sent via WebSocket:', message);
    } else {
      console.error('WebSocket is not connected.');
      showErrorPopup('WebSocket is not connected');
    }
  };

  const handleIncomingSignalingData = async (data) => {
    if (data.type !== 'candidate')
      console.log('handleIncomingSignalingData > data', data, 'userPhone', userPhone);

    // List of connected users
    if (data.type === 'user_list') {
      setConnectedUsers(data.user_list);
    }
    // Incoming call request. Accept or Decline
    else if (data.type === 'call_request' && data.receiverPhone === userPhone && !callStatus) {
      const confirmed = confirm(`Incoming call from ${data.callerPhone}. Accept?`);
      if (confirmed) {
        await acceptCall(data.callerPhone, data.receiverPhone);

      } else {
        sendSignalingMessage({
          type: 'decline',
          callerPhone: data.callerPhone,
          receiverPhone: data.receiverPhone,
        });
      }

    }
    else if (data.type === 'call_request' && data.receiverPhone === userPhone && callStatus) {
      sendSignalingMessage({
        type: 'occupied',
        callerPhone: data.callerPhone,
        receiverPhone: data.receiverPhone,
      });
    }
    // Receiver accepted call request. Caller create and send offer
    else if (data.type === 'accept' && data.callerPhone === userPhone) {
      try {
        console.log('handleIncomingSignalingData > accept, data.receiverPhone:', data.receiverPhone);
        console.log('localStream', localStream)
        if (localStream) {
          await createOffer(data.receiverPhone);
        } else {
          console.error("No local stream.");
          showErrorPopup("No local stream");
        }
      } catch (error) {
        console.error("Error in createOffer:", error);
        showErrorPopup(error.message);
      }
    }
    // Offer received from caller. Receiver create and send answer
    else if (data.type === 'offer' && data.receiverPhone === userPhone) {
      try {
        console.log('handleIncomingSignalingData > offer, localStream', localStream)
        if (localStream) {
          await handleOffer(data.offer, data.callerPhone);
          // Process queued candidates after setting the remote description
          // processIceCandidateQueue();
        } else {
          console.error("No local stream.");
          showErrorPopup("No local stream");
        }
      } catch (error) {
        console.error("Error in handleOffer:", error);
        showErrorPopup(error.message);
      }

    }
    // ICE candidate received
    else if (data.type === 'candidate') {
      // Queue candidates if peer connection or remote description is not ready
      if (!peerConnection || !peerConnection.remoteDescription) {
        iceCandidateQueue.push(data.candidate);
        console.log('Candidate queued');
        // console.log('Candidate queued:', data.candidate);
      }
      // handleCandidate if peerConnection present but not established
      else if (!isConnected) {
        await handleCandidate(data.candidate);
      }

    }
    // Answer received from receiver. Caller set remote description 
    else if (data.type === 'answer') {
      await handleAnswer(data.answer);

    }
    // Receiver declined the call
    else if (data.type === 'decline' && data.callerPhone === userPhone) {
      setCallStatus(null);
      setPopup({ present: true, message: "Call declined", class: "call-declined" });

    }
    // Other user has hung up
    else if (data.type === 'occupied' && data.callerPhone === userPhone) {
      setCallStatus(null);
      setPopup({ present: true, message: "Already in a call", class: "call-declined" });

    }
    // Other user has hung up
    else if (data.type === 'hangup') {
      setCallStatus(null);
      setPopup({ present: true, message: "Call ended", class: "call-hangup" });

    }
    else if (data.type === 'error' || data.type === 'disconnection') {
      setCallStatus(null);
      setPopup({ present: true, message: data.message, class: "error" });

    }
    else {
      console.log('Unhandled signaling data:', data);
    }
  };

  const processIceCandidateQueue = async () => {
    while (iceCandidateQueue.length > 0) {
      const candidate = iceCandidateQueue.shift();
      try {
        await handleCandidate(candidate);
        console.log('Queued candidate processed successfully:', candidate);
      } catch (error) {
        console.error('Error processing queued candidate:', error);
        showErrorPopup(error.message);
      }
    }
  };

  const startMediaStream = async () => {
    console.log('startMediaStream');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      return stream;

    } catch (error) {
      console.error('Error accessing local stream:', error);
      showErrorPopup(error.message);
    }
  };

  const createOffer = async (receiverPhone) => {
    console.log('createOffer > receiverPhone', receiverPhone);
    const pc = new RTCPeerConnection(peerConnectionConfig);
    setPeerConnection(pc);

    // Get the tracks in the MediaStream and add each track to the RTCPeerConnection. Any tracks that are added to the same stream on the local end of the connection will be on the same stream on the remote end.
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    // Triggered when a new media track is received from the remote peer
    pc.ontrack = (event) => {
      console.log('createOffer, setRemoteStream');
      const [receivedStream] = event.streams;
      setRemoteStream(receivedStream);
    };

    // Triggered when the ICE agent finds a new candidate
    pc.onicecandidate = (event) => {
      if (event.candidate && !isConnected) {
        console.log('createOffer > pc.onicecandidate');
        // console.log('createOffer > pc.onicecandidate:', event.candidate);
        sendSignalingMessage({
          type: 'candidate',
          candidate: event.candidate,
          receiverPhone: receiverPhone
        });
      }
    };

    // Monitor ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state changed:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        console.log('ICE connection established successfully');
        setIsConnected(true);
      } else if (pc.iceConnectionState === 'failed') {
        console.error('ICE connection failed. pc:', pc);
        setCallStatus(null);
        showErrorPopup('ICE connection failed.');
      }
      else if (pc.iceConnectionState === 'disconnected') {
        setCallStatus(null);
        setPopup({ present: true, message: 'User disconnected', class: "error" });
      }
    };

    // Initiate the creation of an SDP offer: includes information about any MediaStreamTrack objects already attached to the WebRTC session, codec, and options supported by the browser, and any candidates already gathered by the ICE agent,
    const offer = await pc.createOffer();

    // Set the offer as the description of the local end of the connection
    await pc.setLocalDescription(offer)

    sendSignalingMessage({
      type: 'offer',
      offer,
      callerPhone: userPhone,
      receiverPhone: receiverPhone
    });
  };


  const handleOffer = async (offer, callerPhone) => {
    console.log('handleOffer > callerPhone', callerPhone);
    const pc = new RTCPeerConnection(peerConnectionConfig);
    setPeerConnection(pc);

    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    pc.ontrack = (event) => {
      console.log('handleOffer, pc.ontrack setRemoteStream');
      const [receivedStream] = event.streams;
      setRemoteStream(receivedStream);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('handleOffer > pc.onicecandidate');
        sendSignalingMessage({
          type: 'candidate',
          candidate: event.candidate,
          receiverPhone: callerPhone
        });
      }
    };

    // Monitor ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state changed:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        console.log('ICE connection established successfully');
        setIsConnected(true);
      } else if (pc.iceConnectionState === 'failed') {
        console.error('ICE connection failed. pc:', pc);
        showErrorPopup('ICE connection failed.');
      }
      else if (pc.iceConnectionState === 'disconnected') {
        setCallStatus(null);
        setPopup({ present: true, message: 'User disconnected', class: "error" });
      }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(offer))

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer)

    sendSignalingMessage({
      type: 'answer',
      answer,
      callerPhone,
      receiverPhone: userPhone
    });

  };

  const handleAnswer = async (answer) => {
    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  };

  const handleCandidate = async (candidate) => {
    if (peerConnection && peerConnection.remoteDescription) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('ICE candidate added successfully');
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    } else {
      console.error('Remote description not set or peer connection is closed');
      showErrorPopup('Remote description not set or peer connection is closed');
    }
  };

  // Accept a call request and start local stream
  const acceptCall = async (callerPhone, receiverPhone) => {
    try {
      const stream = await startMediaStream();

      setCallStatus('incoming');
      setRemotePhone(callerPhone);
      setLocalStream(stream);

      sendSignalingMessage({
        type: 'accept',
        callerPhone,
        receiverPhone,
      });

    } catch (error) {
      console.error("Error in acceptCall:", error);
      showErrorPopup(error.message);
    }
  }

  // Send a call request and start local stream
  const makeCall = async (e) => {
    e.preventDefault();

    const receiverPhone = parseInt(e.target.receiverPhone.value, 10);
    if (receiverPhone === userPhone) {
      setCallStatus(null);
      setPopup({ present: true, message: "Can't call yourself", class: "error" });
      return;
    }

    try {
      const stream = await startMediaStream();

      console.log('MediaStream started when making call, stream:', stream);
      setCallStatus('outgoing');
      setRemotePhone(receiverPhone);
      setLocalStream(stream);

      sendSignalingMessage({
        type: 'call_request',
        callerPhone: userPhone,
        receiverPhone: receiverPhone
      });

    } catch (error) {
      console.error("Error in makeCall:", error);
      showErrorPopup(error.message);
    }
  };


  return (
    <>
      {!callStatus
        ?
        <Home
          makeCall={makeCall}
          userPhone={userPhone}
          popup={popup}
          setPopup={setPopup}
          connectedUsers={connectedUsers}
        />
        :
        <Call
          localStream={localStream}
          remoteStream={remoteStream}
          userPhone={userPhone}
          remotePhone={remotePhone}
          callStatus={callStatus}
          setCallStatus={setCallStatus}
          sendSignalingMessage={sendSignalingMessage}
        />
      }
    </>
  )
}

export default App
