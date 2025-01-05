import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

import {
  videoCallIcon, videoCamIcon, globeIcon, copyIcon, checkIcon, callEndIcon
} from './js/images';
import './App.css';

import { copyNumber } from './js/utils';
import { peerConnectionConfig } from './js/webrtcUtils';

function App() {
  const [userPhone, setUserPhone] = useState(0);
  const [remotePhone, setRemotePhone] = useState(0);
  const [signalingSocket, setSignalingSocket] = useState(null);
  const [callStatus, setCallStatus] = useState(null);
  const [popup, setPopup] = useState({ present: false, message: "", class: "" });

  const iceCandidateQueue = [];

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
    const fetchUserDetails = async () => {
      let url = `${baseURL}/api/get-user-details/`;
      try {
        const response = await axios.get(url, { withCredentials: true });
        setUserPhone(response.data.user_phone);

        console.log('fetchUserDetails > response.data', response.data)
        return response.data;

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
        };

        ws.onclose = () => {
          console.log('WebSocket closed');
        };

        setSignalingSocket(ws);
      } catch (error) {
        console.error('Error initialising WebSocket:', error);
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
      signalingSocket.onmessage = (event) => {
        const eventData = JSON.parse(event.data);
        handleIncomingSignalingData(eventData);
      };
    }
  }, [signalingSocket, localStream, remoteStream, peerConnection]);

  useEffect(() => {
    // Process each candidate in the queue when the peerConnection is established
    console.log('peerConnection:', peerConnection);
    if (peerConnection) {
      processIceCandidateQueue();
    }
  }, [peerConnection]);

  // Set local and remote streams when available
  useEffect(() => {
    if (localStream) {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current)
        remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Close streams and peer connection when call ends
  useEffect(() => {
    if (!callStatus) {
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

      setRemotePhone(0);
    }
  }, [callStatus]);

  // Reset popup message after display
  useEffect(() => {
    if (popup.present) {
      setTimeout(() => {
        setPopup({ present: false, message: "", class: "" });
      }, 3000);
    }
  }, [popup]);

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

    // incoming call
    if (data.type === 'callRequest' && data.receiverPhone === userPhone) {
      const confirmed = confirm(`Incoming call from ${data.callerPhone}. Accept?`);
      if (confirmed) {
        try {
          sendSignalingMessage({
            type: 'accept',
            callerPhone: data.callerPhone, receiverPhone: data.receiverPhone,
          });
          const stream = await startMediaStream();
          if (stream) {
            setCallStatus('incoming');
            setRemotePhone(data.callerPhone);
            setLocalStream(stream);

            // await handleOffer(data.offer, data.callerPhone, stream);
            // Process queued candidates after setting the remote description
            // processIceCandidateQueue();
          } else {
            console.error("Failed to start local stream.");
          }
        } catch (error) {
          console.error("Error in makeCall:", error);
        }
      } else {
        sendSignalingMessage({
          type: 'decline',
          callerPhone: data.callerPhone, receiverPhone: data.receiverPhone,
        });
      }

    }
    else if (data.type === 'accept' && data.callerPhone === userPhone) {
      try {
        console.log('handleIncomingSignalingData > accept, data.receiverPhone:', data.receiverPhone);
        console.log('localStream', localStream)
        if (localStream) {
          await createOffer(data.receiverPhone);
        } else {
          console.error("No local stream.");
        }
      } catch (error) {
        console.error("Error in createOffer:", error);
      }
    }
    else if (data.type === 'offer' && data.receiverPhone === userPhone) {
      try {
        console.log('handleIncomingSignalingData > offer, localStream', localStream)
        if (localStream) {
          await handleOffer(data.offer, data.callerPhone);
          // Process queued candidates after setting the remote description
          // processIceCandidateQueue();
        } else {
          console.error("No local stream.");
        }
      } catch (error) {
        console.error("Error in handleOffer:", error);
      }

    }
    else if (data.type === 'candidate') {
      // Queue candidates if peer connection or remote description is not ready
      if (!peerConnection || !peerConnection.remoteDescription) {
        iceCandidateQueue.push(data.candidate);
        console.log('Candidate queued');
        // console.log('Candidate queued:', data.candidate);
      } else {
        await handleCandidate(data.candidate);
      }

    }
    else if (data.type === 'answer') {
      await handleAnswer(data.answer);

    }
    // other user declines the call
    else if (data.type === 'decline' && data.callerPhone === userPhone) {
      setCallStatus(null);
      setPopup({ present: true, message: "Call was declined", class: "call-declined" });

    }
    // other user has hung up
    else if (data.type === 'hangup') {
      setCallStatus(null);
      setPopup({ present: true, message: "Call ended", class: "call-hangup" });

    }
    else if (data.type === 'error') {
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
      }
    }
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

  const createOffer = async (receiverPhone) => {
    console.log('createOffer > receiverPhone', receiverPhone);
    const pc = new RTCPeerConnection(peerConnectionConfig);
    setPeerConnection(pc);

    // Get the tracks in the MediaStream and add each track to the RTCPeerConnection. Any tracks that are added to the same stream on the local end of the connection will be on the same stream on the remote end.
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    // Triggered when a new media track is received from the remote peer
    pc.ontrack = (event) => {
      console.log('createOffer, setRemoteStream');
      const [remoteStream] = event.streams;
      setRemoteStream(remoteStream);
    };

    // Triggered when the ICE agent finds a new candidate
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('createOffer > pc.onicecandidate');
        // console.log('createOffer > pc.onicecandidate:', event.candidate);
        sendSignalingMessage({ type: 'candidate', candidate: event.candidate, receiverPhone: receiverPhone });
      }
    };

    // Initiate the creation of an SDP offer: includes information about any MediaStreamTrack objects already attached to the WebRTC session, codec, and options supported by the browser, and any candidates already gathered by the ICE agent,
    const offer = await pc.createOffer();

    // Set the offer as the description of the local end of the connection
    await pc.setLocalDescription(offer)
      .then(() => console.log("Local description set"))
      .catch((error) => console.error("Failed to set local description:", error));

    sendSignalingMessage({ type: 'offer', offer, callerPhone: userPhone, receiverPhone: receiverPhone });
  };


  const handleOffer = async (offer, callerPhone) => {
    console.log('handleOffer > callerPhone', callerPhone);
    const pc = new RTCPeerConnection(peerConnectionConfig);
    setPeerConnection(pc);

    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    // console.log('handleOffer, setLocalStream:', stream);
    // setLocalStream(stream);
    // if (localVideoRef.current) {
    //   localVideoRef.current.srcObject = stream;
    // }

    pc.ontrack = (event) => {
      console.log('handleOffer, pc.ontrack setRemoteStream, event: ', event);
      console.log('handleOffer, pc.ontrack setRemoteStream, event.streams: ', event.streams);
      const [remoteStream] = event.streams;
      setRemoteStream(remoteStream);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('handleOffer > pc.onicecandidate');
        // console.log('handleOffer > pc.onicecandidate:', event.candidate);
        sendSignalingMessage({ type: 'candidate', candidate: event.candidate, receiverPhone: callerPhone });
      }
    };

    console.log('setRemoteDescription, offer:', offer)
    await pc.setRemoteDescription(new RTCSessionDescription(offer))
      .then(() => console.log("Remote description set successfully"))
      .catch((error) => console.error("Failed to set remote description:", error));
    const answer = await pc.createAnswer();
    console.log('setLocalDescription, answer:', answer)
    await pc.setLocalDescription(answer)
      .then(() => console.log("Local description set"))
      .catch((error) => console.error("Failed to set local description:", error));

    sendSignalingMessage({ type: 'answer', answer, callerPhone, receiverPhone: userPhone });

    // Process ICE candidates received before the remote description was set
    // processIceCandidateQueue();
  };

  const handleAnswer = async (answer) => {
    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  };

  const handleCandidate = async (candidate) => {
    if (peerConnection && peerConnection.remoteDescription) {
      try {
        await peerConnection.addIceCandidate(candidate);
        console.log('ICE candidate added successfully');
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    } else {
      console.error('Remote description not set or peer connection is closed');
    }
  };


  const makeCall = async (e) => {
    e.preventDefault();
    const receiverPhone = parseInt(e.target.receiverPhone.value, 10);
    if (receiverPhone === userPhone) {
      setCallStatus(null);
      setPopup({ present: true, message: 'You cannot call yourself', class: "error" });
      return;
    }

    try {
      const stream = await startMediaStream();
      if (stream) {
        console.log('MediaStream started when making call, stream:', stream);
        setCallStatus('outgoing');
        setRemotePhone(receiverPhone);
        setLocalStream(stream);

        // await createOffer(receiverPhone); // removed stream
      } else {
        console.error("Failed to start local stream.");
      }

      sendSignalingMessage({ type: 'callRequest', callerPhone: userPhone, receiverPhone: receiverPhone });
    } catch (error) {
      console.error("Error in makeCall:", error);
    }
  };

  const hangUpCall = () => {
    sendSignalingMessage({ type: 'hangup', callerPhone: userPhone, remotePhone });

    setCallStatus(null);
  }


  return (
    <>
      {!callStatus
        ?
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
            <div className='input-container flex-centered'>

              <input type="number" name="receiverPhone" placeholder="Enter number to call" className='call-input' />

              <button type="submit" className='icon-button call-button flex-centered' style={{ gap: '12px' }} title='Make call'>
                <img src={videoCamIcon} alt="video call icon" style={{ height: '24px' }} />
              </button>

            </div>
          </form>

          <div className='flex-centered' style={{ padding: '2rem', gap: '12px' }}>

            <p>Or share this number to be called: <span id='spanUserPhone' className='user-phone'>{userPhone}</span></p>

            <button id='copyButton' type="button" className='icon-button flex-centered' style={{ padding: '.25rem' }} onClick={copyNumber}>
              <img src={copyIcon} alt="copy icon" style={{ height: '1.2em' }} title='Copy number' />
            </button>

          </div>

          {popup.present &&
            <div className={`flex-centered popup ${popup.class}`}>
              <p>{popup.message}</p>
            </div>
          }

        </div>
        :
        <>
          <div className='video-container flex-centered'>
            <video ref={localVideoRef} autoPlay playsInline className='localVid' />
            {!remoteStream
              ? <p className='remoteVid'>Calling number: {remotePhone}</p>
              : <video ref={remoteVideoRef} autoPlay playsInline className='remoteVid' />
            }
            <button onClick={hangUpCall} className='hangup-button' title='Hang up'>
              <img src={callEndIcon} alt="hang up icon" style={{ height: '48px' }} />
            </button>
          </div>
        </>
      }
    </>
  )
}

export default App
