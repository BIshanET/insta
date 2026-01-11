"use client";

import { useEffect, useState } from "react";

export default function NgrokAdminPage() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ngrokUrl, setNgrokUrl] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      setAuthToken(token);
      loadNgrok(token);
    }
  }, []);

  const handleLogin = async () => {
    setMessage("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.success && data.token) {
      localStorage.setItem("authToken", data.token);
      setAuthToken(data.token);
      setMessage("Login successful!");
      loadNgrok(data.token);
    } else {
      setMessage(data.message || "Login failed");
    }
  };

  const loadNgrok = async (token: string) => {
    const res = await fetch("/api/system/ngrok", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.url) setNgrokUrl(data.url);
  };

  const saveNgrok = async () => {
    if (!authToken) return;
    const res = await fetch("/api/system/ngrok", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ url: ngrokUrl }),
    });
    const data = await res.json();
    if (data.success) setMessage("Ngrok URL updated successfully!");
    else setMessage(data.error || "Failed to update");
  };

  const containerStyle = {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f3f4f6",
    fontFamily: "'Inter', sans-serif",
  } as const;

  const cardStyle = {
    background: "#fff",
    padding: 32,
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    width: 400,
  } as const;

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    marginBottom: 16,
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: 16,
  } as const;

  const buttonStyle = {
    width: "100%",
    padding: "12px",
    borderRadius: 8,
    background: "#4f46e5",
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    cursor: "pointer",
    border: "none",
    transition: "background 0.2s ease",
  } as const;

  const messageStyle = {
    marginTop: 12,
    fontSize: 14,
    color: "#16a34a", // green for success
  } as const;

  if (!authToken) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h2 style={{ marginBottom: 24, color: "#111827" }}>Admin Login</h2>
          <input
            style={inputStyle}
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            style={inputStyle}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button style={buttonStyle} onClick={handleLogin}>
            Login
          </button>
          {message && <p style={{ ...messageStyle, color: "#dc2626" }}>{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{ ...cardStyle, width: 500 }}>
        <h2 style={{ marginBottom: 24, color: "#111827" }}>Ngrok Url</h2>
        <input
          style={inputStyle}
          value={ngrokUrl}
          onChange={(e) => setNgrokUrl(e.target.value)}
          placeholder="https://xxxx.ngrok-free.app"
        />
        <button style={buttonStyle} onClick={saveNgrok}>
          Save
        </button>
        {message && <p style={messageStyle}>{message}</p>}
      </div>
    </div>
  );
}
