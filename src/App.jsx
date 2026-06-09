import { useEffect, useState } from "react";
import liff from "@line/liff";

import {
  startTracking,
  syncData,
} from "./gpsTracker";

function App() {

  const [profile, setProfile] = useState(null);
  const [job, setJob] = useState(null);

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

  const getCurrentJob = async () => {
    if (!profile) return;
    try {
      const response = await fetch('https://pandemic-quality-preview.ngrok-free.dev/current_job', {
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

          <button onClick={getCurrentJob}>
            Get Current Job
          </button>

        </div>

      )}

      {job && (
        <div>
          <h2>Current Job</h2>
          <p>Job Number: {job.job_number}</p>
          <p>Customer Name: {job.customer_name}</p>
          <p>Pickup Location: {job.pickup_location}</p>
          <p>Delivery Location: {job.delivery_location}</p>
        </div>
      )}

    </div>
  );
}

export default App;