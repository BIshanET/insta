"use client";

import { useEffect, useState } from "react";

// Define the shape of a Tag based on your schema
interface UserTag {
  id: string;
  username: string;
}

export default function UserTagsAdminPage() {
  // --- Auth State ---
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // --- Feature State ---
  const [tags, setTags] = useState<UserTag[]>([]);
  const [newTag, setNewTag] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // --- 1. Init: Check for local token ---
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      setAuthToken(token);
      loadTags(token);
    }
  }, []);

  // --- 2. Login Logic (Identical to your example) ---
  const handleLogin = async () => {
    setMessage("");
    try {
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
        loadTags(data.token);
      } else {
        setMessage(data.message || "Login failed");
      }
    } catch (error) {
      setMessage("An error occurred during login");
    }
  };

  // --- 3. Tag Management Logic ---

  // Fetch all tags
  const loadTags = async (token: string) => {
    try {
      const res = await fetch("/api/admin/tags", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTags(data);
      }
    } catch (error) {
      console.error("Failed to load tags");
    }
  };

  // Add a new tag
  const handleAddTag = async () => {
    if (!authToken || !newTag.trim()) return;
    setIsLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/admin/tags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ username: newTag }),
      });

      const data = await res.json();

      if (res.ok) {
        setNewTag(""); // Clear input
        loadTags(authToken); // Refresh list
        setMessage("Tag added successfully!");
      } else {
        setMessage(data.error || "Failed to add tag");
      }
    } catch (error) {
      setMessage("Error adding tag");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a tag
  const handleDeleteTag = async (id: string) => {
    if (!authToken) return;
    if(!confirm("Are you sure you want to delete this tag?")) return;

    try {
      const res = await fetch(`/api/admin/tags?id=${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.ok) {
        // Optimistically remove from UI
        setTags(tags.filter((t) => t.id !== id));
        setMessage("Tag deleted successfully");
      } else {
        setMessage("Failed to delete tag");
      }
    } catch (error) {
      setMessage("Error deleting tag");
    }
  };

  // --- 4. Styles (Matches your existing design) ---
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
    width: 500, // Slightly wider for the list
    maxHeight: "90vh",
    overflowY: "auto",
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

  const listContainerStyle = {
    marginTop: 20,
    borderTop: "1px solid #e5e7eb",
    paddingTop: 10,
  } as const;

  const tagItemStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 0",
    borderBottom: "1px solid #f3f4f6",
  } as const;

  const deleteBtnStyle = {
    background: "#fee2e2",
    color: "#dc2626",
    border: "none",
    padding: "6px 12px",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "12px",
  } as const;

  const messageStyle = {
    marginTop: 12,
    fontSize: 14,
    color: message.toLowerCase().includes("failed") || message.toLowerCase().includes("error") ? "#dc2626" : "#16a34a",
    textAlign: "center" as const,
  };

  // --- 5. Render Login View ---
  if (!authToken) {
    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, width: 400 }}>
          <h2 style={{ marginBottom: 24, color: "#111827", textAlign: "center" }}>Admin Login</h2>
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
          {message && <p style={messageStyle}>{message}</p>}
        </div>
      </div>
    );
  }

  // --- 6. Render Tag Management View ---
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 24}}>
          <h2 style={{ margin: 0, color: "#111827" }}>Manage Tags</h2>
          <button 
            onClick={() => { localStorage.removeItem("authToken"); setAuthToken(null); }}
            style={{background:'transparent', border:'none', color:'#6b7280', cursor:'pointer', fontSize:14}}
          >
            Logout
          </button>
        </div>

        {/* Input Area */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: 10 }}>
          <input
            style={{ ...inputStyle, marginBottom: 0 }}
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="@username"
          />
          <button 
            style={{ ...buttonStyle, width: 'auto', whiteSpace: 'nowrap' }} 
            onClick={handleAddTag}
            disabled={isLoading}
          >
            {isLoading ? "..." : "Add"}
          </button>
        </div>
        
        {message && <p style={messageStyle}>{message}</p>}

        {/* List Area */}
        <div style={listContainerStyle}>
          <h3 style={{ fontSize: 16, color: '#374151', marginBottom: 10 }}>Existing Tags ({tags.length})</h3>
          
          {tags.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: 14 }}>No tags added yet.</p>
          ) : (
            <div>
              {tags.map((tag) => (
                <div key={tag.id} style={tagItemStyle}>
                  <span style={{ color: '#4b5563' }}>{tag.username}</span>
                  <button 
                    style={deleteBtnStyle}
                    onClick={() => handleDeleteTag(tag.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}