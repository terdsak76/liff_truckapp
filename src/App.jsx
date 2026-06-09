import { useEffect, useState } from "react";
import liff from "@line/liff";

import {
  startTracking,
  syncData,
} from "./gpsTracker";

function App() {

  const [profile, setProfile] = useState(null);

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

    </div>
  );
}

export default App;