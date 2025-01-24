import { useState, useEffect, useRef } from 'react';
import {
  callEndIcon
} from '../js/images';


const Call = ({ localStream, remoteStream, userPhone, remotePhone, callStatus, setCallStatus, sendSignalingMessage }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

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
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    }
  }, [callStatus]);


  const hangUpCall = () => {
    sendSignalingMessage({
      type: 'hangup',
      hangerPhone: userPhone,
      remotePhone
    });

    setCallStatus(null);
  }


  return (
    <>
      <div className='video-container flex flex-centered'>

        <video ref={localVideoRef} className='localVid' autoPlay playsInline muted="muted" />

        {!remoteStream
          ? <p className='remoteVid'>Please wait. Calling number: {remotePhone}</p>
          : <video ref={remoteVideoRef} className='remoteVid' autoPlay playsInline />
        }

        <button onClick={hangUpCall} className='hangup-button' title='Hang up'>
          <img src={callEndIcon} alt="hang up icon" style={{ height: '48px' }} />
        </button>

      </div>
    </>
  )
}

export default Call