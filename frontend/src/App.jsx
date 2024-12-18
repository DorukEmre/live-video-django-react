import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

import {
  videoCallIcon, videoCamIcon, globeIcon, copyIcon, checkIcon
} from './js/images';
import './App.css';
// import { getCookie } from './js/utils';
// import CSRFToken from './components/CSRFToken';

function App() {
  const [userPhone, setUserPhone] = useState(0);
  const [signalingSocket, setSignalingSocket] = useState(null);
  // const userPhoneRef = useRef(userPhone);

  // webrtc
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const baseURL = (process.env.NODE_ENV === "production") ? process.env.REACT_APP_API_BASE_URL : process.env.REACT_APP_API_BASE_URL_DEV;
  const wsURL = baseURL.replace('http', 'ws');
  const nodeenv = process.env.NODE_ENV;

  useEffect(() => {
    // Get userPhone on page load
    const getUserDetails = async () => {
      let url = `${baseURL}/api/get-user-details/`;
      try {
        const response = await axios.get(url, { withCredentials: true });
        // console.log("response.data: ", response.data);
        setUserPhone(response.data.user_phone);

        console.log('getUserDetails > response.data', response.data)
        return response.data;

      } catch (error) {
        console.error('Error fetching: ', error);
      }
    }
    getUserDetails();
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
        };

        ws.onclose = () => {
          console.log('WebSocket closed');
        };

        setSignalingSocket(ws);
      } catch (error) {
        console.error('Error initialising WebSocket:', error);
      }
    }

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
      signalingSocket.onmessage = (event) => {
        const eventData = JSON.parse(event.data);
        handleIncomingSignalingData(eventData);
      };
    }
  }, [signalingSocket, localStream, remoteStream]);


  const sendSignalingMessage = (message) => {
    if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
      signalingSocket.send(JSON.stringify(message));
      console.log('sendSignalingMessage > Signaling message sent via WebSocket:', message);
    } else {
      console.error('WebSocket is not connected.');
    }
  };

  const handleIncomingSignalingData = async (data) => {
    console.log('handleIncomingSignalingData > data', data, 'userPhone', userPhone);

    if (data.type === 'call' && data.receiverPhone === userPhone) { // incoming call
      const confirmed = confirm(`Incoming call from ${data.callerPhone}. Accept?`);
      if (confirmed) {
        await startLocalStream(); //
        createAnswer(data.callerPhone); // 

        console.log(`Accepted call from ${data.callerPhone}`);

        // sendSignalingMessage({
        //   type: 'accept',
        //   callerPhone: data.callerPhone, receiverPhone: data.receiverPhone,
        // });
      } else {
        console.log(`Declined call from ${data.callerPhone}`);

        sendSignalingMessage({
          type: 'decline',
          callerPhone: data.callerPhone, receiverPhone: data.receiverPhone,
        });
      }

    } else if (data.type === 'offer') {
      try {
        const stream = await startLocalStream();
        if (stream) {
          await handleOffer(data.offer, data.callerPhone, stream);
        } else {
          console.error("Failed to start local stream.");
        }
      } catch (error) {
        console.error("Error in makeCall:", error);
      }

    } else if (data.type === 'answer') {
      await handleAnswer(data.answer);
    } else if (data.type === 'candidate') {
      await handleCandidate(data.candidate);
    }
    else if (data.type === 'accept' && data.callerPhone === userPhone) { // target answers the call
      console.log(`Call from ${data.callerPhone} accepted by ${data.receiverPhone}`);
    }
    else if (data.type === 'decline' && data.callerPhone === userPhone) { // target declines the call
      console.log(`Call from ${data.callerPhone} declined by ${data.receiverPhone}`);
    }
    else if (data.type === 'error') {
      alert(`${data.message}`);
      console.log('data', data)
      // handle error
      if (data.dataType === 'offer') {
        if (localStream) {
          // cancel stream
          console.log('stopping local stream');
          localStream.getTracks().forEach(track => track.stop());
          localVideoRef.current.srcObject = null;

        }
      }
    }
    else {
      console.log('Unhandled signaling data:', data);
    }
    // Handle other signaling messages like ICE candidates, etc.
  };

  const startLocalStream = async () => {
    console.log('startLocalStream');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      return stream;
    } catch (error) {
      console.error('Error accessing local stream:', error);
    }
  };

  const createOffer = async (receiverPhone, stream) => {
    console.log('createOffer > receiverPhone', receiverPhone);
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' } // Google's public STUN server
      ],
      // iceTransportPolicy: 'relay' // only relay candidates
    });
    setPeerConnection(pc);

    // Add local tracks from the provided stream
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    setLocalStream(stream);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    // triggered when a new media track is received from the remote peer.
    pc.ontrack = (event) => {
      console.log('createOffer > pc.ontrack:', event);
      const [remoteStream] = event.streams;
      setRemoteStream(remoteStream);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('createOffer > pc.onicecandidate')
        sendSignalingMessage({ type: 'candidate', candidate: event.candidate, receiverPhone: receiverPhone });
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendSignalingMessage({ type: 'offer', offer, callerPhone: userPhone, receiverPhone: receiverPhone });
  };


  const handleOffer = async (offer, callerPhone, stream) => {
    console.log('handleOffer > callerPhone', callerPhone);
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' } // Google's public STUN server
      ],
      // iceTransportPolicy: 'relay' // only relay candidates
    });
    setPeerConnection(pc);

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    setLocalStream(stream);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    pc.ontrack = (event) => {
      console.log('handleOffer > pc.ontrack:', event);
      const [remoteStream] = event.streams;
      setRemoteStream(remoteStream);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('handleOffer > pc.onicecandidate')
        sendSignalingMessage({ type: 'candidate', candidate: event.candidate, receiverPhone: callerPhone });
      }
      // // filter some candidates out
      // if (event.candidate) {
      //   const candidate = event.candidate.candidate;
      //   if (!candidate.includes('172.')) { // Example: Skip Docker network candidates
      //     sendSignalingMessage(signalingSocket, {
      //       type: 'candidate',
      //       candidate: event.candidate,
      //       receiverPhone: receiverPhone
      //     });
      //   }
      // }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    sendSignalingMessage({ type: 'answer', answer, callerPhone, receiverPhone: userPhone });
  };

  const handleAnswer = async (answer) => {
    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  };

  const handleCandidate = async (candidate) => {
    if (peerConnection) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };


  // const makeCall = async (e) => {
  //   e.preventDefault();
  //   const receiverPhone = parseInt(e.target.receiverPhone.value, 10);
  //   if (receiverPhone === userPhone) {
  //     alert('You cannot call yourself');
  //     return;
  //   }

  //   sendSignalingMessage(signalingSocket, {
  //     type: 'call',
  //     callerPhone: userPhone, receiverPhone: receiverPhone,
  //   });
  // };

  const makeCall = async (e) => {
    e.preventDefault();
    const receiverPhone = parseInt(e.target.receiverPhone.value, 10);
    if (receiverPhone === userPhone) {
      alert('You cannot call yourself');
      return;
    }

    try {
      const stream = await startLocalStream();
      if (stream) {
        // console.log('stream:', stream);
        //   MediaStream { id: "{518ded96-7a7a-491b-9f36-dbc92da646d6}", active: true, onaddtrack: null, onremovetrack: null }
        await createOffer(receiverPhone, stream);
      } else {
        console.error("Failed to start local stream.");
      }
    } catch (error) {
      console.error("Error in makeCall:", error);
    }
  };


  const copyNumber = (e) => {
    navigator.clipboard.writeText(userPhone);
    const copyButton = document.getElementById('copyButton');
    if (copyButton) {
      const img = copyButton.querySelector('img');
      if (img) {
        img.src = checkIcon;
        img.alt = 'check icon';
        img.title = 'Copied';
        setTimeout(() => {
          img.src = copyIcon;
          img.alt = 'copy icon';
          img.title = 'Copy number';
        }, 1000);
      }
    }
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ height: '3em', padding: '1.5em' }}>
          <img src={globeIcon} alt="call icon" />
        </div>
        <h1>WebRTC Video Call</h1>
        <div style={{ height: '3em', padding: '1.5em' }}>
          <img src={videoCamIcon} alt="call icon" />
        </div>
      </div>
      <p>{nodeenv} mode</p>

      <form onSubmit={makeCall} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>

        {/* <CSRFToken /> */}

        <input type="number" name="receiverPhone" placeholder="Enter number to call" style={{ padding: '1em' }} />

        <button type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }} title='Make call'>
          <img src={videoCallIcon} alt="video call icon" style={{ height: '24px' }} />
          <span>Video Call</span>
        </button>

      </form>

      <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <p>Or share this number to be called: {userPhone}</p>
        <button id='copyButton' type="button" style={{ padding: '.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }} onClick={copyNumber}>
          <img src={copyIcon} alt="copy icon" style={{ height: '18px' }} title='Copy number' />
        </button>
      </div>

      <div>
        <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '300px' }} />
        <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '300px' }} />
      </div>

    </>
  )
}

export default App
