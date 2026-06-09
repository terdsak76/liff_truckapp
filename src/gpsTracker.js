import { dbPromise } from "./db";

export async function startTracking() {

  setInterval(async () => {

    navigator.geolocation.getCurrentPosition(
      async (position) => {

        const gpsData = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          speed: position.coords.speed || 0,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
          synced: false,
        };

        console.log("GPS Saved:", gpsData);

        const db = await dbPromise;

        await db.add("gps_logs", gpsData);

        if (navigator.onLine) {
          await syncData();
        }
      },

      (err) => {
        console.error(err);
      },

      {
        enableHighAccuracy: true,
      }
    );

  }, 60000); // every 1 minute
}

export async function syncData() {

  const db = await dbPromise;

  const tx = db.transaction("gps_logs", "readwrite");

  const store = tx.objectStore("gps_logs");

  const allLogs = await store.getAll();

  const unsynced = allLogs.filter(x => !x.synced);

  for (const log of unsynced) {

    try {

      const response = await fetch(
        "https://pandemic-quality-preview.ngrok-free.dev/gps",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(log),
        }
      );

      if (response.ok) {

        log.synced = true;

        await store.put(log);
      }

    } catch (err) {

      console.error("Sync failed", err);

    }
  }

  await tx.done;
}