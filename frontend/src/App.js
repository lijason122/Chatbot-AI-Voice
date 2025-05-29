import React, { useState, useEffect, useRef } from "react";
import { Howl } from 'howler';
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [voiceOn, setVoiceOn] = useState(true);
  const chatEndRef = useRef(null);

  const speak = async (text) => {
  const toastId = toast.loading("Generating AI Chatbot voice...");
  try {
    const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/NOpBlnGInO9m6vDvFkFC", {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": process.env.REACT_APP_ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    console.log("Playing audio:", url);

    const sound = new Howl({ src: [url], format: ['mp3'] });
    sound.play();
    toast.update(toastId, {
      render: "AI Chatbot is speaking...",
      type: "success",
      isLoading: false,
      autoClose: 2000,
    });
  } catch (err) {
    console.error("TTS error:", err);
    toast.update(toastId, {
      render: "Voice error",
      type: "error",
      isLoading: false,
      autoClose: 3000,
    });
  }
};

 useEffect(() => {
    scrollToBottom();
  }, [messages]);

const scrollToBottom = () => {
  chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
};

const sendMessage = async () => {
  if (!input.trim()) return;

  const userMsg = { role: "user", text: input };
  setMessages((prev) => [...prev, userMsg]);
  setInput("");

  // Show typing indicator
  const loadingMsg = { role: "assistant", text: "...", loading: true };
  setMessages((prev) => [...prev, loadingMsg]);

  // Prepare message history for backend
  const history = messages
    .filter((m) => !m.loading)
    .map((m) => ({ role: m.role || (m.sender === "user" ? "user" : "assistant"), content: m.text }))
    .concat({ role: "user", content: input });

  try {
    const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: history }),
    });
    const data = await res.json();
    const reply = { role: "assistant", text: data.response };
    setMessages((prev) => [...prev.slice(0, -1), reply]);
    if (voiceOn) {
      speak(reply.text);
    }
  } catch (err) {
    setMessages((prev) => [...prev.slice(0, -1), { role: "assistant", text: "Error: " + err.message }]);
  }
};

  return (
    <div className="App">
      <ToastContainer position="top-center" autoClose={2000} />
      <div className="navbar">
        <h1>AI Chatbot</h1>
        <button className="voice-button" onClick={() => setVoiceOn((v) => !v)}>
          {voiceOn ? "🔈 Voice On" : "🔇 Voice Off"}
        </button>
      </div>

      <div className="chat-box">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role === "user" ? "user" : "bot"}`}>
            {msg.loading ? <span className="dot-flash">...</span> : msg.text}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="chat-footer">
        <input
          placeholder="Ask me anything!"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default App;
