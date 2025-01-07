On page load:
- fetchUserDetails(), GET userPhone
- open signaling websocket 'signalingSocket'
  - 'register' userPhone in backend
  - receive up-to-date 'user_list'

Caller:
- Click call button, makeCall(), callStatus = 'outgoing'
  + start local stream 'localStream'
  + send 'call_request'
- Receive 'accept' or 'decline'
  + if accept, createOffer() 
    x new peerConnection
    x add localStream tracks to peerConnection pc.addTrack
    x pc.createOffer()
    x pc.setLocalDescription(offer)
    x send 'offer'
    x send 'candidate' as ICE agent finds candidates
  + if decline, callStatus = null && popup
- Receive 'answer'
  + handleAnswer() - Sets received answer as remote description
    x pc.setRemoteDescription(new RTCSessionDescription(answer))
- Receive 'candidate'
  + add candidates to queue until peerConnection.remoteDescription is set, else process immediately
  + processIceCandidateQueue()
    x while candidates in queue handleCandidate() pc.addIceCandidate
- Receive 'hangup'
  + callStatus = null && popup

Receiver:
- Receive 'call_request'
- 'accept' or 'decline'
  + if accept, acceptCall(), callStatus = 'incoming'
    x start local stream 'localStream'
    x send 'accept'
  + if decline,
    x send 'decline'
- Receive 'offer'
  + handleOffer()
    x new peerConnection
    x add localStream tracks to peerConnection pc.addTrack
    Sets received offer as remote description and creates an answer
    x pc.setRemoteDescription(new RTCSessionDescription(offer))
    x pc.createAnswer()
    x pc.setLocalDescription(answer)
    x send 'answer'
    x send 'candidate' as ICE agent finds candidates
- Receive 'candidate'
  + add candidates to queue until peerConnection.remoteDescription is set, else process immediately
  + processIceCandidateQueue()
    x while candidates in queue handleCandidate() pc.addIceCandidate
- Receive 'hangup'
  + callStatus = null && popup
