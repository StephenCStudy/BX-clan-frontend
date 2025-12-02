import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { http } from "../../utils/http";
import { toast } from "react-toastify";
import { Socket } from "socket.io-client";
import { createSocket } from "../../utils/socket";
import BackButton from "../../components/BackButton";

interface Conversation {
  user: {
    _id: string;
    username: string;
    avatarUrl?: string;
    role: string;
  };
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface Message {
  _id: string;
  from: {
    _id: string;
    username: string;
    avatarUrl?: string;
    role: string;
  };
  to: {
    _id: string;
    username: string;
    avatarUrl?: string;
    role: string;
  };
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedUserRef = useRef<string | null>(null);
  const prevMessagesLengthRef = useRef<number>(0);
  const isInitialLoadRef = useRef<boolean>(true);

  useEffect(() => {
    selectedUserRef.current = selectedUserId;
  }, [selectedUserId]);

  // Only scroll to bottom when new messages are added (not on initial load)
  useEffect(() => {
    if (isInitialLoadRef.current) {
      // First load - don't scroll, just update the ref
      if (messages.length > 0) {
        prevMessagesLengthRef.current = messages.length;
        isInitialLoadRef.current = false;
      }
      return;
    }

    // Only scroll if messages were added (not on initial conversation load)
    if (messages.length > prevMessagesLengthRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  // Check if user is admin
  useEffect(() => {
    if (
      !user ||
      (user.role !== "leader" &&
        user.role !== "organizer" &&
        user.role !== "moderator")
    ) {
      navigate("/");
    }
  }, [user, navigate]);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    setConversationsLoading(true);
    try {
      const res = await http.get("/private-messages/conversations");
      const sorted: Conversation[] = [...(res.data || [])].sort(
        (a, b) =>
          new Date(b.lastMessageAt).getTime() -
          new Date(a.lastMessageAt).getTime()
      );
      setConversations(sorted);
      const current = selectedUserRef.current;
      if (!current && sorted.length > 0) {
        setSelectedUserId(sorted[0].user._id);
      } else if (current && !sorted.some((c) => c.user._id === current)) {
        setSelectedUserId(sorted[0]?.user._id || null);
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi tải danh sách tin nhắn");
      setConversations([]);
    } finally {
      setConversationsLoading(false);
    }
  }, [user]);

  const loadMessages = useCallback(
    async (partnerId: string) => {
      if (!partnerId || !user) return;
      setMessagesLoading(true);
      try {
        const res = await http.get(
          `/private-messages/conversation/${partnerId}`
        );
        setMessages(res.data || []);
      } catch {
        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    loadConversations();
    // Load all members for new message modal
    http
      .get("/members")
      .then((res) => {
        setAllMembers(res.data || []);
      })
      .catch(() => {});
  }, [loadConversations]);

  useEffect(() => {
    if (selectedUserId) {
      isInitialLoadRef.current = true;
      prevMessagesLengthRef.current = 0;
      loadMessages(selectedUserId);
    } else {
      setMessages([]);
    }
  }, [selectedUserId, loadMessages]);

  // Setup socket
  useEffect(() => {
    if (!user) return;

    const s = createSocket();
    s.emit("user:join", user.id);

    const appendIfActive = (msg: Message) => {
      const current = selectedUserRef.current;
      if (current && (msg.from._id === current || msg.to._id === current)) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    const handleReceive = (msg: Message) => {
      appendIfActive(msg);
      loadConversations();
    };

    s.on("private:receive", handleReceive);
    s.on("private:sent", appendIfActive);

    socketRef.current = s;

    return () => {
      s.off("private:receive", handleReceive);
      s.off("private:sent", appendIfActive);
      s.disconnect();
    };
  }, [user, loadConversations]);

  const sendMessage = async () => {
    if (!text.trim() || !selectedUserId || !user) return;
    try {
      const res = await http.post("/private-messages/send", {
        to: selectedUserId,
        message: text.trim(),
      });
      setMessages((prev) => [...prev, res.data]);
      setText("");
      loadConversations();
      toast.success("Đã gửi tin nhắn");
    } catch (err) {
      console.error("Send message error:", err);
      toast.error("Lỗi gửi tin nhắn");
    }
  };

  const selectMemberForNewConversation = (memberId: string) => {
    setSelectedUserId(memberId);
    setShowNewMessageModal(false);
    setMemberSearchQuery("");
  };

  if (!user) return null;

  const selectedConversation = conversations.find(
    (c) => c.user._id === selectedUserId
  );

  // Tìm thông tin user được chọn từ allMembers nếu không có trong conversations
  const selectedMember = allMembers.find((m) => m._id === selectedUserId);
  const selectedUserInfo = selectedConversation?.user || selectedMember;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4">
        <BackButton />

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mt-4">
          <div className="bg-linear-to-r from-red-600 to-orange-600 p-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <span>
                <i className="fa-solid fa-comments"></i>
              </span>{" "}
              Tin nhắn
            </h1>
            <p className="text-white/90 mt-2">Quản lý tin nhắn từ thành viên</p>
          </div>

          <div className="grid md:grid-cols-3 divide-x divide-gray-200">
            {/* Conversations List */}
            <div
              className="md:col-span-1 bg-gray-50 overflow-y-auto"
              style={{ maxHeight: "calc(100vh - 300px)" }}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-gray-900">
                    Cuộc trò chuyện
                  </h2>
                  <button
                    onClick={() => setShowNewMessageModal(true)}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition inline-flex items-center gap-1"
                  >
                    <i className="fa-solid fa-envelope"></i> Gửi tin nhắn
                  </button>
                </div>
                {conversationsLoading ? (
                  <div className="text-center py-8 text-gray-500">
                    Đang tải...
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">
                      <i className="fa-solid fa-inbox"></i>
                    </div>
                    <p>Chưa có tin nhắn nào</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conversations.map((conv) => (
                      <button
                        key={conv.user._id}
                        onClick={() => setSelectedUserId(conv.user._id)}
                        className={`w-full text-left p-3 rounded-lg transition ${
                          selectedUserId === conv.user._id
                            ? "bg-red-100 border-2 border-red-500"
                            : "bg-white border-2 border-gray-200 hover:border-red-300"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <img
                            src={
                              conv.user.avatarUrl ||
                              "https://placehold.co/40x40"
                            }
                            alt={conv.user.username}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-sm text-gray-900 truncate">
                                {conv.user.username}
                              </h3>
                              {conv.unreadCount > 0 && (
                                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                                  {conv.unreadCount}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 truncate mt-1">
                              {conv.lastMessage}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(conv.lastMessageAt).toLocaleDateString(
                                "vi-VN"
                              )}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className="md:col-span-2 flex flex-col">
              {selectedUserId && selectedUserInfo ? (
                <>
                  {/* Header */}
                  <div className="p-4 border-b-2 border-gray-200 bg-white">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          selectedUserInfo.avatarUrl ||
                          "https://placehold.co/40x40"
                        }
                        alt={selectedUserInfo.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <h3 className="font-bold text-gray-900">
                          {selectedUserInfo.username}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {selectedUserInfo.role === "member" ? (
                            <>
                              <i className="fa-solid fa-user"></i> Thành viên
                            </>
                          ) : (
                            <>
                              <i className="fa-solid fa-crown"></i> Admin
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div
                    className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
                    style={{ maxHeight: "calc(100vh - 450px)" }}
                  >
                    {messagesLoading ? (
                      <div className="text-center py-8 text-gray-500">
                        Đang tải tin nhắn...
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện!</p>
                      </div>
                    ) : (
                      messages.map((m) => {
                        const isMyMessage = m.from._id === user.id;
                        return (
                          <div
                            key={m._id}
                            className={`flex ${
                              isMyMessage ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 shadow-sm ${
                                isMyMessage
                                  ? "bg-red-600 text-white"
                                  : "bg-white border-2 border-gray-200"
                              }`}
                            >
                              <div
                                className={`font-semibold text-xs mb-1 ${
                                  isMyMessage ? "text-red-100" : "text-red-600"
                                }`}
                              >
                                {isMyMessage ? "Bạn" : m.from.username}
                              </div>
                              <div
                                className={`text-sm ${
                                  isMyMessage ? "text-white" : "text-gray-800"
                                }`}
                              >
                                {m.message}
                              </div>
                              <div
                                className={`text-xs mt-1 ${
                                  isMyMessage ? "text-red-200" : "text-gray-500"
                                }`}
                              >
                                {new Date(m.createdAt).toLocaleTimeString(
                                  "vi-VN",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="p-4 border-t-2 border-gray-200 bg-white">
                    <div className="flex gap-2">
                      <input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        className="flex-1 p-3 text-sm bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                        placeholder="Nhập tin nhắn..."
                        disabled={!selectedUserId}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!text.trim() || !selectedUserId}
                        className="px-5 py-3 rounded-lg text-white text-sm bg-red-600 hover:bg-red-700 shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Gửi
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="text-6xl mb-4">
                      <i className="fa-solid fa-comments"></i>
                    </div>
                    <p>Chọn một cuộc trò chuyện để bắt đầu</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* New Message Modal */}
        {showNewMessageModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-red-600 mb-4 inline-flex items-center gap-2">
                <i className="fa-solid fa-envelope"></i> Gửi tin nhắn mới
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Chọn thành viên để bắt đầu cuộc trò chuyện
              </p>

              <input
                type="text"
                placeholder="Tìm kiếm theo tên..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className="w-full p-3 mb-4 text-sm rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
              />

              <div className="space-y-2 mb-6">
                {allMembers
                  .filter((m) => {
                    const matchesSearch = memberSearchQuery
                      ? m.username
                          .toLowerCase()
                          .includes(memberSearchQuery.toLowerCase()) ||
                        m.ingameName
                          ?.toLowerCase()
                          .includes(memberSearchQuery.toLowerCase())
                      : true;
                    return matchesSearch && m._id !== user?.id;
                  })
                  .map((member) => (
                    <button
                      key={member._id}
                      onClick={() => selectMemberForNewConversation(member._id)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 hover:border-red-400 hover:bg-red-50 transition"
                    >
                      <img
                        src={member.avatarUrl || "https://placehold.co/40x40"}
                        alt={member.username}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-gray-900">
                          {member.username}
                        </div>
                        <div className="text-xs text-gray-500">
                          {member.ingameName || "Chưa có tên game"}
                        </div>
                      </div>
                    </button>
                  ))}
              </div>

              <button
                onClick={() => {
                  setShowNewMessageModal(false);
                  setMemberSearchQuery("");
                }}
                className="w-full py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold transition"
              >
                Hủy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
