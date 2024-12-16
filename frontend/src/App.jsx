import { useState, useEffect } from 'react'
import axios from 'axios';

import {
  videoCallIcon, videoCamIcon, globeIcon, copyIcon, checkIcon
} from './js/images';
import './App.css'
import { getCookie } from './js/utils';
import CSRFToken from './components/CSRFToken';

function App() {
  const [userId, setUserId] = useState(0);
  const [userPhone, setUserPhone] = useState(0);
  const [signalingSocket, setSignalingSocket] = useState(null);

  const baseURL = process.env.REACT_APP_API_BASE_URL || '';
  const wsURL = baseURL.replace('http', 'ws');
  const nodeenv = process.env.NODE_ENV;

  useEffect(() => {

    const initialiseConnection = async () => {
      // Get userId and userPhone on page load
      const getUserDetails = async () => {
        let url = `${baseURL}/api/get-user-details/`;
        try {
          const response = await axios.get(url, { withCredentials: true });
          // console.log("response.data: ", response.data);
          setUserId(response.data.user_id);
          setUserPhone(response.data.user_phone);

          console.log('getUserDetails > response.data', response.data)
          return response.data;

        } catch (error) {
          console.error('Error fetching: ', error);
        }
      }

      // Open websocket connection
      const openSignalingSocket = (data) => {
        try {
          const ws = new WebSocket(`${wsURL}/ws/call/`);

          ws.onopen = () => {
            console.log('openWebSocket > WebSocket connected');
            console.log('openWebSocket > data', data)
            // Register the user with their phone number
            ws.send(JSON.stringify({ type: 'register', user_id: data.user_id, user_phone: data.user_phone }));
          };

          ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleIncomingSignalingData(data);
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

      const data = await getUserDetails();
      console.log('initialiseConnection > data', data)
      openSignalingSocket(data);
    }
    initialiseConnection();

    return () => {
      if (signalingSocket) {
        signalingSocket.close();
      }
    };
  }, []);


  const handleIncomingSignalingData = (data) => {
    if (data.type === 'incoming_call') {
      const confirmed = confirm(`Incoming call from ${data.from}. Accept?`);
      if (confirmed) {
        // Handle accepting the call (e.g., start WebRTC negotiation)
        console.log(`Accepted call from ${data.from}`);
      } else {
        console.log(`Declined call from ${data.from}`);
      }
    }
    else {
      console.log('Unhandled signaling data:', data);
    }
    // Handle other signaling messages like ICE candidates, etc.
  };


  const makeCall = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const callData = {
      type: 'call',
      toPhone: formData.get('toPhone'),
      fromId: userId,
    };

    if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
      signalingSocket.send(JSON.stringify(callData));
      console.log('Call request sent via WebSocket:', callData);
    } else {
      console.error('WebSocket is not connected.');
    }
  };

  // using axios post
  // const makeCall = async (e) => {
  //   e.preventDefault();
  //   let url = `${baseURL}/api/make-call/`;
  //   const formData = new FormData(e.target);
  //   const csrftoken = getCookie('csrftoken');

  //   // { "type": "call", "toPhone": "12345", "fromId": "uuid4", "offer": "<SDP_OFFER>" }

  //   formData.set('type', 'call');
  //   formData.set('fromId', userId);
  //   console.log('formData', formData);

  //   try {
  //     const response = await axios.post(url, formData, {
  //       withCredentials: true,
  //       headers: {
  //         'X-CSRFToken': csrftoken
  //       }
  //     });
  //     console.log('Call made successfully:', response.data);
  //   } catch (error) {
  //     console.error('Error making call:', error);
  //   }
  // }

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

        <input type="text" name="toPhone" placeholder="Enter number to call" style={{ padding: '1em' }} />

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
