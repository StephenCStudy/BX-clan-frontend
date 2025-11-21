import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { upload } from "../../utils";
import { http } from "../../utils/http";
import { toast } from "react-toastify";
import { io, Socket } from "socket.io-client";
import { getRankColors, getLaneColors } from "../../utils/rankLaneColors";
import NotificationModal from "../../components/NotificationModal";

type AdminContact = {
  _id: string;
  username: string;
  ingameName?: string;
  role: string;
  avatarUrl?: string;
};

type PrivateChatUser = {
  _id: string;
  username: string;
  avatarUrl?: string;
  role?: string;
};

type PrivateChatMessage = {
  _id?: string;
  from?: PrivateChatUser;
  to?: PrivateChatUser;
  message: string;
  createdAt?: string;
};

type UserNotification = {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

type EditModalProps = {
  open: boolean;
  onClose: () => void;
  form: { ingameName: string; rank: string; lane: string };
  setForm: (v: { ingameName: string; rank: string; lane: string }) => void;
  onSave: () => void;
};

function EditProfileModal({
  open,
  onClose,
  form,
  setForm,
  onSave,
}: EditModalProps) {
  if (!open) return null;
  const rankOptions = [
    { key: "Đồng", icon: "⚫", label: "Đồng" },
    { key: "Bạc", icon: "🟤", label: "Bạc" },
    { key: "Vàng", icon: "⚪", label: "Vàng" },
    { key: "Bạch Kim", icon: "🟡", label: "Bạch Kim" },
    { key: "Lục Bảo", icon: "🔵", label: "Lục Bảo" },
    { key: "Kim Cương", icon: "💎", label: "Kim Cương" },
    { key: "Cao Thủ", icon: "🟣", label: "Cao Thủ" },
    { key: "Đại Cao Thủ", icon: "🔴", label: "Đại Cao Thủ" },
    { key: "Thách Đấu", icon: "⭐", label: "Thách Đấu" },
    { key: "Tối Cao", icon: "👑", label: "Tối Cao" },
  ];
  const laneOptions = [
    { key: "Baron", icon: "🛡️", label: "Baron" },
    { key: "Rừng", icon: "🌲", label: "Rừng" },
    { key: "Giữa", icon: "⚡", label: "Giữa" },
    { key: "Rồng", icon: "🐉", label: "Rồng" },
    { key: "Hỗ Trợ", icon: "💚", label: "Hỗ Trợ" },
  ];

  const selectedLanes = form.lane
    ? form.lane.split(",").map((l) => l.trim())
    : [];

  const toggleLane = (laneKey: string) => {
    if (selectedLanes.includes(laneKey)) {
      const newLanes = selectedLanes.filter((l) => l !== laneKey);
      setForm({ ...form, lane: newLanes.join(", ") });
    } else {
      if (selectedLanes.length < 2) {
        const newLanes = [...selectedLanes, laneKey];
        setForm({ ...form, lane: newLanes.join(", ") });
      }
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border-2 border-gray-200 overflow-hidden">
        <div className="bg-linear-to-r from-purple-500 via-pink-500 to-red-500 p-5">
          <h3 className="text-2xl font-bold text-white">Chỉnh sửa hồ sơ</h3>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Tên trong game
            </label>
            <input
              className="w-full p-3 bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-gray-900"
              value={form.ingameName}
              onChange={(e) => setForm({ ...form, ingameName: e.target.value })}
              placeholder="VD: PlayerName#123"
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Hạng
            </label>
            <div className="grid grid-cols-3 gap-2">
              {rankOptions.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setForm({ ...form, rank: r.key })}
                  className={`px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition ${
                    form.rank === r.key
                      ? "border-purple-500 bg-purple-50 text-purple-700"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                  }`}
                >
                  <span className="block text-xl">{r.icon}</span>
                  <span>{r.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Vị Trí (Chọn 1-2)
            </label>
            <div className="grid grid-cols-5 gap-2">
              {laneOptions.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => toggleLane(l.key)}
                  className={`px-2 py-2.5 rounded-lg border-2 text-sm font-medium transition ${
                    selectedLanes.includes(l.key)
                      ? "border-pink-500 bg-pink-50 text-pink-700"
                      : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                  }`}
                >
                  <span className="block text-xl">{l.icon}</span>
                  <span>{l.label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Đã chọn: {selectedLanes.length}/2
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium"
            >
              Hủy
            </button>
            <button
              onClick={onSave}
              className="px-5 py-2.5 rounded-lg bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold shadow-lg"
            >
              Lưu thay đổi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type AvatarModalProps = {
  open: boolean;
  onClose: () => void;
  currentAvatar: string;
  onUpload: (file: File) => void;
  uploading: boolean;
};

function AvatarModal({
  open,
  onClose,
  currentAvatar,
  onUpload,
  uploading,
}: AvatarModalProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border-2 border-gray-200">
        <div className="bg-linear-to-r from-blue-500 via-purple-500 to-pink-500 p-5">
          <h3 className="text-2xl font-bold text-white">Thay đổi avatar</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-center">
            <img
              src={preview || currentAvatar || "https://placehold.co/160x160"}
              alt="avatar"
              className="w-40 h-40 rounded-full object-cover border-4 border-purple-500 shadow-xl"
            />
          </div>
          <label className="block">
            <div className="w-full py-3 px-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-500 text-center cursor-pointer bg-gray-50 hover:bg-purple-50 transition">
              <span className="text-purple-600 font-semibold">
                📷 Chọn ảnh mới
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedFile(file);
                    const reader = new FileReader();
                    reader.onload = () => setPreview(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </div>
          </label>
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={uploading}
              className="px-5 py-2.5 rounded-lg border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              onClick={() => {
                if (selectedFile) onUpload(selectedFile);
              }}
              disabled={!selectedFile || uploading}
              className="px-5 py-2.5 rounded-lg bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold shadow-lg disabled:opacity-50"
            >
              {uploading ? "Đang tải..." : "Cập nhật"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [form, setForm] = useState({
    ingameName: "",
    rank: "",
    lane: "",
  });
  const [admins, setAdmins] = useState<AdminContact[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<string>("");
  const [messages, setMessages] = useState<PrivateChatMessage[]>([]);
  const [text, setText] = useState("");
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedAdminRef = useRef<string | null>(null);
  const SOCKET_URL = useMemo(
    () => import.meta.env.VITE_SOCKET_URL || "http://localhost:5000",
    []
  );

  const handleAvatarUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await upload.image(file);
      if (!url) {
        throw new Error("Upload không trả về URL");
      }
      const res = await http.put("/auth/me/avatar", { avatarUrl: url });
      updateUser({ avatarUrl: res.data?.avatarUrl || url });
      toast.success("Cập nhật avatar thành công");
      setAvatarModalOpen(false);
    } catch (err: unknown) {
      console.error("Avatar upload error:", err);
      const message = err instanceof Error ? err.message : "Upload thất bại";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const res = await http.put("/auth/me", form);
      updateUser({
        ingameName: res.data?.ingameName ?? form.ingameName,
        rank: res.data?.rank ?? form.rank,
        lane: res.data?.lane ?? form.lane,
      });
      toast.success("Đã cập nhật thông tin");
      setEditModalOpen(false);
    } catch {
      toast.error("Không thể cập nhật");
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await http.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      toast.error("Lỗi đánh dấu đã đọc");
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await http.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      toast.success("Đã xóa thông báo");
    } catch {
      toast.error("Lỗi xóa thông báo");
    }
  };

  const loadConversation = useCallback(
    async (adminId: string) => {
      if (!adminId || !user) return;
      setMessagesLoading(true);
      try {
        const res = await http.get<PrivateChatMessage[]>(
          `/private-messages/conversation/${adminId}`
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

  const handleSendMessage = () => {
    if (!text.trim() || !selectedAdmin || !user) return;
    if (!socketRef.current) {
      toast.error("Không thể kết nối máy chủ tin nhắn");
      return;
    }
    socketRef.current.emit("private:send", {
      from: user.id,
      to: selectedAdmin,
      message: text.trim(),
      fromUser: user,
    });
    setText("");
  };

  useEffect(() => {
    if (!user) return;
    setForm({
      ingameName: user.ingameName || "",
      rank: user.rank || "",
      lane: user.lane || "",
    });
  }, [user]);

  useEffect(() => {
    selectedAdminRef.current = selectedAdmin || null;
  }, [selectedAdmin]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Load admins (leaders/organizers/moderators)
    http
      .get("/members")
      .then((res) => {
        const list: AdminContact[] = res.data || [];
        const filtered = list.filter(
          (m) =>
            m.role === "leader" ||
            m.role === "organizer" ||
            m.role === "moderator"
        );
        setAdmins(filtered);
        if (filtered.length) setSelectedAdmin(filtered[0]._id);
      })
      .catch(() => {});

    // Load notifications
    http
      .get("/notifications")
      .then((res) => {
        setNotifications(res.data || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;

    const s = io(SOCKET_URL);
    s.emit("user:join", user.id);

    const appendIfActive = (msg: PrivateChatMessage) => {
      const target = selectedAdminRef.current;
      if (!target) return;
      if (msg.from?._id === target || msg.to?._id === target) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    s.on("private:receive", appendIfActive);
    s.on("private:sent", appendIfActive);

    socketRef.current = s;

    return () => {
      s.off("private:receive", appendIfActive);
      s.off("private:sent", appendIfActive);
      s.disconnect();
    };
  }, [SOCKET_URL, user]);

  // Load conversation when admin selection changes
  useEffect(() => {
    if (!selectedAdmin) return;
    loadConversation(selectedAdmin);
  }, [selectedAdmin, loadConversation]);

  const completeness = useMemo(() => {
    if (!user) return 0;
    const filled = [
      form.ingameName || user.ingameName,
      form.rank || user.rank,
      form.lane || user.lane,
      user.avatarUrl,
    ].filter(Boolean).length;
    return Math.round((filled / 4) * 100);
  }, [form.ingameName, form.rank, form.lane, user]);

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-5 md:p-6">
      <div className="relative mb-6 md:mb-8">
        <div className="h-48 rounded-2xl bg-linear-to-r from-rose-500 via-red-600 to-orange-500 shadow-2xl overflow-hidden">
          <div className="h-full w-full flex items-center justify-between px-6 bg-linear-to-b from-transparent to-black/20">
            <div>
              <h1
                className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white drop-shadow-lg"
                style={{ color: "#ffffff" }}
              >
                {user.username}
              </h1>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`inline-block px-2 md:px-3 py-1 rounded-lg text-xs md:text-sm font-semibold border-2 ${
                    user.role === "leader"
                      ? "bg-yellow-400/30 text-yellow-50 border-yellow-300"
                      : user.role === "organizer"
                      ? "bg-fuchsia-400/30 text-fuchsia-50 border-fuchsia-300"
                      : user.role === "moderator"
                      ? "bg-cyan-400/30 text-cyan-50 border-cyan-300"
                      : "bg-white/20 text-white border-white/40"
                  }`}
                >
                  {user.role === "leader"
                    ? "👑 Trưởng Clan"
                    : user.role === "organizer"
                    ? "🎯 Ban Tổ Chức"
                    : user.role === "moderator"
                    ? "🛡️ Quản Trị Viên"
                    : "👤 Thành Viên"}
                </span>
                <button
                  onClick={() => setShowNotifications(true)}
                  className="relative px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 border-2 border-white/40 text-white text-xs md:text-sm font-semibold transition"
                >
                  🔔 Thông báo
                  {notifications.filter((n) => !n.isRead).length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {notifications.filter((n) => !n.isRead).length}
                    </span>
                  )}
                </button>
              </div>
              {/* Mobile completeness */}
              <div className="md:hidden mt-3 w-48 max-w-full">
                <div className="text-white text-xs mb-1 flex justify-between">
                  <span>Hồ sơ</span>
                  <span>{completeness}%</span>
                </div>
                <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full"
                    style={{ width: `${completeness}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="hidden md:block w-64">
              <div className="text-white text-sm mb-1 flex justify-between">
                <span>Hoàn thiện hồ sơ</span>
                <span>{completeness}%</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full"
                  style={{ width: `${completeness}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 md:p-6 shadow-xl">
            <div className="flex flex-row items-start gap-4 md:gap-6">
              <div className="relative group">
                <img
                  src={user.avatarUrl || "https://placehold.co/140x140"}
                  alt="avatar"
                  className="w-20 h-20 md:w-32 md:h-32 rounded-2xl object-cover border-4 border-purple-500 shadow-lg"
                />
                <button
                  onClick={() => setAvatarModalOpen(true)}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition"
                >
                  <svg
                    className="w-6 h-6 md:w-8 md:h-8 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 space-y-3 md:space-y-5">
                <div>
                  <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-1">
                    {user.username}
                  </h2>
                  <span
                    className={`inline-block px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-xs md:text-sm font-semibold ${
                      user.role === "leader"
                        ? "bg-linear-to-r from-yellow-400 to-amber-500 text-white shadow"
                        : user.role === "organizer"
                        ? "bg-linear-to-r from-purple-400 to-fuchsia-500 text-white shadow"
                        : user.role === "moderator"
                        ? "bg-linear-to-r from-blue-400 to-cyan-500 text-white shadow"
                        : "bg-gray-100 text-gray-800 border-2 border-gray-300"
                    }`}
                  >
                    {user.role === "leader"
                      ? "👑 Trưởng Clan"
                      : user.role === "organizer"
                      ? "🎯 Ban Tổ Chức"
                      : user.role === "moderator"
                      ? "🛡️ Quản Trị Viên"
                      : "👤 Thành Viên"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 md:gap-4">
                  <div className="bg-linear-to-br from-purple-50 to-pink-50 rounded-xl p-2 md:p-4 border-2 border-purple-200">
                    <div className="text-xs text-purple-600 font-semibold mb-1">
                      TÊN TRONG GAME
                    </div>
                    <div className="text-sm md:text-lg font-bold text-gray-900 truncate">
                      {user.ingameName || "Chưa cập nhật"}
                    </div>
                  </div>
                  <div
                    className={`rounded-xl p-2 md:p-4 border-2 ${
                      user.rank
                        ? `${getRankColors(user.rank).bg} ${
                            getRankColors(user.rank).border
                          }`
                        : "bg-linear-to-br from-gray-100 to-gray-200 border-gray-300"
                    }`}
                  >
                    <div
                      className={`text-xs font-semibold mb-1 ${
                        user.rank
                          ? getRankColors(user.rank).text
                          : "text-gray-600"
                      }`}
                    >
                      HẠNG
                    </div>
                    <div
                      className={`text-sm md:text-lg font-bold ${
                        user.rank
                          ? getRankColors(user.rank).text
                          : "text-gray-700"
                      }`}
                    >
                      {user.rank || "—"}
                    </div>
                  </div>
                  <div
                    className={`rounded-xl p-2 md:p-4 border-2 ${
                      user.lane
                        ? `${getLaneColors(user.lane).bg} ${
                            getLaneColors(user.lane).border
                          }`
                        : "bg-linear-to-br from-gray-100 to-gray-200 border-gray-300"
                    }`}
                  >
                    <div
                      className={`text-xs font-semibold mb-1 ${
                        user.lane
                          ? getLaneColors(user.lane).text
                          : "text-gray-600"
                      }`}
                    >
                      VỊ TRÍ
                    </div>
                    <div
                      className={`text-sm md:text-lg font-bold ${
                        user.lane
                          ? getLaneColors(user.lane).text
                          : "text-gray-700"
                      }`}
                    >
                      {user.lane || "—"}
                    </div>
                  </div>
                  <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-xl p-2 md:p-4 border-2 border-green-200">
                    <div className="text-xs text-green-600 font-semibold mb-1">
                      HOÀN THIỆN
                    </div>
                    <div className="text-sm md:text-lg font-bold text-gray-900">
                      {completeness}%
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setEditModalOpen(true)}
                  className="w-full py-2 md:py-3 rounded-xl text-white text-sm md:text-base font-bold bg-linear-to-r from-purple-500 via-pink-500 to-red-500 hover:from-purple-600 hover:via-pink-600 hover:to-red-600 shadow-lg transition"
                >
                  ✏️ Chỉnh sửa hồ sơ
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Admin Chat Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 md:p-6 shadow-xl">
            <h2 className="text-base md:text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
              <span>💬</span> Liên hệ quản trị
            </h2>
            <div className="mb-4">
              <label className="block text-xs md:text-sm text-gray-600 font-medium mb-2">
                Gửi tới:
              </label>
              <select
                className="w-full p-2 md:p-2.5 text-sm rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-gray-50"
                value={selectedAdmin}
                onChange={(e) => setSelectedAdmin(e.target.value)}
              >
                {admins.map((a) => {
                  const roleLabel =
                    a.role === "leader"
                      ? "👑 Tộc trưởng"
                      : a.role === "organizer"
                      ? "⭐ Tổ chức"
                      : "🛡️ Điều hành";
                  return (
                    <option key={a._id} value={a._id}>
                      {roleLabel} - {a.ingameName || a.username}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="h-64 overflow-y-auto rounded-lg bg-gray-50 p-3 mb-3 space-y-2 border-2 border-gray-200">
              {messagesLoading ? (
                <p className="text-center text-gray-500 text-xs md:text-sm py-8">
                  Đang tải tin nhắn...
                </p>
              ) : messages.length === 0 ? (
                <p className="text-center text-gray-400 text-xs md:text-sm py-8">
                  Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện!
                </p>
              ) : (
                messages.map((m, idx) => {
                  const isMyMessage = m.from?._id === user.id;
                  const senderName = isMyMessage
                    ? "Bạn"
                    : m.from?.username || "Admin";
                  return (
                    <div
                      key={m._id || idx}
                      className={`flex ${
                        isMyMessage ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-2 md:p-3 shadow-sm ${
                          isMyMessage
                            ? "bg-red-600 text-white"
                            : "bg-white border-2 border-gray-200"
                        }`}
                      >
                        <div
                          className={`font-semibold text-xs md:text-sm mb-1 ${
                            isMyMessage ? "text-red-100" : "text-red-600"
                          }`}
                        >
                          {senderName}
                        </div>
                        <div
                          className={`text-xs md:text-sm ${
                            isMyMessage ? "text-white" : "text-gray-800"
                          }`}
                        >
                          {m.message}
                        </div>
                        {m.createdAt && (
                          <div
                            className={`text-xs mt-1 ${
                              isMyMessage ? "text-red-200" : "text-gray-500"
                            }`}
                          >
                            {new Date(m.createdAt).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="flex-1 p-2 md:p-2.5 text-sm bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                placeholder="Nhập tin nhắn..."
              />
              <button
                onClick={handleSendMessage}
                className="px-3 md:px-5 py-2 md:py-2.5 rounded-lg text-white text-sm bg-red-600 hover:bg-red-700 shadow-lg font-semibold"
              >
                Gửi
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              💡 Tin nhắn sẽ được gửi tới quản trị viên đã chọn.
            </p>
          </div>
        </div>
      </div>

      <EditProfileModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        form={form}
        setForm={setForm}
        onSave={handleSaveProfile}
      />
      <AvatarModal
        open={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        currentAvatar={user.avatarUrl || ""}
        onUpload={handleAvatarUpload}
        uploading={uploading}
      />
      <NotificationModal
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        onMarkRead={handleMarkNotificationRead}
        onDelete={handleDeleteNotification}
      />
    </div>
  );
}
