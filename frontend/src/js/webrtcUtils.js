let peerConnectionConfig = {
  // iceTransportPolicy: 'all',
  // sdpSemantics: 'unified-plan',
  iceServers: [
    // Google's public STUN server
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Mozilla's public STUN server
    { urls: 'stun:stun.services.mozilla.com' },
  ],
}

export { peerConnectionConfig };