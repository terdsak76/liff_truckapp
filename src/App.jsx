import { useEffect, useState } from "react";
import liff from "@line/liff";

import {
  startTracking,
  syncData,
} from "./gpsTracker";

function App() {

  const [profile, setProfile] = useState(null);

  const [deliveries, setDeliveries] = useState([]);

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

      await liff.init({
        liffId: "2010341226-BWVn7RwF",
      });

      if (!liff.isLoggedIn()) {

        liff.login();

        return;
      }

      // ✅ await is valid here
      const userProfile =
        await liff.getProfile();

      setProfile(userProfile);

      // Start GPS tracking
      startTracking(userProfile.userId);

    } catch (err) {

      console.error(err);

    }
  };

  return (

    <div style={{ padding: 20 }}>

      <h1>🚚 Truck Tracker</h1>

      {profile ? (

        <div>

          <img
            src={profile.pictureUrl}
            alt=""
            width="80"
            style={{
              borderRadius: "50%",
            }}
          />

          <p>
            {profile.displayName}
          </p>

        </div>

      ) : (

        <p>Loading...</p>

      )}

    </div>
  );
}

export default App;