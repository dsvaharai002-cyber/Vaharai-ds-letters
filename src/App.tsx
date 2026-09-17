import React, { useEffect, useMemo, useState } from "react";
import { User, Letter, UserRole, LetterAction } from "./types";
import { INITIAL_USERS, INITIAL_LETTERS } from "./data/initialData";

const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbxh8-lD8wdhIjPO4zWUIzQBQBLOY2-rytdpsHaraod5tgiXDf-i3TEXgw1X0FEgQ0Bl5Q/exec";

type CloudPayload = Record<string, any>;

const safeJsonParse = <T,>(value: any, fallback: T): T => {
  if (value === null || value === undefined || value === "") return fallback;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
};

/**
 * Writes use a normal HTML form + hidden iframe.
 * This avoids the CORS problem that occurs when the React app is opened
 * directly from a file:// URL (origin "null").
 */
const sendDataToGoogleCloud = (payload: CloudPayload): boolean => {
  try {
    const action = String(payload.action ?? "").trim();
    if (!action) {
      throw new Error("Cloud action is missing.");
    }

    const form = document.createElement("form");
    form.method = "POST";
    form.action =
      WEB_APP_URL +
      "?action=" +
      encodeURIComponent(action);

    form.target = "hidden_iframe";
    form.style.display = "none";

    const queryParams: Record<string, string> = {
      action: action,
      id: String(payload.id ?? ""),
      originalNo: String(payload.originalNo ?? ""),
      date: String(payload.date ?? ""),
      inwardNo: String(payload.inwardNo ?? ""),
      fromWhom: String(payload.fromWhom ?? ""),
      subject: String(payload.subject ?? ""),
      division: String(payload.division ?? ""),
      forwardedTo: JSON.stringify(payload.forwardedTo ?? []),
      actionStatus: String(payload.actionStatus ?? payload.action ?? "Pending"),
      Password: String(payload.Password ?? ""),
      Name: String(payload.Name ?? ""),
      Role: String(payload.Role ?? ""),
      Division: String(payload.Division ?? ""),
      Status: String(payload.Status ?? ""),
      extraData: JSON.stringify(payload.extraData ?? payload),
    };

    Object.entries(queryParams).forEach(([key, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    let iframe = document.getElementById("hidden_iframe") as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "hidden_iframe";
      iframe.name = "hidden_iframe";
      iframe.style.display = "none";
      document.body.appendChild(iframe);
    }

    document.body.appendChild(form);
    form.submit();
    window.setTimeout(() => form.remove(), 1500);
    return true;
  } catch (error) {
    console.error("Cloud sync error:", error);
    return false;
  }
};
/**
 * JSONP is used for reading because fetch() from a local file can be blocked
 * by CORS. The Apps Script doGet() below supports callback=...
 */
const fetchCloudData = (): Promise<{ letters: any[][]; users: any[][] }> =>
  new Promise((resolve, reject) => {
    const callbackName = `kpnCloudCallback_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Google Apps Script read timed out."));
    }, 15000);

    const cleanup = () => {
      window.clearTimeout(timeout);
      const script = document.getElementById(callbackName);
      if (script) script.remove();
      delete (window as any)[callbackName];
    };

    (window as any)[callbackName] = (data: any) => {
      cleanup();
      resolve(data);
    };

    const script = document.createElement("script");
    script.id = callbackName;
    script.src =
      `${WEB_APP_URL}?type=get_all&callback=${encodeURIComponent(callbackName)}&t=${Date.now()}`;
    script.onerror = () => {
      cleanup();
      reject(new Error("Unable to read Google Sheets data."));
    };

    document.body.appendChild(script);
  });

const normalizeLetter = (row: any[]): any => {
  const extra = safeJsonParse<Record<string, any>>(row[9], {});
  return {
    ...extra,
    id: String(row[0] ?? extra.id ?? ""),
    originalNo: String(row[1] ?? extra.originalNo ?? ""),
    date: String(row[2] ?? extra.date ?? ""),
    inwardNo: String(row[3] ?? extra.inwardNo ?? ""),
    fromWhom: String(row[4] ?? extra.fromWhom ?? ""),
    subject: String(row[5] ?? extra.subject ?? ""),
    division: String(row[6] ?? extra.division ?? "General"),
    forwardedTo: safeJsonParse<any[]>(row[7], extra.forwardedTo ?? []),
    action: String(row[8] ?? extra.action ?? "Pending") as LetterAction,
  };

const normalizeUser = (row: any[]): any => {
  const extra = safeJsonParse<Record<string, any>>(row[6], {});
  return {
    ...extra,
    User_ID: String(row[0] ?? extra.User_ID ?? ""),
    Password: String(row[1] ?? extra.Password ?? ""),
    Name: String(row[2] ?? extra.Name ?? ""),
    Role: row[3] as UserRole,
    Division: String(row[4] ?? extra.Division ?? ""),
    Status: String(row[5] ?? extra.Status ?? "Active"),
  };
};

export default function App() {
  const [users, setUsers] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("kpn_vaharai_users");
      return saved ? JSON.parse(saved) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  const [letters, setLetters] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("kpn_vaharai_letters");
      return saved ? JSON.parse(saved) : INITIAL_LETTERS;
    } catch {
      return INITIAL_LETTERS;
    }
  });

  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem("kpn_vaharai_current_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("All");
  const [selectedLetter, setSelectedLetter] = useState<any | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [cloudMessage, setCloudMessage] = useState("");

  useEffect(() => {
    localStorage.setItem("kpn_vaharai_users", JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem("kpn_vaharai_letters", JSON.stringify(letters));
  }, [letters]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(
        "kpn_vaharai_current_user",
        JSON.stringify(currentUser)
      );
    } else {
      localStorage.removeItem("kpn_vaharai_current_user");
    }
  }, [currentUser]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoadingCloud(true);
      try {
        const result = await fetchCloudData();

        if (!mounted) return;

        if (Array.isArray(result.letters) && result.letters.length > 1) {
          const cloudLetters = result.letters
            .slice(1)
            .filter((row: any[]) => row && row.length)
            .map(normalizeLetter)
            .filter((letter: any) => letter.id || letter.originalNo)
            .reverse();

          if (cloudLetters.length) setLetters(cloudLetters);
        }

        if (Array.isArray(result.users) && result.users.length > 1) {
          const cloudUsers = result.users
            .slice(1)
            .filter((row: any[]) => row && row.length)
            .map(normalizeUser)
            .filter((user: any) => user.User_ID);

          if (cloudUsers.length) setUsers(cloudUsers);
        }

        setCloudMessage("Google Sheets தரவு இணைக்கப்பட்டது.");
      } catch (error) {
        console.error(error);
        setCloudMessage(
          "Google Sheets தரவைப் பெற முடியவில்லை. Local data பயன்படுத்தப்படுகிறது."
        );
      } finally {
        if (mounted) setLoadingCloud(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const usersMap = useMemo(
    () => new Map(users.map((u) => [u.User_ID, u])),
    [users]
  );

  const visibleLetters = useMemo(() => {
    const role = currentUser?.Role;

    const roleFiltered = letters.filter((letter) => {
      if (
        role === "Super Admin" ||
        role === "Mega" ||
        role === "Mail Officer"
      ) {
        return true;
      }

      if (role === "Normal") {
        return (letter.forwardedTo ?? []).some((uid: string) => {
          const u = usersMap.get(uid);
          return u && u.Division === currentUser.Division;
        });
      }

      if (role === "User") {
        return (letter.forwardedTo ?? []).includes(currentUser.User_ID);
      }

      return false;
    });

    return roleFiltered.filter((letter) => {
      if (actionFilter !== "All" && letter.action !== actionFilter) return false;

      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      const forwardedNames = (letter.forwardedTo ?? [])
        .map((id: string) => usersMap.get(id)?.Name || id)
        .join(" ")
        .toLowerCase();

      return [
        letter.originalNo,
        letter.inwardNo,
        letter.fromWhom,
        letter.subject,
        letter.date,
        letter.division,
        forwardedNames,
      ].some((value) => String(value ?? "").toLowerCase().includes(q));
    });
  }, [letters, usersMap, currentUser, searchQuery, actionFilter]);

  const cloudWrite = (payload: CloudPayload) => {
    const ok = sendDataToGoogleCloud(payload);
    if (!ok) setCloudMessage("Google Sheets அனுப்பலில் பிழை ஏற்பட்டது.");
    else setCloudMessage("Google Sheets sync அனுப்பப்பட்டது.");
    return ok;
  };

  const handleSaveNewLetter = (newLetter: Letter) => {
    setLetters((prev) => [newLetter, ...prev]);
    cloudWrite({
      action: "ADD_LETTER",
      id: newLetter.id,
      originalNo: newLetter.originalNo,
      date: newLetter.date,
      inwardNo: newLetter.inwardNo,
      fromWhom: newLetter.fromWhom,
      subject: newLetter.subject,
      division: newLetter.division || "General",
      forwardedTo: newLetter.forwardedTo || [],
      actionStatus: newLetter.action || "Pending",
      extraData: newLetter,
    });
    setShowRegister(false);
  };

  const handleUpdateLetter = (updated: Letter) => {
    setLetters((prev) =>
      prev.map((l) => (l.id === updated.id ? updated : l))
    );
    setSelectedLetter(updated);

    cloudWrite({
      action: "UPDATE_LETTER",
      id: updated.id,
      originalNo: updated.originalNo,
      date: updated.date,
      inwardNo: updated.inwardNo,
      fromWhom: updated.fromWhom,
      subject: updated.subject,
      division: updated.division || "General",
      forwardedTo: updated.forwardedTo || [],
      actionStatus: updated.action || "Pending",
      extraData: updated,
    });
  };

  const handleDeleteLetter = (letterId: string) => {
    if (!confirm("இந்தக் கடிதத்தை நீக்க வேண்டுமா?")) return;

    setLetters((prev) => prev.filter((l) => l.id !== letterId));
    if (selectedLetter?.id === letterId) setSelectedLetter(null);

    cloudWrite({
      action: "DELETE_LETTER",
      id: letterId,
    });
  };

  const handleAddUser = (newUser: User) => {
    setUsers((prev) => [...prev, newUser]);

    cloudWrite({
      action: "ADD_USER",
      User_ID: newUser.User_ID,
      Password: newUser.Password,
      Name: newUser.Name,
      Role: newUser.Role,
      Division: newUser.Division,
      Status: newUser.Status || "Active",
      extraData: newUser,
    });
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.User_ID === updatedUser.User_ID ? updatedUser : u
      )
    );

    if (currentUser?.User_ID === updatedUser.User_ID) {
      setCurrentUser(updatedUser);
    }

    cloudWrite({
      action: "UPDATE_USER",
      User_ID: updatedUser.User_ID,
      Password: updatedUser.Password,
      Name: updatedUser.Name,
      Role: updatedUser.Role,
      Division: updatedUser.Division,
      Status: updatedUser.Status || "Active",
      extraData: updatedUser,
    });
  };

  const handleDeleteUser = (userId: string) => {
    if (!confirm("இந்தப் பயனரை நீக்க வேண்டுமா?")) return;

    setUsers((prev) => prev.filter((u) => u.User_ID !== userId));

    cloudWrite({
      action: "DELETE_USER",
      User_ID: userId,
    });
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedLetter(null);
  };

  const handleResetData = () => {
    if (!confirm("Local sample data-க்கு reset செய்ய வேண்டுமா?")) return;
    setUsers(INITIAL_USERS);
    setLetters(INITIAL_LETTERS);
  };

  if (!currentUser) {
    return (
      <div style={styles.page}>
        <div style={styles.loginCard}>
          <h1 style={{ marginTop: 0 }}>KPN – Vaharai Letter Register</h1>
          <p>கோறளைப்பற்று வடக்கு – வாகரை பிரதேச செயலகம்</p>

          <input
            style={styles.input}
            placeholder="User ID"
            id="login-user-id"
          />
          <input
            style={styles.input}
            placeholder="Password"
            type="password"
            id="login-password"
          />

          <button
            style={styles.primaryButton}
            onClick={() => {
              const id = (
                document.getElementById("login-user-id") as HTMLInputElement
              )?.value;
              const password = (
                document.getElementById("login-password") as HTMLInputElement
              )?.value;

              const user = users.find(
                (u) =>
                  String(u.User_ID) === id &&
                  String(u.Password) === password &&
                  String(u.Status || "Active").toLowerCase() === "active"
              );

              if (user) handleLogin(user);
              else alert("User ID அல்லது Password தவறாக உள்ளது.");
            }}
          >
            உள்நுழை
          </button>

          <small>{cloudMessage}</small>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h2 style={{ margin: 0 }}>கடிதப் பதிவு மற்றும் கண்காணிப்பு</h2>
          <small>
            {currentUser.Name} — {currentUser.Role} —{" "}
            {currentUser.Division || "அனைத்து பிரிவுகள்"}
          </small>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {(currentUser.Role === "Super Admin" ||
            currentUser.Role === "Mega") && (
            <button
              style={styles.secondaryButton}
              onClick={() => setShowUsers(true)}
            >
              பயனர்கள்
            </button>
          )}
          <button style={styles.secondaryButton} onClick={handleLogout}>
            வெளியேறு
          </button>
        </div>
      </header>

      <main style={styles.container}>
        <div style={styles.toolbar}>
          <input
            style={styles.input}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="கடித எண் / விடயம் / அனுப்புநர் தேடுக..."
          />

          <select
            style={styles.input}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option>All</option>
            <option>Pending</option>
            <option>In Progress</option>
            <option>Completed</option>
            <option>Replied</option>
          </select>

          {(currentUser.Role === "Super Admin" ||
            currentUser.Role === "Mega" ||
            currentUser.Role === "Mail Officer") && (
            <button
              style={styles.primaryButton}
              onClick={() => setShowRegister(true)}
            >
              + புதிய கடிதம்
            </button>
          )}

          <button style={styles.secondaryButton} onClick={handleResetData}>
            Local Reset
          </button>
        </div>

        <div style={styles.status}>
          {loadingCloud ? "Google Sheets தரவு பெறப்படுகிறது..." : cloudMessage}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>கடித எண்</th>
                <th>திகதி</th>
                <th>உள்வரவு எண்</th>
                <th>அனுப்புநர்</th>
                <th>விடயம்</th>
                <th>பிரிவு</th>
                <th>நிலை</th>
                <th>செயல்</th>
              </tr>
            </thead>
            <tbody>
              {visibleLetters.map((letter) => (
                <tr key={letter.id}>
                  <td>{letter.originalNo}</td>
                  <td>{letter.date}</td>
                  <td>{letter.inwardNo}</td>
                  <td>{letter.fromWhom}</td>
                  <td>{letter.subject}</td>
                  <td>{letter.division}</td>
                  <td>{letter.action}</td>
                  <td>
                    <button
                      style={styles.smallButton}
                      onClick={() => setSelectedLetter(letter)}
                    >
                      திறக்க
                    </button>
                    {(currentUser.Role === "Super Admin" ||
                      currentUser.Role === "Mega") && (
                      <button
                        style={styles.dangerButton}
                        onClick={() => handleDeleteLetter(letter.id)}
                      >
                        நீக்கு
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {visibleLetters.length === 0 && (
          <div style={styles.empty}>கடிதங்கள் எதுவும் இல்லை.</div>
        )}
      </main>

      {showRegister && (
        <div style={styles.modal}>
          <div style={styles.modalCard}>
            <h3>புதிய கடிதம் பதிவு</h3>
            <LetterQuickForm
              onCancel={() => setShowRegister(false)}
              onSave={handleSaveNewLetter}
            />
          </div>
        </div>
      )}

      {selectedLetter && (
        <div style={styles.modal}>
          <div style={styles.modalCard}>
            <h3>கடித விவரங்கள்</h3>
            <p><b>கடித எண்:</b> {selectedLetter.originalNo}</p>
            <p><b>உள்வரவு எண்:</b> {selectedLetter.inwardNo}</p>
            <p><b>அனுப்புநர்:</b> {selectedLetter.fromWhom}</p>
            <p><b>விடயம்:</b> {selectedLetter.subject}</p>
            <p><b>பிரிவு:</b> {selectedLetter.division}</p>

            <button
              style={styles.secondaryButton}
              onClick={() => setSelectedLetter(null)}
            >
              மூடு
            </button>
          </div>
        </div>
      )}

      {showUsers && (
        <div style={styles.modal}>
          <div style={styles.modalCard}>
            <h3>பயனர் மேலாண்மை</h3>
            <UserQuickForm onAdd={handleAddUser} />
            <div style={{ marginTop: 16 }}>
              {users.map((u) => (
                <div key={u.User_ID} style={styles.userRow}>
                  <span>
                    {u.Name} ({u.User_ID}) — {u.Role}
                  </span>
                  <button
                    style={styles.dangerButton}
                    onClick={() => handleDeleteUser(u.User_ID)}
                  >
                    நீக்கு
                  </button>
                </div>
              ))}
            </div>
            <button
              style={styles.secondaryButton}
              onClick={() => setShowUsers(false)}
            >
              மூடு
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LetterQuickForm({
  onSave,
  onCancel,
}: {
  onSave: (letter: any) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<any>({
    id: crypto.randomUUID(),
    originalNo: "",
    date: new Date().toISOString().slice(0, 10),
    inwardNo: "",
    fromWhom: "",
    subject: "",
    division: "General",
    forwardedTo: [],
    action: "Pending",
  });

  const set = (key: string, value: any) =>
    setForm((prev: any) => ({ ...prev, [key]: value }));

  return (
    <div>
      {[
        ["originalNo", "கடித எண்"],
        ["date", "திகதி"],
        ["inwardNo", "உள்வரவு எண்"],
        ["fromWhom", "அனுப்புநர்"],
        ["subject", "விடயம்"],
        ["division", "பிரிவு"],
      ].map(([key, label]) => (
        <input
          key={key}
          style={styles.input}
          placeholder={label}
          value={form[key]}
          onChange={(e) => set(key, e.target.value)}
        />
      ))}

      <select
        style={styles.input}
        value={form.action}
        onChange={(e) => set("action", e.target.value)}
      >
        <option>Pending</option>
        <option>In Progress</option>
        <option>Completed</option>
        <option>Replied</option>
      </select>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          style={styles.primaryButton}
          onClick={() => {
            if (!form.originalNo || !form.subject) {
              alert("கடித எண் மற்றும் விடயம் அவசியம்.");
              return;
            }
            onSave(form);
          }}
        >
          சேமி
        </button>
        <button style={styles.secondaryButton} onClick={onCancel}>
          ரத்து
        </button>
      </div>
    </div>
  );
}

function UserQuickForm({ onAdd }: { onAdd: (user: any) => void }) {
  const [form, setForm] = useState<any>({
    User_ID: "",
    Password: "",
    Name: "",
    Role: "User",
    Division: "",
    Status: "Active",
  });

  const set = (key: string, value: any) =>
    setForm((prev: any) => ({ ...prev, [key]: value }));

  return (
    <div>
      {[
        ["User_ID", "User ID"],
        ["Password", "Password"],
        ["Name", "பெயர்"],
        ["Division", "பிரிவு"],
      ].map(([key, label]) => (
        <input
          key={key}
          style={styles.input}
          placeholder={label}
          type={key === "Password" ? "password" : "text"}
          value={form[key]}
          onChange={(e) => set(key, e.target.value)}
        />
      ))}

      <select
        style={styles.input}
        value={form.Role}
        onChange={(e) => set("Role", e.target.value)}
      >
        <option>User</option>
        <option>Normal</option>
        <option>Mail Officer</option>
        <option>Mega</option>
        <option>Super Admin</option>
      </select>

      <button
        style={styles.primaryButton}
        onClick={() => {
          if (!form.User_ID || !form.Password || !form.Name) {
            alert("User ID, Password, Name அவசியம்.");
            return;
          }
          onAdd(form);
          setForm({
            User_ID: "",
            Password: "",
            Name: "",
            Role: "User",
            Division: "",
            Status: "Active",
          });
        }}
      >
        பயனரைச் சேர்
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    fontFamily: "Arial, sans-serif",
    color: "#1f2937",
  },
  header: {
    background: "#ffffff",
    padding: "16px 24px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  container: { padding: 24 },
  loginCard: {
    width: "min(420px, calc(100% - 32px))",
    margin: "10vh auto",
    background: "#fff",
    padding: 28,
    borderRadius: 14,
    boxShadow: "0 10px 30px rgba(0,0,0,.08)",
  },
  toolbar: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  input: {
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    marginBottom: 10,
    minWidth: 180,
    boxSizing: "border-box",
  },
  primaryButton: {
    padding: "10px 14px",
    border: 0,
    borderRadius: 8,
    cursor: "pointer",
    background: "#1d4ed8",
    color: "#fff",
    marginBottom: 10,
  },
  secondaryButton: {
    padding: "10px 14px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    cursor: "pointer",
    background: "#fff",
    marginBottom: 10,
  },
  smallButton: {
    padding: "6px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    cursor: "pointer",
    background: "#fff",
    marginRight: 6,
  },
  dangerButton: {
    padding: "6px 10px",
    border: "1px solid #ef4444",
    borderRadius: 6,
    cursor: "pointer",
    background: "#fff",
    color: "#b91c1c",
  },
  status: {
    padding: 10,
    background: "#fff",
    borderRadius: 8,
    marginBottom: 12,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "#fff",
  },
  empty: {
    background: "#fff",
    padding: 30,
    textAlign: "center",
  },
  modal: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 1000,
  },
  modalCard: {
    background: "#fff",
    width: "min(700px, 100%)",
    maxHeight: "90vh",
    overflow: "auto",
    padding: 24,
    borderRadius: 14,
  },
  userRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderBottom: "1px solid #eee",
  },
};
import React, { useEffect, useMemo, useState } from "react";
import { User, Letter, UserRole, LetterAction } from "./types";
import { INITIAL_USERS, INITIAL_LETTERS } from "./data/initialData";

const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbxh8-lD8wdhIjPO4zWUIzQBQBLOY2-rytdpsHaraod5tgiXDf-i3TEXgw1X0FEgQ0Bl5Q/exec";

type CloudPayload = Record<string, any>;

const safeJsonParse = <T,>(value: any, fallback: T): T => {
  if (value === null || value === undefined || value === "") return fallback;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
};

/**
 * Writes use a normal HTML form + hidden iframe.
 * This avoids the CORS problem that occurs when the React app is opened
 * directly from a file:// URL (origin "null").
 */
const sendDataToGoogleCloud = (payload: CloudPayload): boolean => {
  try {
    const action = String(payload.action ?? "").trim();
    if (!action) {
      throw new Error("Cloud action is missing.");
    }

    const form = document.createElement("form");
    form.method = "POST";
    form.action =
      WEB_APP_URL +
      "?action=" +
      encodeURIComponent(action);

    form.target = "hidden_iframe";
    form.style.display = "none";

    const queryParams: Record<string, string> = {
      action: action,
      id: String(payload.id ?? ""),
      originalNo: String(payload.originalNo ?? ""),
      date: String(payload.date ?? ""),
      inwardNo: String(payload.inwardNo ?? ""),
      fromWhom: String(payload.fromWhom ?? ""),
      subject: String(payload.subject ?? ""),
      division: String(payload.division ?? ""),
      forwardedTo: JSON.stringify(payload.forwardedTo ?? []),
      actionStatus: String(payload.actionStatus ?? payload.action ?? "Pending"),
      Password: String(payload.Password ?? ""),
      Name: String(payload.Name ?? ""),
      Role: String(payload.Role ?? ""),
      Division: String(payload.Division ?? ""),
      Status: String(payload.Status ?? ""),
      extraData: JSON.stringify(payload.extraData ?? payload),
    };

    Object.entries(queryParams).forEach(([key, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    let iframe = document.getElementById("hidden_iframe") as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "hidden_iframe";
      iframe.name = "hidden_iframe";
      iframe.style.display = "none";
      document.body.appendChild(iframe);
    }

    document.body.appendChild(form);
    form.submit();
    window.setTimeout(() => form.remove(), 1500);
    return true;
  } catch (error) {
    console.error("Cloud sync error:", error);
    return false;
  }
};
/**
 * JSONP is used for reading because fetch() from a local file can be blocked
 * by CORS. The Apps Script doGet() below supports callback=...
 */
const fetchCloudData = (): Promise<{ letters: any[][]; users: any[][] }> =>
  new Promise((resolve, reject) => {
    const callbackName = `kpnCloudCallback_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Google Apps Script read timed out."));
    }, 15000);

    const cleanup = () => {
      window.clearTimeout(timeout);
      const script = document.getElementById(callbackName);
      if (script) script.remove();
      delete (window as any)[callbackName];
    };

    (window as any)[callbackName] = (data: any) => {
      cleanup();
      resolve(data);
    };

    const script = document.createElement("script");
    script.id = callbackName;
    script.src =
      `${WEB_APP_URL}?type=get_all&callback=${encodeURIComponent(callbackName)}&t=${Date.now()}`;
    script.onerror = () => {
      cleanup();
      reject(new Error("Unable to read Google Sheets data."));
    };

    document.body.appendChild(script);
  });

