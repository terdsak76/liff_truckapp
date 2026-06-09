
import { openDB } from "idb";

export const dbPromise = openDB("truck-tracker-db", 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("gps_logs")) {
      db.createObjectStore("gps_logs", {
        keyPath: "id",
        autoIncrement: true,
      });
    }
  },
});
