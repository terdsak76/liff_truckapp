import { useEffect, useState } from "react";
import liff from "@line/liff";

import {
  startTracking,
  syncData,
} from "./gpsTracker";

function App() {

  const [profile, setProfile] = useState(null);
  const [job, setJob] = useState(null);
  const [pendingJob, setPendingJob] = useState(null);

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
      getCurrentJob(); // Also fetch current job on load
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
          dispatch_id: pendingJob.id, // Assuming the job object has an 'id'
          action: action,
          line_user_id: profile.userId,
        }),
      });
      // After responding, clear the pending job and refresh other jobs
      setPendingJob(null);
      alert(`Job ${action}ed successfully!`);
      getCurrentJob(); // Refresh current job after action
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
      setJob(null); // Clear job on error
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
          status:"start",
        }),
      });
      if (response.ok) {
        alert('Job started successfully!');
        // Optionally, update job status in UI or refetch current job
      } else {
        const errorData = await response.json();
        alert(`Failed to start job: ${errorData.detail || response.statusText}`);
      }
    } catch (error) {
      console.error('Error starting job:', error);
      alert('An error occurred while trying to start the job.');
    }
  };

  return (

    <div style={{ padding: 20 }}>

      <h1>🚚 Truck Tracker</h1>

      <p>{status}</p>

      {profile && (
        <div>
          <img
            src={profile.pictureUrl}
            alt="profile"
            width="80"
            style={{
              borderRadius: "50%",
            }}
          />
          <h3>
            {profile.displayName}
          </h3>
          <p>
            {profile.userId}
          </p>
        </div>
      )}

      {pendingJob && (
        <div style={{ border: '2px solid orange', padding: '10px', margin: '10px 0', borderRadius: '5px' }}>
          <h2>Pending Job Offer</h2>
          <p>Job Number: {pendingJob.job_number}</p>
          <p>Customer: {pendingJob.customer_name}</p>
          <p>Pickup: {pendingJob.pickup_location}</p>
          <p>Delivery: {pendingJob.delivery_location}</p>
          <button onClick={() => handleJobResponse('accept')} style={{ marginRight: '10px', backgroundColor: 'green', color: 'white' }}>
            Accept
          </button>
          <button onClick={() => handleJobResponse('reject')} style={{ backgroundColor: 'red', color: 'white' }}>
            Reject
          </button>
        </div>
      )}

      <div>
        <button onClick={getCurrentJob}>
          Refresh Current Job
        </button>
        {job && job.job_number ? (
          <div>
            <h2>Current Job</h2>
            <p>Job Number: {job.job_number}</p>
            <p>Customer Name: {job.customer_name}</p>
            <p>Pickup Location: {job.pickup_location}</p>
            <p>Delivery Location: {job.delivery_location}</p>
            <button onClick={startJob} style={{ marginTop: '10px', backgroundColor: 'blue', color: 'white' }}>
              Start Job
            </button>
          </div>
        ) : (
          <p>No active job.</p>
        )}
      </div>
    </div>
  );
}

export default App;