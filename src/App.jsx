import { useEffect, useState } from "react";
import liff from "@line/liff";
import VoiceCall from './components/VoiceCall'
import {
  startTracking,
  syncData,
} from "./gpsTracker";

function App() {

  const [profile, setProfile] = useState(null);
  const [job, setJob] = useState(null);
  const [pendingJob, setPendingJob] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  // Fuel states
  const [fuelForm, setFuelForm] = useState(null);
  const [fuelData, setFuelData] = useState({ liters: '', amount: '' });
  //photo
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  //call
  const [channelName, setChannelName] = useState('');
  const [agoraToken, setAgoraToken] = useState('');

  const callCallCenter = () => {
    liff.openWindow({
      url: `tel:+66814926996`,
      external: true,
    });
  };

  const [status, setStatus] =
    useState("Initializing LIFF...");

  useEffect(() => {

    initLIFF();

    const handleOnline = () => {
      syncData();
    };

    window.addEventListener(
      "online",
      handleOnline
    );

    return () => {
      window.removeEventListener(
        "online",
        handleOnline
      );
    };

  }, []);

  // Effect to fetch jobs once profile is available
  useEffect(() => {
    if (profile) {
      getPendingJob();
      getCurrentJob();
    }
  }, [profile]);

  const initLIFF = async () => {

    try {

      setStatus("Initializing...");

      await liff.init({
        liffId: "2010341226-BWVn7RwF",
      });

      setStatus("LIFF initialized");

      if (!liff.isLoggedIn()) {

        setStatus("Logging in...");

        liff.login();

        return;
      }

      setStatus("Getting profile...");

      const userProfile =
        await liff.getProfile();

      console.log(userProfile);

      setProfile(userProfile);

      setStatus("Tracking started");

      startTracking(userProfile.userId);

      const channel = `support_${userProfile.userId}`;
      setChannelName(channel);

      const res = await fetch('https://pandemic-quality-preview.ngrok-free.dev/api/agora-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelName: channel,
          idToken: liff.getIDToken()
        })
      });
      const { token } = await res.json();
      setAgoraToken(token);

    } catch (err) {

      console.error(err);

      setStatus(
        "ERROR: " + err.message
      );
    }
  };

  const getPendingJob = async () => {
    if (!profile) return;
    try {
      const response = await fetch('https://pandemic-quality-preview.ngrok-free.dev/pending_job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ line_user_id: profile.userId }),
      });
      if (response.ok) {
        const data = await response.json();
        setPendingJob(data);
      } else {
        setPendingJob(null);
      }
    } catch (error) {
      console.error('Error getting pending job:', error);
    }
  };

  const handleJobResponse = async (action) => {
    if (!pendingJob) return;
    try {
      await fetch('https://pandemic-quality-preview.ngrok-free.dev/job_response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dispatch_id: pendingJob.id,
          action: action,
          line_user_id: profile.userId,
        }),
      });
      setPendingJob(null);
      alert(`Job ${action}ed successfully!`);
      getCurrentJob();
    } catch (error) {
      console.error('Error responding to job:', error);
    }
  };

  const getCurrentJob = async () => {
    if (!profile) return;
    try {
      const response = await fetch(`https://pandemic-quality-preview.ngrok-free.dev/current_job?line_user_id=${profile.userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ line_user_id: profile.userId }),
      });
      const data = await response.json();
      setJob(data);
    } catch (error) {
      console.error('Error getting current job:', error);
      setJob(null);
    }
  };

  const startJob = async () => {
    if (!profile || !job) return;
    try {
      const response = await fetch('https://pandemic-quality-preview.ngrok-free.dev/log_job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          line_user_id: profile.userId,
          id: job.id,
          status: "start",
        }),
      });
      if (response.ok) {
        const updatedJob = await response.json();
        setJob(updatedJob);
        alert('Job started successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to start job: ${errorData.detail || response.statusText}`);
      }
    } catch (error) {
      console.error('Error starting job:', error);
      alert('An error occurred while trying to start the job.');
    }
  };

  const finishJob = async () => {
    if (!profile || !job) return;
    try {
      const response = await fetch('https://pandemic-quality-preview.ngrok-free.dev/log_job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          line_user_id: profile.userId,
          id: job.id,
          status: "finish",
        }),
      });
      if (response.ok) {
        alert('Job finished successfully!');
        setJob(null);
      } else {
        const errorData = await response.json();
        alert(`Failed to finish job: ${errorData.detail || response.statusText}`);
      }
    } catch (error) {
      console.error('Error finishing job:', error);
      alert('An error occurred while trying to finish the job.');
    }
  };

  const scanFuelQR = async () => {
    try {
      const result = await liff.scanCodeV2();
      const scannedData = JSON.parse(result.value);
      setFuelForm(scannedData);
    } catch (error) {
      console.error('QR scan error:', error);
      alert('Failed to scan QR code');
    }
  };

  const submitFuel = async () => {
    if (!fuelForm || !fuelData.liters || !fuelData.amount) {
      alert('Please fill in all fields');
      return;
    }
    try {
      const response = await fetch('https://pandemic-quality-preview.ngrok-free.dev/log_fuel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line_user_id: profile.userId,
          station_id: fuelForm.station_id,
          station_name: fuelForm.station_name,
          job_id: job?.id || null,
          liters: parseFloat(fuelData.liters),
          amount: parseFloat(fuelData.amount),
        }),
      });
      if (response.ok) {
        alert('Fuel log saved successfully!');
        setFuelForm(null);
        setFuelData({ liters: '', amount: '' });
      } else {
        alert('Failed to save fuel log');
      }
    } catch (error) {
      console.error('Error saving fuel log:', error);
    }
  };

  const takePhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      // Use input file for simplicity in LIFF
      document.getElementById('photoInput').click();
    } catch (error) {
      console.error('Camera error:', error);
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const uploadPhoto = async () => {
    if (!photo || !profile) return;
    try {
      const formData = new FormData();
      formData.append('file', photo);
      formData.append('line_user_id', profile.userId);
      formData.append('job_id', job?.id || '');

      const response = await fetch('https://pandemic-quality-preview.ngrok-free.dev/upload_photo', {
        method: 'POST',
        body: formData, // No Content-Type header — let browser set it with boundary
      });

      if (response.ok) {
        const data = await response.json();
        alert('Photo uploaded successfully!');
        setPhoto(null);
        setPhotoPreview(null);
      } else {
        alert('Failed to upload photo');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('An error occurred while uploading photo');
    }
  };

  return (
    <div style={{ padding: 20 }}>

      <h1>🚚 Truck Tracker</h1>
      <p>{status}</p>

      {/* Profile — always visible at top */}
      {profile && (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', gap: '10px' }}>
          <img
            src={profile.pictureUrl}
            alt="profile"
            width="50"
            style={{ borderRadius: "50%" }}
          />
          <div>
            <strong>{profile.displayName}</strong>
            <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>{profile.userId}</p>
          </div>
        </div>
      )}

      {/* Tab Bar */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid #ccc',
        marginBottom: '15px',
        position: 'sticky',
        top: 0,
        backgroundColor: 'white',
        zIndex: 100
      }}>
        {[
          { id: 'home', label: '🏠 Home' },
          { id: 'job', label: '📦 Job' },
          { id: 'fuel', label: '⛽ Fuel' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid #00B900' : '3px solid transparent',
              backgroundColor: 'white',
              color: activeTab === tab.id ? '#00B900' : '#666',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── HOME TAB ── */}
      {activeTab === 'home' && (
        <div>
          <button
            onClick={callCallCenter}
            style={{
              marginTop: '10px',
              backgroundColor: '#00B900',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '5px',
              border: 'none',
              fontSize: '16px',
              width: '100%'
            }}>
            📞 Call Center
          </button>
          {/* ✅ Agora voice call — shows when token is ready */}
          {agoraToken && (
            <VoiceCall channelName={channelName} token={agoraToken} profile={profile} />
          )}
        </div>
      )}

      {/* ── JOB TAB ── */}
      {activeTab === 'job' && (
        <div>
          {/* Hidden file input */}
          <input
            id="photoInput"
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handlePhotoChange}
          />

          {pendingJob && (
            <div style={{ border: '2px solid orange', padding: '10px', margin: '10px 0', borderRadius: '5px' }}>
              <h2>Pending Job Offer</h2>
              <p>Job Number: {pendingJob.job_number}</p>
              <p>Customer: {pendingJob.customer_name}</p>
              <p>Pickup: {pendingJob.pickup_location}</p>
              <p>Delivery: {pendingJob.delivery_location}</p>
              <button onClick={() => handleJobResponse('accept')} style={{ marginRight: '10px', backgroundColor: 'green', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '5px' }}>
                ✅ Accept
              </button>
              <button onClick={() => handleJobResponse('reject')} style={{ backgroundColor: 'red', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '5px' }}>
                ❌ Reject
              </button>
            </div>
          )}

          <button
            onClick={getCurrentJob}
            style={{ padding: '10px', width: '100%', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer' }}>
            🔄 Refresh Current Job
          </button>

          {job && job.job_number ? (
            <div style={{ border: '2px solid #00B900', padding: '10px', borderRadius: '5px' }}>
              <h2>Current Job</h2>
              <p>Job Number: {job.job_number}</p>
              <p>Customer Name: {job.customer_name}</p>
              <p>Pickup Location: {job.pickup_location}</p>
              <p>Delivery Location: {job.delivery_location}</p>
              {job.started_at && (
                <p>Started At: {new Date(job.started_at).toLocaleString()}</p>
              )}
              {job.started_at ? (
                <button onClick={finishJob} style={{ marginTop: '10px', backgroundColor: 'red', color: 'white', padding: '10px', width: '100%', border: 'none', borderRadius: '5px' }}>
                  🏁 Finish Job
                </button>
              ) : (
                <button onClick={startJob} style={{ marginTop: '10px', backgroundColor: 'blue', color: 'white', padding: '10px', width: '100%', border: 'none', borderRadius: '5px' }}>
                  ▶️ Start Job
                </button>
              )}

              {/* ── Photo Section ── */}
              <hr style={{ margin: '15px 0' }} />
              <button
                onClick={() => document.getElementById('photoInput').click()}
                style={{ backgroundColor: '#6c757d', color: 'white', padding: '10px', width: '100%', border: 'none', borderRadius: '5px', fontSize: '16px' }}>
                📷 Take Photo
              </button>

              {photoPreview && (
                <div style={{ marginTop: '10px' }}>
                  <img src={photoPreview} alt="preview" style={{ width: '100%', borderRadius: '5px' }} />
                  <button
                    onClick={uploadPhoto}
                    style={{ marginTop: '10px', backgroundColor: 'green', color: 'white', padding: '10px', width: '100%', border: 'none', borderRadius: '5px' }}>
                    ✅ Upload Photo
                  </button>
                  <button
                    onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                    style={{ marginTop: '5px', backgroundColor: 'gray', color: 'white', padding: '10px', width: '100%', border: 'none', borderRadius: '5px' }}>
                    ❌ Cancel
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p>No active job.</p>
          )}
        </div>
      )}

      {/* ── FUEL TAB ── */}
      {activeTab === 'fuel' && (
        <div>
          <button
            onClick={scanFuelQR}
            style={{
              backgroundColor: '#ff8c00',
              color: 'white',
              padding: '10px',
              width: '100%',
              border: 'none',
              borderRadius: '5px',
              fontSize: '16px',
              cursor: 'pointer'
            }}>
            ⛽ Scan Fuel QR
          </button>

          {fuelForm && (
            <div style={{ border: '2px solid orange', padding: '15px', marginTop: '10px', borderRadius: '5px' }}>
              <h3>⛽ Fuel Filling</h3>
              <p>Station: {fuelForm.station_name}</p>
              <p>Station ID: {fuelForm.station_id}</p>
              <input
                type="number"
                placeholder="Liters"
                value={fuelData.liters}
                onChange={(e) => setFuelData({ ...fuelData, liters: e.target.value })}
                style={{ display: 'block', width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' }}
              />
              <input
                type="number"
                placeholder="Amount (THB)"
                value={fuelData.amount}
                onChange={(e) => setFuelData({ ...fuelData, amount: e.target.value })}
                style={{ display: 'block', width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' }}
              />
              <button
                onClick={submitFuel}
                style={{ backgroundColor: 'green', color: 'white', padding: '10px', width: '100%', border: 'none', borderRadius: '5px' }}>
                ✅ Submit
              </button>
              <button
                onClick={() => { setFuelForm(null); setFuelData({ liters: '', amount: '' }); }}
                style={{ backgroundColor: 'gray', color: 'white', padding: '10px', width: '100%', border: 'none', borderRadius: '5px', marginTop: '5px' }}>
                ❌ Cancel
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default App;
