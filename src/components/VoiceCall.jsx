import { useState, useEffect } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import liff from '@line/liff'

const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
const APP_ID = "2902d7480b1343ecae1389d10639ea6a"

export default function VoiceCall({ channelName, token, profile }) {
  const [inCall, setInCall] = useState(false);
  const [localTrack, setLocalTrack] = useState(null);

  // Check mic permission early on mount
  useEffect(() => {
    checkMicPermission();
  }, []);

  async function checkMicPermission() {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (err) {
      alert('Please allow microphone access in LINE settings');
      return false;
    }
  }

  // Called from button onClick
  async function startCall() {
    const hasPermission = await checkMicPermission();
    if (!hasPermission) return;

    // ✅ Tell backend user is waiting
    await fetch('https://pandemic-quality-preview.ngrok-free.dev/api/call/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            channelName,
            idToken: liff.getIDToken(),
            displayName: profile.displayName
        })
    });
    console.log('APP_ID:', APP_ID)
    await client.join(APP_ID, channelName, token);
    const mic = await AgoraRTC.createMicrophoneAudioTrack();
    await client.publish(mic);
    setLocalTrack(mic);
    setInCall(true);

    client.on('user-published', async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      if (mediaType === 'audio') user.audioTrack.play();
    });
  }

  async function endCall() {
    localTrack?.close();
    await client.leave();
    setInCall(false);
    // ✅ Tell backend call ended
    await fetch('https://pandemic-quality-preview.ngrok-free.dev/api/call/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            channelName,
            idToken: liff.getIDToken()
        })
    });
  }

  return (
    <div>
      {!inCall
        ? <button onClick={startCall}>📞 Call Support</button>
        : <button onClick={endCall}>🔴 End Call</button>
      }
    </div>
  );
}
