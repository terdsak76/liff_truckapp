// src/gpsTracker.js

import { dbPromise } from "./db";

const API_URL =
  "https://pandemic-quality-preview.ngrok-free.dev/gps";

let trackingStarted = false;

let isSyncing = false;

export async function startTracking(driverId) {

  if (trackingStarted) {
    return;
  }

  trackingStarted = true;

  console.log("GPS tracking started");

  // Run immediately once
  await collectGPS(driverId);

  // Run every minute
  setInterval(async () => {

    await collectGPS(driverId);

  }, 60000);
}

async function collectGPS(driverId) {

  if (!navigator.geolocation) {
    console.error("Geolocation not supported");
    return;
  }

  navigator.geolocation.getCurrentPosition(

    async (position) => {

      try {

        const gpsData = {
          driver_id: driverId,

          lat: position.coords.latitude,
          lon: position.coords.longitude,

          speed: position.coords.speed || 0,
          accuracy: position.coords.accuracy || 0,

          timestamp: new Date().toISOString(),

          synced: false,
        };

        console.log("GPS Saved:", gpsData);

        const db = await dbPromise;

        await db.add("gps_logs", gpsData);

        // Only sync if online
        if (navigator.onLine) {

          await syncData();

        }

      } catch (err) {

        console.error(
          "GPS save failed:",
          err
        );

      }
    },

    (err) => {

      console.error(
        "GPS error:",
        err
      );

    },

    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000,
    }
  );
}

export async function syncData() {

  // Prevent duplicate sync execution
  if (isSyncing) {

    console.log("Sync already running");

    return;
  }

  isSyncing = true;

  console.log("Starting sync...");

  try {

    const db = await dbPromise;

    const tx = db.transaction(
      "gps_logs",
      "readwrite"
    );

    const store = tx.objectStore(
      "gps_logs"
    );

    const allLogs =
      await store.getAll();

    // Upload ONLY unsynced records
    const unsynced = allLogs.filter(
      (x) => x.synced === false
    );

    console.log(
      "Unsynced logs:",
      unsynced.length
    );

    for (const log of unsynced) {

      try {

        const payload = {
          driver_id: log.driver_id,

          lat: log.lat,
          lon: log.lon,

          speed: log.speed,
          accuracy: log.accuracy,

          timestamp: log.timestamp,
        };

        const response = await fetch(
          API_URL,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(payload),
          }
        );

        if (response.ok) {

          // Mark as synced
          log.synced = true;

          await store.put(log);

          console.log(
            "Synced:",
            log.timestamp
          );

        } else {

          console.error(
            "API error:",
            response.status
          );

        }

      } catch (err) {

        console.error(
          "Sync failed:",
          err
        );

      }
    }

    await tx.done;

  } catch (err) {

    console.error(
      "Sync process failed:",
      err
    );

  } finally {

    isSyncing = false;

    console.log("Sync finished");

  }
}

// Auto sync when connection returns
window.addEventListener(
  "online",
  async () => {

    console.log(
      "Internet restored"
    );

    await syncData();

  }
);