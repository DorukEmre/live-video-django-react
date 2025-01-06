
import React from 'react'
import { useEffect } from 'react';
import {
  videoCamIcon, globeIcon, copyIcon,
} from '../js/images';

import { copyUserPhone, copyPhone } from '../js/utils';

const Home = ({ makeCall, userPhone, popup, setPopup, connectedUsers }) => {
  // Reset popup message after displaying
  useEffect(() => {
    if (popup.present) {
      setTimeout(() => {
        setPopup({ present: false, message: "", class: "" });
      }, 3000);
    }
  }, [popup]);

  return (
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

      {userPhone === 0
        ?
        <p>Loading...</p>
        :
        <>
          <form onSubmit={makeCall} className='flex-centered'>
            <div className='input-container flex-centered'>

              <input id="receiverPhone" type="number" name="receiverPhone" placeholder="Enter number to call" className='call-input' />

              <button type="submit" className='icon-button call-button flex-centered' style={{ gap: '12px' }} title='Make call'>
                <img src={videoCamIcon} alt="video call icon" style={{ height: '24px' }} />
              </button>

            </div>
          </form>

          <div className='flex-centered' style={{ padding: '2rem', gap: '12px' }}>

            <p>Or share this number to be called: <span id='spanUserPhone' className='phone-number'>{userPhone}</span></p>

            <button onClick={copyUserPhone} id='copyButton' type="button" className='icon-button flex-centered' style={{ padding: '.25rem' }}>
              <img src={copyIcon} alt="copy icon" style={{ height: '1.2em' }} title='Copy number' />
            </button>

          </div>

          <div className='flex-centered'>
            {connectedUsers.length <= 1
              ? <p>No other user connected</p>
              :
              <>
                <p>Connected users:&nbsp;</p>
                <p>
                  {connectedUsers.map((user, index) => {
                    if (user === userPhone) return null;
                    return (
                      <span key={index} onClick={copyPhone} className='phone-number pointer'>{user}&nbsp;</span>
                    )
                  })}
                </p>
              </>
            }
          </div>
        </>
      }

      {
        popup.present &&
        <div className={`flex-centered popup ${popup.class}`}>
          <p>{popup.message}</p>
        </div>
      }

    </div >
  )
}

export default Home