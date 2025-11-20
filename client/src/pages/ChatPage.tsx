import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { http } from "../utils/http";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";

export default function ChatPage() {
  const [messages, setMessages] = useState<
    Array<{ id?: string; user?: any; message: string; createdAt?: string }>
  >([]);
  const [text, setText] = useState("");
  const { user } = useAuth();
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await http.get("/chat/history");
        setMessages(res.data || []);
      } catch {}
      const s = io(SOCKET_URL);
      s.on("message:receive", (msg: any) => {
        setMessages((prev) => [...prev, msg]);
      });
      setSocket(s);
    })();
    return () => {
      socket?.disconnect();
    };
  }, []);

  const send = () => {
    if (!user) {
      toast.error("Hãy đăng nhập để chat");
      return;
    }
    if (!text.trim()) return;
    if (!socket) return;
    socket.emit("message:send", { userId: user.id, message: text });
    setText("");
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-red-600 mb-4">💬 Clan Chat</h1>
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4">
        <div className="h-96 overflow-y-auto mb-4 space-y-2 bg-gray-50 rounded p-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className="py-2 px-3 bg-white rounded shadow-sm border border-gray-100"
            >
              <span className="text-red-600 font-semibold text-sm">
                {m.user?.username || "User"}:
              </span>{" "}
              <span className="text-gray-800">{m.message}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && send()}
            className="flex-1 p-3 bg-gray-50 rounded border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
            placeholder="Nhập tin nhắn..."
            disabled={!user}
          />
          <button
            onClick={send}
            disabled={!user || !text.trim()}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold disabled:opacity-50 transition shadow-lg hover:shadow-xl"
          >
            Gửi
          </button>
        </div>
      </div>
    </div>
  );
}
