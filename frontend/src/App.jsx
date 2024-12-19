import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

import {
  videoCallIcon, videoCamIcon, globeIcon, copyIcon, checkIcon, callEndIcon
} from './js/images';
import './App.css';
// import { getCookie } from './js/utils';
// import CSRFToken from './components/CSRFToken';

function App() {
  const [userPhone, setUserPhone] = useState(0);
  const [remotePhone, setRemotePhone] = useState(0);
  const [signalingSocket, setSignalingSocket] = useState(null);
  const [inACall, setInACall] = useState(false);

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

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    // Close streams and peer connection when call ends
    if (!inACall) {
      console.log('ending call');
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      }
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteStream) {
        remoteStream.getTracks().forEach((track) => track.stop());
        setRemoteStream(null);
      }
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

      if (peerConnection) {
        peerConnection.close();
        setPeerConnection(null);
      }

      if (signalingSocket)
        sendSignalingMessage({ type: 'hangup', remotePhone });
      setRemotePhone(0);
    }
  }, [inACall]);

  const sendSignalingMessage = (message) => {
    if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
      signalingSocket.send(JSON.stringify(message));
      if (message.type !== 'candidate')
        console.log('sendSignalingMessage > Signaling message sent via WebSocket:', message);
    } else {
      console.error('WebSocket is not connected.');
    }
  };

  const handleIncomingSignalingData = async (data) => {
    if (data.type !== 'candidate')
      console.log('handleIncomingSignalingData > data', data, 'userPhone', userPhone);

    if (data.type === 'call' && data.receiverPhone === userPhone) { // incoming call
      const confirmed = confirm(`Incoming call from ${data.callerPhone}. Accept?`);
      if (confirmed) {
        await startMediaStream(); //
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
        const stream = await startMediaStream();
        if (stream) {
          console.log('MediaStream started when receiving offer');
          setInACall(true);
          setRemotePhone(data.callerPhone);
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
    else if (data.type === 'hangup') {
      console.log(`Call ended by ${data.callerPhone}`);
      setInACall(false);
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
      setInACall(false);
    }
    else {
      console.log('Unhandled signaling data:', data);
    }
    // Handle other signaling messages like ICE candidates, etc.
  };

  const startMediaStream = async () => {
    console.log('startMediaStream');
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
        { urls: 'stun:stun.l.google.com:19302' }
      ],
    });
    setPeerConnection(pc);

    // Get the tracks in the MediaStream and add each track to the RTCPeerConnection. Any tracks that are added to the same stream on the local end of the connection will be on the same stream on the remote end.
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    console.log('createOffer, setLocalStream:', stream);
    setLocalStream(stream);
    // if (localVideoRef.current) {
    //   localVideoRef.current.srcObject = stream;
    // }

    // Triggered when a new media track is received from the remote peer.
    pc.ontrack = (event) => {
      console.log('createOffer, setRemoteStream');
      const [remoteStream] = event.streams;
      setRemoteStream(remoteStream);
      if (remoteVideoRef.current)
        remoteVideoRef.current.srcObject = remoteStream;
    };

    // Triggered when the ICE agent finds a new candidate
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('createOffer > pc.onicecandidate')
        sendSignalingMessage({ type: 'candidate', candidate: event.candidate, receiverPhone: receiverPhone });
      }
    };

    // Initiate the creation of an SDP offer: includes information about any MediaStreamTrack objects already attached to the WebRTC session, codec, and options supported by the browser, and any candidates already gathered by the ICE agent,
    const offer = await pc.createOffer();

    // Set the offer as the description of the local end of the connection
    await pc.setLocalDescription(offer);

    sendSignalingMessage({ type: 'offer', offer, callerPhone: userPhone, receiverPhone: receiverPhone });
  };


  const handleOffer = async (offer, callerPhone, stream) => {
    console.log('handleOffer > callerPhone', callerPhone);
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ],
    });
    setPeerConnection(pc);

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    console.log('handleOffer, setLocalStream:', stream);
    setLocalStream(stream);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    pc.ontrack = (event) => {
      console.log('handleOffer, setRemoteStream');
      const [remoteStream] = event.streams;
      setRemoteStream(remoteStream);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('handleOffer > pc.onicecandidate')
        sendSignalingMessage({ type: 'candidate', candidate: event.candidate, receiverPhone: callerPhone });
      }
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
      const stream = await startMediaStream();
      if (stream) {
        console.log('MediaStream started when making call');
        setInACall(true);
        setRemotePhone(receiverPhone);
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
      {!inACall ?
        <div id='page'>
          <div className='flex-centered'>
            <div style={{ height: '3em', padding: '1.5em' }}>
              <img src={globeIcon} alt="call icon" />
            </div>
            <h1>WebRTC Video Call</h1>
            <div style={{ height: '3em', padding: '1.5em' }}>
              <img src={videoCamIcon} alt="call icon" />
            </div>
          </div>
          <p>{nodeenv} mode</p>

          <form onSubmit={makeCall} className='flex-centered'>
            {/* <CSRFToken /> */}
            <div className='input-container flex-centered'>

              <input type="number" name="receiverPhone" placeholder="Enter number to call" className='call-input' />

              <button type="submit" className='icon-button call-button flex-centered' style={{ gap: '12px' }} title='Make call'>
                <img src={videoCamIcon} alt="video call icon" style={{ height: '24px' }} />
              </button>

            </div>
          </form>

          <div className='flex-centered' style={{ padding: '2rem', gap: '12px' }}>

            <p>Or share this number to be called: <span className='user-phone'>{userPhone}</span></p>

            <button id='copyButton' type="button" className='icon-button flex-centered' style={{ padding: '.25rem' }} onClick={copyNumber}>
              <img src={copyIcon} alt="copy icon" style={{ height: '1.2em' }} title='Copy number' />
            </button>

          </div>
        </div>
        :
        <>
          <div className='video-container flex-centered'>
            <video ref={localVideoRef} autoPlay playsInline className='localVid' />
            <video ref={remoteVideoRef} autoPlay playsInline className='remoteVid' />

            <button onClick={() => setInACall(false)} className='hangup-button' title='Hang up'>
              <img src={callEndIcon} alt="hang up icon" style={{ height: '48px' }} />
            </button>
          </div>
        </>
      }
    </>
  )
}

export default App
