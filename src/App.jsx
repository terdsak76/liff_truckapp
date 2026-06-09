import { useEffect, useState } from "react";
import liff from "@line/liff";
import { startTracking, syncData  } from "./gpsTracker";

function App() {
  const [profile, setProfile] = useState(null);
  const [deliveries, setDeliveries] = useState([]);

  const [form, setForm] = useState({
    truckNo: "",
    destination: "",
    status: "Pending",
  });

  useEffect(() => {
    initLIFF();
    startTracking();


    const handleOnline = () => {
      syncData();
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
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

      const userProfile = await liff.getProfile();
      setProfile(userProfile);
    } catch (err) {
      console.error(err);
    }
  };

  const addDelivery = () => {
    if (!form.truckNo || !form.destination) {
      alert("Please fill all fields");
      return;
    }

    setDeliveries([
      ...deliveries,
      {
        ...form,
        id: Date.now(),
      },
    ]);

    setForm({
      truckNo: "",
      destination: "",
      status: "Pending",
    });
  };

  return (
    <div style={styles.container}>
      <h1>🚚 LIFF Truck Delivery</h1>

      <div style={styles.card}>
        <h3>User Profile</h3>

        {profile ? (
          <>
            <img
              src={profile.pictureUrl}
              alt=""
              width="80"
              style={{ borderRadius: "50%" }}
            />

            <p>{profile.displayName}</p>
            <small>{profile.userId}</small>
          </>
        ) : (
          <p>Loading...</p>
        )}
      </div>

      <div style={styles.card}>
        <h3>Create Delivery</h3>

        <input
          style={styles.input}
          placeholder="Truck Number"
          value={form.truckNo}
          onChange={(e) =>
            setForm({ ...form, truckNo: e.target.value })
          }
        />

        <input
          style={styles.input}
          placeholder="Destination"
          value={form.destination}
          onChange={(e) =>
            setForm({
              ...form,
              destination: e.target.value,
            })
          }
        />

        <select
          style={styles.input}
          value={form.status}
          onChange={(e) =>
            setForm({ ...form, status: e.target.value })
          }
        >
          <option>Pending</option>
          <option>In Transit</option>
          <option>Delivered</option>
        </select>

        <button style={styles.button} onClick={addDelivery}>
          Save Delivery
        </button>
      </div>

      <div style={styles.card}>
        <h3>Delivery List</h3>

        {deliveries.map((d) => (
          <div key={d.id} style={styles.delivery}>
            <strong>Truck:</strong> {d.truckNo}
            <br />

            <strong>Destination:</strong> {d.destination}
            <br />

            <strong>Status:</strong> {d.status}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: 20,
    fontFamily: "Arial",
    background: "#f5f5f5",
    minHeight: "100vh",
  },

  card: {
    background: "#fff",
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },

  input: {
    width: "100%",
    padding: 10,
    marginBottom: 10,
  },

  button: {
    width: "100%",
    padding: 12,
    background: "#06C755",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },

  delivery: {
    padding: 10,
    borderBottom: "1px solid #ddd",
  },
};

export default App;