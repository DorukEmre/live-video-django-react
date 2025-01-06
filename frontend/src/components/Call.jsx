import {
  callEndIcon
} from '../js/images';


const Call = ({ localVideoRef, remoteVideoRef, remoteStream, userPhone, remotePhone, setCallStatus, sendSignalingMessage }) => {

  const hangUpCall = () => {
    sendSignalingMessage({
      type: 'hangup',
      callerPhone: userPhone,
      remotePhone
    });

    setCallStatus(null);
  }


  return (
    <>
      <div className='video-container flex-centered'>

        <video ref={localVideoRef} className='localVid' autoPlay playsInline muted="muted" />

        {!remoteStream
          ? <p className='remoteVid'>Calling number: {remotePhone}</p>
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