const normalizeLetter = (row: any[]): any => {
  const extra = safeJsonParse<Record<string, any>>(row[9], {});
  return {
    ...extra,
    id: String(row[0] ?? extra.id ?? ""),
    originalNo: String(row[1] ?? extra.originalNo ?? ""),
    date: String(row[2] ?? extra.date ?? ""),
    inwardNo: String(row[3] ?? extra.inwardNo ?? ""),
    fromWhom: String(row[4] ?? extra.fromWhom ?? ""),
    subject: String(row[5] ?? extra.subject ?? ""),
    division: String(row[6] ?? extra.division ?? "General"),
    forwardedTo: safeJsonParse<any[]>(row[7], extra.forwardedTo ?? []),
    action: String(row[8] ?? extra.action ?? "Pending") as LetterAction,
  };

const normalizeUser = (row: any[]): any => {
  const extra = safeJsonParse<Record<string, any>>(row[6], {});
  return {
    ...extra,
    User_ID: String(row[0] ?? extra.User_ID ?? ""),
    Password: String(row[1] ?? extra.Password ?? ""),
    Name: String(row[2] ?? extra.Name ?? ""),
    Role: row[3] as UserRole,
    Division: String(row[4] ?? extra.Division ?? ""),
    Status: String(row[5] ?? extra.Status ?? "Active"),
  };
};

export default function App() {
  const [users, setUsers] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("kpn_vaharai_users");
      return saved ? JSON.parse(saved) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  const [letters, setLetters] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("kpn_vaharai_letters");
      return saved ? JSON.parse(saved) : INITIAL_LETTERS;
    } catch {
      return INITIAL_LETTERS;
    }
  });

  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem("kpn_vaharai_current_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("All");
  const [selectedLetter, setSelectedLetter] = useState<any | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [cloudMessage, setCloudMessage] = useState("");

  useEffect(() => {
    localStorage.setItem("kpn_vaharai_users", JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem("kpn_vaharai_letters", JSON.stringify(letters));
  }, [letters]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(
        "kpn_vaharai_current_user",
        JSON.stringify(currentUser)
      );
    } else {
      localStorage.removeItem("kpn_vaharai_current_user");
    }
  }, [currentUser]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoadingCloud(true);
      try {
        const result = await fetchCloudData();

        if (!mounted) return;

        if (Array.isArray(result.letters) && result.letters.length > 1) {
          const cloudLetters = result.letters
            .slice(1)
            .filter((row: any[]) => row && row.length)
            .map(normalizeLetter)
            .filter((letter: any) => letter.id || letter.originalNo)
            .reverse();

          if (cloudLetters.length) setLetters(cloudLetters);
        }

        if (Array.isArray(result.users) && result.users.length > 1) {
          const cloudUsers = result.users
            .slice(1)
            .filter((row: any[]) => row && row.length)
            .map(normalizeUser)
            .filter((user: any) => user.User_ID);

          if (cloudUsers.length) setUsers(cloudUsers);
        }

        setCloudMessage("Google Sheets தரவு இணைக்கப்பட்டது.");
      } catch (error) {
        console.error(error);
        setCloudMessage(
          "Google Sheets தரவைப் பெற முடியவில்லை. Local data பயன்படுத்தப்படுகிறது."
        );
      } finally {
        if (mounted) setLoadingCloud(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const usersMap = useMemo(
    () => new Map(users.map((u) => [u.User_ID, u])),
    [users]
  );

  const visibleLetters = useMemo(() => {
    const role = currentUser?.Role;

    const roleFiltered = letters.filter((letter) => {
      if (
        role === "Super Admin" ||
        role === "Mega" ||
        role === "Mail Officer"
      ) {
        return true;
      }

      if (role === "Normal") {
        return (letter.forwardedTo ?? []).some((uid: string) => {
          const u = usersMap.get(uid);
          return u && u.Division === currentUser.Division;
        });
      }

      if (role === "User") {
        return (letter.forwardedTo ?? []).includes(currentUser.User_ID);
      }

      return false;
    });

    return roleFiltered.filter((letter) => {
      if (actionFilter !== "All" && letter.action !== actionFilter) return false;

      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      const forwardedNames = (letter.forwardedTo ?? [])
        .map((id: string) => usersMap.get(id)?.Name || id)
        .join(" ")
        .toLowerCase();

      return [
        letter.originalNo,
        letter.inwardNo,
        letter.fromWhom,
        letter.subject,
        letter.date,
        letter.division,
        forwardedNames,
      ].some((value) => String(value ?? "").toLowerCase().includes(q));
    });
  }, [letters, usersMap, currentUser, searchQuery, actionFilter]);

  const cloudWrite = (payload: CloudPayload) => {
    const ok = sendDataToGoogleCloud(payload);
    if (!ok) setCloudMessage("Google Sheets அனுப்பலில் பிழை ஏற்பட்டது.");
    else setCloudMessage("Google Sheets sync அனுப்பப்பட்டது.");
    return ok;
  };

  const handleSaveNewLetter = (newLetter: Letter) => {
    setLetters((prev) => [newLetter, ...prev]);
    cloudWrite({
      action: "ADD_LETTER",
      id: newLetter.id,
      originalNo: newLetter.originalNo,
      date: newLetter.date,
      inwardNo: newLetter.inwardNo,
      fromWhom: newLetter.fromWhom,
      subject: newLetter.subject,
      division: newLetter.division || "General",
      forwardedTo: newLetter.forwardedTo || [],
      actionStatus: newLetter.action || "Pending",
      extraData: newLetter,
    });
    setShowRegister(false);
  };

  const handleUpdateLetter = (updated: Letter) => {
    setLetters((prev) =>
      prev.map((l) => (l.id === updated.id ? updated : l))
    );
    setSelectedLetter(updated);

    cloudWrite({
      action: "UPDATE_LETTER",
      id: updated.id,
      originalNo: updated.originalNo,
      date: updated.date,
      inwardNo: updated.inwardNo,
      fromWhom: updated.fromWhom,
      subject: updated.subject,
      division: updated.division || "General",
      forwardedTo: updated.forwardedTo || [],
      actionStatus: updated.action || "Pending",
      extraData: updated,
    });
  };

  const handleDeleteLetter = (letterId: string) => {
    if (!confirm("இந்தக் கடிதத்தை நீக்க வேண்டுமா?")) return;

    setLetters((prev) => prev.filter((l) => l.id !== letterId));
    if (selectedLetter?.id === letterId) setSelectedLetter(null);

    cloudWrite({
      action: "DELETE_LETTER",
      id: letterId,
    });
  };

  const handleAddUser = (newUser: User) => {
    setUsers((prev) => [...prev, newUser]);

    cloudWrite({
      action: "ADD_USER",
      User_ID: newUser.User_ID,
      Password: newUser.Password,
      Name: newUser.Name,
      Role: newUser.Role,
      Division: newUser.Division,
      Status: newUser.Status || "Active",
      extraData: newUser,
    });
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.User_ID === updatedUser.User_ID ? updatedUser : u
      )
    );

    if (currentUser?.User_ID === updatedUser.User_ID) {
      setCurrentUser(updatedUser);
    }

    cloudWrite({
      action: "UPDATE_USER",
      User_ID: updatedUser.User_ID,
      Password: updatedUser.Password,
      Name: updatedUser.Name,
      Role: updatedUser.Role,
      Division: updatedUser.Division,
      Status: updatedUser.Status || "Active",
      extraData: updatedUser,
    });
  };

  const handleDeleteUser = (userId: string) => {
    if (!confirm("இந்தப் பயனரை நீக்க வேண்டுமா?")) return;

    setUsers((prev) => prev.filter((u) => u.User_ID !== userId));

    cloudWrite({
      action: "DELETE_USER",
      User_ID: userId,
    });
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedLetter(null);
  };

  const handleResetData = () => {
    if (!confirm("Local sample data-க்கு reset செய்ய வேண்டுமா?")) return;
    setUsers(INITIAL_USERS);
    setLetters(INITIAL_LETTERS);
  };

  if (!currentUser) {
    return (
      <div style={styles.page}>
        <div style={styles.loginCard}>
          <h1 style={{ marginTop: 0 }}>KPN – Vaharai Letter Register</h1>
          <p>கோறளைப்பற்று வடக்கு – வாகரை பிரதேச செயலகம்</p>

          <input
            style={styles.input}
            placeholder="User ID"
            id="login-user-id"
          />
          <input
            style={styles.input}
            placeholder="Password"
            type="password"
            id="login-password"
          />

          <button
            style={styles.primaryButton}
            onClick={() => {
              const id = (
                document.getElementById("login-user-id") as HTMLInputElement
              )?.value;
              const password = (
                document.getElementById("login-password") as HTMLInputElement
              )?.value;

              const user = users.find(
                (u) =>
                  String(u.User_ID) === id &&
                  String(u.Password) === password &&
                  String(u.Status || "Active").toLowerCase() === "active"
              );

              if (user) handleLogin(user);
              else alert("User ID அல்லது Password தவறாக உள்ளது.");
            }}
          >
            உள்நுழை
          </button>

          <small>{cloudMessage}</small>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h2 style={{ margin: 0 }}>கடிதப் பதிவு மற்றும் கண்காணிப்பு</h2>
          <small>
            {currentUser.Name} — {currentUser.Role} —{" "}
            {currentUser.Division || "அனைத்து பிரிவுகள்"}
          </small>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {(currentUser.Role === "Super Admin" ||
            currentUser.Role === "Mega") && (
            <button
              style={styles.secondaryButton}
              onClick={() => setShowUsers(true)}
            >
              பயனர்கள்
            </button>
          )}
          <button style={styles.secondaryButton} onClick={handleLogout}>
            வெளியேறு
          </button>
        </div>
      </header>

      <main style={styles.container}>
        <div style={styles.toolbar}>
          <input
            style={styles.input}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="கடித எண் / விடயம் / அனுப்புநர் தேடுக..."
          />

          <select
            style={styles.input}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option>All</option>
            <option>Pending</option>
            <option>In Progress</option>
            <option>Completed</option>
            <option>Replied</option>
          </select>

          {(currentUser.Role === "Super Admin" ||
            currentUser.Role === "Mega" ||
            currentUser.Role === "Mail Officer") && (
            <button
              style={styles.primaryButton}
              onClick={() => setShowRegister(true)}
            >
              + புதிய கடிதம்
            </button>
          )}

          <button style={styles.secondaryButton} onClick={handleResetData}>
            Local Reset
          </button>
        </div>

        <div style={styles.status}>
          {loadingCloud ? "Google Sheets தரவு பெறப்படுகிறது..." : cloudMessage}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>கடித எண்</th>
                <th>திகதி</th>
                <th>உள்வரவு எண்</th>
                <th>அனுப்புநர்</th>
                <th>விடயம்</th>
                <th>பிரிவு</th>
                <th>நிலை</th>
                <th>செயல்</th>
              </tr>
            </thead>
            <tbody>
              {visibleLetters.map((letter) => (
                <tr key={letter.id}>
                  <td>{letter.originalNo}</td>
                  <td>{letter.date}</td>
                  <td>{letter.inwardNo}</td>
                  <td>{letter.fromWhom}</td>
                  <td>{letter.subject}</td>
                  <td>{letter.division}</td>
                  <td>{letter.action}</td>
                  <td>
                    <button
                      style={styles.smallButton}
                      onClick={() => setSelectedLetter(letter)}
                    >
                      திறக்க
                    </button>
                    {(currentUser.Role === "Super Admin" ||
                      currentUser.Role === "Mega") && (
                      <button
                        style={styles.dangerButton}
                        onClick={() => handleDeleteLetter(letter.id)}
                      >
                        நீக்கு
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {visibleLetters.length === 0 && (
          <div style={styles.empty}>கடிதங்கள் எதுவும் இல்லை.</div>
        )}
      </main>

      {showRegister && (
        <div style={styles.modal}>
          <div style={styles.modalCard}>
            <h3>புதிய கடிதம் பதிவு</h3>
            <LetterQuickForm
              onCancel={() => setShowRegister(false)}
              onSave={handleSaveNewLetter}
            />
          </div>
        </div>
      )}

      {selectedLetter && (
        <div style={styles.modal}>
          <div style={styles.modalCard}>
            <h3>கடித விவரங்கள்</h3>
            <p><b>கடித எண்:</b> {selectedLetter.originalNo}</p>
            <p><b>உள்வரவு எண்:</b> {selectedLetter.inwardNo}</p>
            <p><b>அனுப்புநர்:</b> {selectedLetter.fromWhom}</p>
            <p><b>விடயம்:</b> {selectedLetter.subject}</p>
            <p><b>பிரிவு:</b> {selectedLetter.division}</p>

            <button
              style={styles.secondaryButton}
              onClick={() => setSelectedLetter(null)}
            >
              மூடு
            </button>
          </div>
        </div>
      )}

      {showUsers && (
        <div style={styles.modal}>
          <div style={styles.modalCard}>
            <h3>பயனர் மேலாண்மை</h3>
            <UserQuickForm onAdd={handleAddUser} />
            <div style={{ marginTop: 16 }}>
              {users.map((u) => (
                <div key={u.User_ID} style={styles.userRow}>
                  <span>
                    {u.Name} ({u.User_ID}) — {u.Role}
                  </span>
                  <button
                    style={styles.dangerButton}
                    onClick={() => handleDeleteUser(u.User_ID)}
                  >
                    நீக்கு
                  </button>
                </div>
              ))}
            </div>
            <button
              style={styles.secondaryButton}
              onClick={() => setShowUsers(false)}
            >
              மூடு
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LetterQuickForm({
  onSave,
  onCancel,
}: {
  onSave: (letter: any) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<any>({
    id: crypto.randomUUID(),
    originalNo: "",
    date: new Date().toISOString().slice(0, 10),
    inwardNo: "",
    fromWhom: "",
    subject: "",
    division: "General",
    forwardedTo: [],
    action: "Pending",
  });

  const set = (key: string, value: any) =>
    setForm((prev: any) => ({ ...prev, [key]: value }));

  return (
    <div>
      {[
        ["originalNo", "கடித எண்"],
        ["date", "திகதி"],
        ["inwardNo", "உள்வரவு எண்"],
        ["fromWhom", "அனுப்புநர்"],
        ["subject", "விடயம்"],
        ["division", "பிரிவு"],
      ].map(([key, label]) => (
        <input
          key={key}
          style={styles.input}
          placeholder={label}
          value={form[key]}
          onChange={(e) => set(key, e.target.value)}
        />
      ))}

      <select
        style={styles.input}
        value={form.action}
        onChange={(e) => set("action", e.target.value)}
      >
        <option>Pending</option>
        <option>In Progress</option>
        <option>Completed</option>
        <option>Replied</option>
      </select>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          style={styles.primaryButton}
          onClick={() => {
            if (!form.originalNo || !form.subject) {
              alert("கடித எண் மற்றும் விடயம் அவசியம்.");
              return;
            }
            onSave(form);
          }}
        >
          சேமி
        </button>
        <button style={styles.secondaryButton} onClick={onCancel}>
          ரத்து
        </button>
      </div>
    </div>
  );
}

function UserQuickForm({ onAdd }: { onAdd: (user: any) => void }) {
  const [form, setForm] = useState<any>({
    User_ID: "",
    Password: "",
    Name: "",
    Role: "User",
    Division: "",
    Status: "Active",
  });

  const set = (key: string, value: any) =>
    setForm((prev: any) => ({ ...prev, [key]: value }));

  return (
    <div>
      {[
        ["User_ID", "User ID"],
        ["Password", "Password"],
        ["Name", "பெயர்"],
        ["Division", "பிரிவு"],
      ].map(([key, label]) => (
        <input
          key={key}
          style={styles.input}
          placeholder={label}
          type={key === "Password" ? "password" : "text"}
          value={form[key]}
          onChange={(e) => set(key, e.target.value)}
        />
      ))}

      <select
        style={styles.input}
        value={form.Role}
        onChange={(e) => set("Role", e.target.value)}
      >
        <option>User</option>
        <option>Normal</option>
        <option>Mail Officer</option>
        <option>Mega</option>
        <option>Super Admin</option>
      </select>

      <button
        style={styles.primaryButton}
        onClick={() => {
          if (!form.User_ID || !form.Password || !form.Name) {
            alert("User ID, Password, Name அவசியம்.");
            return;
          }
          onAdd(form);
          setForm({
            User_ID: "",
            Password: "",
            Name: "",
            Role: "User",
            Division: "",
            Status: "Active",
          });
        }}
      >
        பயனரைச் சேர்
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    fontFamily: "Arial, sans-serif",
    color: "#1f2937",
  },
  header: {
    background: "#ffffff",
    padding: "16px 24px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  container: { padding: 24 },
  loginCard: {
    width: "min(420px, calc(100% - 32px))",
    margin: "10vh auto",
    background: "#fff",
    padding: 28,
    borderRadius: 14,
    boxShadow: "0 10px 30px rgba(0,0,0,.08)",
  },
  toolbar: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  input: {
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    marginBottom: 10,
    minWidth: 180,
    boxSizing: "border-box",
  },
  primaryButton: {
    padding: "10px 14px",
    border: 0,
    borderRadius: 8,
    cursor: "pointer",
    background: "#1d4ed8",
    color: "#fff",
    marginBottom: 10,
  },
  secondaryButton: {
    padding: "10px 14px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    cursor: "pointer",
    background: "#fff",
    marginBottom: 10,
  },
  smallButton: {
    padding: "6px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    cursor: "pointer",
    background: "#fff",
    marginRight: 6,
  },
  dangerButton: {
    padding: "6px 10px",
    border: "1px solid #ef4444",
    borderRadius: 6,
    cursor: "pointer",
    background: "#fff",
    color: "#b91c1c",
  },
  status: {
    padding: 10,
    background: "#fff",
    borderRadius: 8,
    marginBottom: 12,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "#fff",
  },
  empty: {
    background: "#fff",
    padding: 30,
    textAlign: "center",
  },
  modal: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 1000,
  },
  modalCard: {
    background: "#fff",
    width: "min(700px, 100%)",
    maxHeight: "90vh",
    overflow: "auto",
    padding: 24,
    borderRadius: 14,
  },
  userRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderBottom: "1px solid #eee",
  },
};
import React, { useEffect, useMemo, useState } from "react";
import { User, Letter, UserRole, LetterAction } from "./types";
import { INITIAL_USERS, INITIAL_LETTERS } from "./data/initialData";

const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbxh8-lD8wdhIjPO4zWUIzQBQBLOY2-rytdpsHaraod5tgiXDf-i3TEXgw1X0FEgQ0Bl5Q/exec";

type CloudPayload = Record<string, any>;

const safeJsonParse = <T,>(value: any, fallback: T): T => {
  if (value === null || value === undefined || value === "") return fallback;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
};

/**
 * Writes use a normal HTML form + hidden iframe.
 * This avoids the CORS problem that occurs when the React app is opened
 * directly from a file:// URL (origin "null").
 */
const sendDataToGoogleCloud = (payload: CloudPayload): boolean => {
  try {
    const action = String(payload.action ?? "").trim();
    if (!action) {
      throw new Error("Cloud action is missing.");
    }

    const form = document.createElement("form");
    form.method = "POST";
    form.action =
      WEB_APP_URL +
      "?action=" +
      encodeURIComponent(action);

    form.target = "hidden_iframe";
    form.style.display = "none";

    const queryParams: Record<string, string> = {
      action: action,
      id: String(payload.id ?? ""),
      originalNo: String(payload.originalNo ?? ""),
      date: String(payload.date ?? ""),
      inwardNo: String(payload.inwardNo ?? ""),
      fromWhom: String(payload.fromWhom ?? ""),
      subject: String(payload.subject ?? ""),
      division: String(payload.division ?? ""),
      forwardedTo: JSON.stringify(payload.forwardedTo ?? []),
      actionStatus: String(payload.actionStatus ?? payload.action ?? "Pending"),
      Password: String(payload.Password ?? ""),
      Name: String(payload.Name ?? ""),
      Role: String(payload.Role ?? ""),
      Division: String(payload.Division ?? ""),
      Status: String(payload.Status ?? ""),
      extraData: JSON.stringify(payload.extraData ?? payload),
    };

    Object.entries(queryParams).forEach(([key, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    let iframe = document.getElementById("hidden_iframe") as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "hidden_iframe";
      iframe.name = "hidden_iframe";
      iframe.style.display = "none";
      document.body.appendChild(iframe);
    }

    document.body.appendChild(form);
    form.submit();
    window.setTimeout(() => form.remove(), 1500);
    return true;
  } catch (error) {
    console.error("Cloud sync error:", error);
    return false;
  }
};
/**
 * JSONP is used for reading because fetch() from a local file can be blocked
 * by CORS. The Apps Script doGet() below supports callback=...
 */
const fetchCloudData = (): Promise<{ letters: any[][]; users: any[][] }> =>
  new Promise((resolve, reject) => {
    const callbackName = `kpnCloudCallback_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Google Apps Script read timed out."));
    }, 15000);

    const cleanup = () => {
      window.clearTimeout(timeout);
      const script = document.getElementById(callbackName);
      if (script) script.remove();
      delete (window as any)[callbackName];
    };

    (window as any)[callbackName] = (data: any) => {
      cleanup();
      resolve(data);
    };

    const script = document.createElement("script");
    script.id = callbackName;
    script.src =
      `${WEB_APP_URL}?type=get_all&callback=${encodeURIComponent(callbackName)}&t=${Date.now()}`;
    script.onerror = () => {
      cleanup();
      reject(new Error("Unable to read Google Sheets data."));
    };

    document.body.appendChild(script);
  });

const normalizeLetter = (row: any[]): any => {
  const extra = safeJsonParse<Record<string, any>>(row[9], {});
  return {
    ...extra,
    id: String(row[0] ?? extra.id ?? ""),
    originalNo: String(row[1] ?? extra.originalNo ?? ""),
    date: String(row[2] ?? extra.date ?? ""),
    inwardNo: String(row[3] ?? extra.inwardNo ?? ""),
    fromWhom: String(row[4] ?? extra.fromWhom ?? ""),
    subject: String(row[5] ?? extra.subject ?? ""),
    division: String(row[6] ?? extra.division ?? "General"),
    forwardedTo: safeJsonParse<any[]>(row[7], extra.forwardedTo ?? []),
    action: String(row[8] ?? extra.action ?? "Pending") as LetterAction,
  };

const normalizeUser = (row: any[]): any => {
  const extra = safeJsonParse<Record<string, any>>(row[6], {});
  return {
    ...extra,
    User_ID: String(row[0] ?? extra.User_ID ?? ""),
    Password: String(row[1] ?? extra.Password ?? ""),
    Name: String(row[2] ?? extra.Name ?? ""),
    Role: row[3] as UserRole,
    Division: String(row[4] ?? extra.Division ?? ""),
    Status: String(row[5] ?? extra.Status ?? "Active"),
  };
};

export default function App() {
  const [users, setUsers] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("kpn_vaharai_users");
      return saved ? JSON.parse(saved) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  const [letters, setLetters] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("kpn_vaharai_letters");
      return saved ? JSON.parse(saved) : INITIAL_LETTERS;
    } catch {
      return INITIAL_LETTERS;
    }
  });

  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem("kpn_vaharai_current_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("All");
  const [selectedLetter, setSelectedLetter] = useState<any | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [cloudMessage, setCloudMessage] = useState("");

  useEffect(() => {
    localStorage.setItem("kpn_vaharai_users", JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem("kpn_vaharai_letters", JSON.stringify(letters));
  }, [letters]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(
        "kpn_vaharai_current_user",
        JSON.stringify(currentUser)
      );
    } else {
      localStorage.removeItem("kpn_vaharai_current_user");
    }
  }, [currentUser]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoadingCloud(true);
      try {
        const result = await fetchCloudData();

        if (!mounted) return;

        if (Array.isArray(result.letters) && result.letters.length > 1) {
          const cloudLetters = result.letters
            .slice(1)
            .filter((row: any[]) => row && row.length)
            .map(normalizeLetter)
            .filter((letter: any) => letter.id || letter.originalNo)
            .reverse();

          if (cloudLetters.length) setLetters(cloudLetters);
        }

        if (Array.isArray(result.users) && result.users.length > 1) {
          const cloudUsers = result.users
            .slice(1)
            .filter((row: any[]) => row && row.length)
            .map(normalizeUser)
            .filter((user: any) => user.User_ID);

          if (cloudUsers.length) setUsers(cloudUsers);
        }

        setCloudMessage("Google Sheets தரவு இணைக்கப்பட்டது.");
      } catch (error) {
        console.error(error);
        setCloudMessage(
          "Google Sheets தரவைப் பெற முடியவில்லை. Local data பயன்படுத்தப்படுகிறது."
        );
      } finally {
        if (mounted) setLoadingCloud(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const usersMap = useMemo(
    () => new Map(users.map((u) => [u.User_ID, u])),
    [users]
  );

  const visibleLetters = useMemo(() => {
    const role = currentUser?.Role;

    const roleFiltered = letters.filter((letter) => {
      if (
        role === "Super Admin" ||
        role === "Mega" ||
        role === "Mail Officer"
      ) {
        return true;
      }

      if (role === "Normal") {
        return (letter.forwardedTo ?? []).some((uid: string) => {
          const u = usersMap.get(uid);
          return u && u.Division === currentUser.Division;
        });
      }

      if (role === "User") {
        return (letter.forwardedTo ?? []).includes(currentUser.User_ID);
      }

      return false;
    });

    return roleFiltered.filter((letter) => {
      if (actionFilter !== "All" && letter.action !== actionFilter) return false;

      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      const forwardedNames = (letter.forwardedTo ?? [])
        .map((id: string) => usersMap.get(id)?.Name || id)
        .join(" ")
        .toLowerCase();

      return [
        letter.originalNo,
        letter.inwardNo,
        letter.fromWhom,
        letter.subject,
        letter.date,
        letter.division,
        forwardedNames,
      ].some((value) => String(value ?? "").toLowerCase().includes(q));
    });
  }, [letters, usersMap, currentUser, searchQuery, actionFilter]);

  const cloudWrite = (payload: CloudPayload) => {
    const ok = sendDataToGoogleCloud(payload);
    if (!ok) setCloudMessage("Google Sheets அனுப்பலில் பிழை ஏற்பட்டது.");
    else setCloudMessage("Google Sheets sync அனுப்பப்பட்டது.");
    return ok;
  };

  const handleSaveNewLetter = (newLetter: Letter) => {
    setLetters((prev) => [newLetter, ...prev]);
    cloudWrite({
      action: "ADD_LETTER",
      id: newLetter.id,
      originalNo: newLetter.originalNo,
      date: newLetter.date,
      inwardNo: newLetter.inwardNo,
      fromWhom: newLetter.fromWhom,
      subject: newLetter.subject,
      division: newLetter.division || "General",
      forwardedTo: newLetter.forwardedTo || [],
      actionStatus: newLetter.action || "Pending",
      extraData: newLetter,
    });
    setShowRegister(false);
  };

  const handleUpdateLetter = (updated: Letter) => {
    setLetters((prev) =>
      prev.map((l) => (l.id === updated.id ? updated : l))
    );
    setSelectedLetter(updated);

    cloudWrite({
      action: "UPDATE_LETTER",
      id: updated.id,
      originalNo: updated.originalNo,
      date: updated.date,
      inwardNo: updated.inwardNo,
      fromWhom: updated.fromWhom,
      subject: updated.subject,
      division: updated.division || "General",
      forwardedTo: updated.forwardedTo || [],
      actionStatus: updated.action || "Pending",
      extraData: updated,
    });
  };

  const handleDeleteLetter = (letterId: string) => {
    if (!confirm("இந்தக் கடிதத்தை நீக்க வேண்டுமா?")) return;

    setLetters((prev) => prev.filter((l) => l.id !== letterId));
    if (selectedLetter?.id === letterId) setSelectedLetter(null);

    cloudWrite({
      action: "DELETE_LETTER",
      id: letterId,
    });
  };

  const handleAddUser = (newUser: User) => {
    setUsers((prev) => [...prev, newUser]);

    cloudWrite({
      action: "ADD_USER",
      User_ID: newUser.User_ID,
      Password: newUser.Password,
      Name: newUser.Name,
      Role: newUser.Role,
      Division: newUser.Division,
      Status: newUser.Status || "Active",
      extraData: newUser,
    });
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.User_ID === updatedUser.User_ID ? updatedUser : u
      )
    );

    if (currentUser?.User_ID === updatedUser.User_ID) {
      setCurrentUser(updatedUser);
    }

    cloudWrite({
      action: "UPDATE_USER",
      User_ID: updatedUser.User_ID,
      Password: updatedUser.Password,
      Name: updatedUser.Name,
      Role: updatedUser.Role,
      Division: updatedUser.Division,
      Status: updatedUser.Status || "Active",
      extraData: updatedUser,
    });
  };

  const handleDeleteUser = (userId: string) => {
    if (!confirm("இந்தப் பயனரை நீக்க வேண்டுமா?")) return;

    setUsers((prev) => prev.filter((u) => u.User_ID !== userId));

    cloudWrite({
      action: "DELETE_USER",
      User_ID: userId,
    });
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedLetter(null);
  };

  const handleResetData = () => {
    if (!confirm("Local sample data-க்கு reset செய்ய வேண்டுமா?")) return;
    setUsers(INITIAL_USERS);
    setLetters(INITIAL_LETTERS);
  };

  if (!currentUser) {
    return (
      <div style={styles.page}>
        <div style={styles.loginCard}>
          <h1 style={{ marginTop: 0 }}>KPN – Vaharai Letter Register</h1>
          <p>கோறளைப்பற்று வடக்கு – வாகரை பிரதேச செயலகம்</p>

          <input
            style={styles.input}
            placeholder="User ID"
            id="login-user-id"
          />
          <input
            style={styles.input}
            placeholder="Password"
            type="password"
            id="login-password"
          />

          <button
            style={styles.primaryButton}
            onClick={() => {
              const id = (
                document.getElementById("login-user-id") as HTMLInputElement
              )?.value;
              const password = (
                document.getElementById("login-password") as HTMLInputElement
              )?.value;

              const user = users.find(
                (u) =>
                  String(u.User_ID) === id &&
                  String(u.Password) === password &&
                  String(u.Status || "Active").toLowerCase() === "active"
              );

              if (user) handleLogin(user);
              else alert("User ID அல்லது Password தவறாக உள்ளது.");
            }}
          >
            உள்நுழை
          </button>

          <small>{cloudMessage}</small>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h2 style={{ margin: 0 }}>கடிதப் பதிவு மற்றும் கண்காணிப்பு</h2>
          <small>
            {currentUser.Name} — {currentUser.Role} —{" "}
            {currentUser.Division || "அனைத்து பிரிவுகள்"}
          </small>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {(currentUser.Role === "Super Admin" ||
            currentUser.Role === "Mega") && (
            <button
              style={styles.secondaryButton}
              onClick={() => setShowUsers(true)}
            >
              பயனர்கள்
            </button>
          )}
          <button style={styles.secondaryButton} onClick={handleLogout}>
            வெளியேறு
          </button>
        </div>
      </header>

      <main style={styles.container}>
        <div style={styles.toolbar}>
          <input
            style={styles.input}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="கடித எண் / விடயம் / அனுப்புநர் தேடுக..."
          />

          <select
            style={styles.input}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option>All</option>
            <option>Pending</option>
            <option>In Progress</option>
            <option>Completed</option>
            <option>Replied</option>
          </select>

          {(currentUser.Role === "Super Admin" ||
            currentUser.Role === "Mega" ||
            currentUser.Role === "Mail Officer") && (
            <button
              style={styles.primaryButton}
              onClick={() => setShowRegister(true)}
            >
              + புதிய கடிதம்
            </button>
          )}

          <button style={styles.secondaryButton} onClick={handleResetData}>
            Local Reset
          </button>
        </div>

        <div style={styles.status}>
          {loadingCloud ? "Google Sheets தரவு பெறப்படுகிறது..." : cloudMessage}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>கடித எண்</th>
                <th>திகதி</th>
                <th>உள்வரவு எண்</th>
                <th>அனுப்புநர்</th>
                <th>விடயம்</th>
                <th>பிரிவு</th>
                <th>நிலை</th>
                <th>செயல்</th>
              </tr>
            </thead>
            <tbody>
              {visibleLetters.map((letter) => (
                <tr key={letter.id}>
                  <td>{letter.originalNo}</td>
                  <td>{letter.date}</td>
                  <td>{letter.inwardNo}</td>
                  <td>{letter.fromWhom}</td>
                  <td>{letter.subject}</td>
                  <td>{letter.division}</td>
                  <td>{letter.action}</td>
                  <td>
                    <button
                      style={styles.smallButton}
                      onClick={() => setSelectedLetter(letter)}
                    >
                      திறக்க
                    </button>
                    {(currentUser.Role === "Super Admin" ||
                      currentUser.Role === "Mega") && (
                      <button
                        style={styles.dangerButton}
                        onClick={() => handleDeleteLetter(letter.id)}
                      >
                        நீக்கு
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {visibleLetters.length === 0 && (
          <div style={styles.empty}>கடிதங்கள் எதுவும் இல்லை.</div>
        )}
      </main>

      {showRegister && (
        <div style={styles.modal}>
          <div style={styles.modalCard}>
            <h3>புதிய கடிதம் பதிவு</h3>
            <LetterQuickForm
              onCancel={() => setShowRegister(false)}
              onSave={handleSaveNewLetter}
            />
          </div>
        </div>
      )}

      {selectedLetter && (
        <div style={styles.modal}>
          <div style={styles.modalCard}>
            <h3>கடித விவரங்கள்</h3>
            <p><b>கடித எண்:</b> {selectedLetter.originalNo}</p>
            <p><b>உள்வரவு எண்:</b> {selectedLetter.inwardNo}</p>
            <p><b>அனுப்புநர்:</b> {selectedLetter.fromWhom}</p>
            <p><b>விடயம்:</b> {selectedLetter.subject}</p>
            <p><b>பிரிவு:</b> {selectedLetter.division}</p>

            <button
              style={styles.secondaryButton}
              onClick={() => setSelectedLetter(null)}
            >
              மூடு
            </button>
          </div>
        </div>
      )}

      {showUsers && (
        <div style={styles.modal}>
          <div style={styles.modalCard}>
            <h3>பயனர் மேலாண்மை</h3>
            <UserQuickForm onAdd={handleAddUser} />
            <div style={{ marginTop: 16 }}>
              {users.map((u) => (
                <div key={u.User_ID} style={styles.userRow}>
                  <span>
                    {u.Name} ({u.User_ID}) — {u.Role}
                  </span>
                  <button
                    style={styles.dangerButton}
                    onClick={() => handleDeleteUser(u.User_ID)}
                  >
                    நீக்கு
                  </button>
                </div>
              ))}
            </div>
            <button
              style={styles.secondaryButton}
              onClick={() => setShowUsers(false)}
            >
              மூடு
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LetterQuickForm({
  onSave,
  onCancel,
}: {
  onSave: (letter: any) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<any>({
    id: crypto.randomUUID(),
    originalNo: "",
    date: new Date().toISOString().slice(0, 10),
    inwardNo: "",
    fromWhom: "",
    subject: "",
    division: "General",
    forwardedTo: [],
    action: "Pending",
  });

  const set = (key: string, value: any) =>
    setForm((prev: any) => ({ ...prev, [key]: value }));

  return (
    <div>
      {[
        ["originalNo", "கடித எண்"],
        ["date", "திகதி"],
        ["inwardNo", "உள்வரவு எண்"],
        ["fromWhom", "அனுப்புநர்"],
        ["subject", "விடயம்"],
        ["division", "பிரிவு"],
      ].map(([key, label]) => (
        <input
          key={key}
          style={styles.input}
          placeholder={label}
          value={form[key]}
          onChange={(e) => set(key, e.target.value)}
        />
      ))}

      <select
        style={styles.input}
        value={form.action}
        onChange={(e) => set("action", e.target.value)}
      >
        <option>Pending</option>
        <option>In Progress</option>
        <option>Completed</option>
        <option>Replied</option>
      </select>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          style={styles.primaryButton}
          onClick={() => {
            if (!form.originalNo || !form.subject) {
              alert("கடித எண் மற்றும் விடயம் அவசியம்.");
              return;
            }
            onSave(form);
          }}
        >
          சேமி
        </button>
        <button style={styles.secondaryButton} onClick={onCancel}>
          ரத்து
        </button>
      </div>
    </div>
  );
}

function UserQuickForm({ onAdd }: { onAdd: (user: any) => void }) {
  const [form, setForm] = useState<any>({
    User_ID: "",
    Password: "",
    Name: "",
    Role: "User",
    Division: "",
    Status: "Active",
  });

  const set = (key: string, value: any) =>
    setForm((prev: any) => ({ ...prev, [key]: value }));

  return (
    <div>
      {[
        ["User_ID", "User ID"],
        ["Password", "Password"],
        ["Name", "பெயர்"],
        ["Division", "பிரிவு"],
      ].map(([key, label]) => (
        <input
          key={key}
          style={styles.input}
          placeholder={label}
          type={key === "Password" ? "password" : "text"}
          value={form[key]}
          onChange={(e) => set(key, e.target.value)}
        />
      ))}

      <select
        style={styles.input}
        value={form.Role}
        onChange={(e) => set("Role", e.target.value)}
      >
        <option>User</option>
        <option>Normal</option>
        <option>Mail Officer</option>
        <option>Mega</option>
        <option>Super Admin</option>
      </select>

      <button
        style={styles.primaryButton}
        onClick={() => {
          if (!form.User_ID || !form.Password || !form.Name) {
            alert("User ID, Password, Name அவசியம்.");
            return;
          }
          onAdd(form);
          setForm({
            User_ID: "",
            Password: "",
            Name: "",
            Role: "User",
            Division: "",
            Status: "Active",
          });
        }}
      >
        பயனரைச் சேர்
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    fontFamily: "Arial, sans-serif",
    color: "#1f2937",
  },
  header: {
    background: "#ffffff",
    padding: "16px 24px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  container: { padding: 24 },
  loginCard: {
    width: "min(420px, calc(100% - 32px))",
    margin: "10vh auto",
    background: "#fff",
    padding: 28,
    borderRadius: 14,
    boxShadow: "0 10px 30px rgba(0,0,0,.08)",
  },
  toolbar: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  input: {
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    marginBottom: 10,
    minWidth: 180,
    boxSizing: "border-box",
  },
  primaryButton: {
    padding: "10px 14px",
    border: 0,
    borderRadius: 8,
    cursor: "pointer",
    background: "#1d4ed8",
    color: "#fff",
    marginBottom: 10,
  },
  secondaryButton: {
    padding: "10px 14px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    cursor: "pointer",
    background: "#fff",
    marginBottom: 10,
  },
  smallButton: {
    padding: "6px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    cursor: "pointer",
    background: "#fff",
    marginRight: 6,
  },
  dangerButton: {
    padding: "6px 10px",
    border: "1px solid #ef4444",
    borderRadius: 6,
    cursor: "pointer",
    background: "#fff",
    color: "#b91c1c",
  },
  status: {
    padding: 10,
    background: "#fff",
    borderRadius: 8,
    marginBottom: 12,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "#fff",
  },
  empty: {
    background: "#fff",
    padding: 30,
    textAlign: "center",
  },
  modal: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 1000,
  },
  modalCard: {
    background: "#fff",
    width: "min(700px, 100%)",
    maxHeight: "90vh",
    overflow: "auto",
    padding: 24,
    borderRadius: 14,
  },
  userRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderBottom: "1px solid #eee",
  },
};
