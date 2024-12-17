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
        const ws = new WebSocket(`${wsURL}/ws/call/`);

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
      if (signalingSocket) {
        signalingSocket.close();
      }
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
  }, [signalingSocket]);


  const sendSignalingMessage = (socket, message) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
      console.log('sendSignalingMessage > Signaling message sent via WebSocket:', message);
    } else {
      console.error('WebSocket is not connected.');
    }
  };

  const handleIncomingSignalingData = (data) => {
    console.log('handleIncomingSignalingData > data', data, 'userPhone', userPhone);

    if (data.type === 'call' && data.receiver === userPhone) { // incoming call
      const confirmed = confirm(`Incoming call from ${data.caller}. Accept?`);
      if (confirmed) {
        // Handle accepting the call (e.g., start WebRTC negotiation)

        console.log(`Accepted call from ${data.caller}`);

        const answerData = {
          type: 'answer',
          caller: data.caller,
          receiver: data.receiver,
        };
        sendSignalingMessage(signalingSocket, answerData);
      } else {
        console.log(`Declined call from ${data.caller}`);

        const declineData = {
          type: 'decline',
          caller: data.caller,
          receiver: data.receiver,
        };
        sendSignalingMessage(signalingSocket, declineData);
      }
    }
    else if (data.type === 'answer' && data.caller === userPhone) { // target answers the call
      console.log(`Call from ${data.caller} answered by ${data.receiver}`);
    }
    else if (data.type === 'decline' && data.caller === userPhone) { // target declines the call
      console.log(`Call from ${data.caller} declined by ${data.receiver}`);
    }
    else if (data.type === 'error') {
      alert(`${data.message}`);
    }
    else {
      console.log('Unhandled signaling data:', data);
    }
    // Handle other signaling messages like ICE candidates, etc.
  };


  const makeCall = async (e) => {
    e.preventDefault();
    const receiverPhone = parseInt(e.target.receiver.value, 10);
    if (receiverPhone === userPhone) {
      alert('You cannot call yourself');
      return;
    }

    const callData = {
      type: 'call',
      caller: userPhone,
      receiver: receiverPhone,
    };
    sendSignalingMessage(signalingSocket, callData);
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

        <input type="number" name="receiver" placeholder="Enter number to call" style={{ padding: '1em' }} />

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

    </>
  )
}

export default App
