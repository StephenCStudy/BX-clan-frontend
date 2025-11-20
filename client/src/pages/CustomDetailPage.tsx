import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { http } from "../utils/http";
import { useAuth } from "../context/AuthContext";
import BackButton from "../components/BackButton";
import ConfirmModal from "../components/ConfirmModal";
import { toast } from "react-toastify";

interface Custom {
  _id: string;
  title: string;
  description: string;
  scheduleTime: string;
  maxPlayers: number;
  status: string;
  createdBy: { username: string };
  team1Score?: number;
  team2Score?: number;
  bestOf?: number;
  gameMode?: string;
  players?: any[];
  team1?: any[];
  team2?: any[];
}

interface Registration {
  _id: string;
  user: {
    _id: string;
    username: string;
    ingameName: string;
    avatarUrl?: string;
  };
  status: string;
}

interface ChatMessage {
  _id: string;
  user: {
    _id: string;
    username: string;
    avatarUrl?: string;
  };
  message: string;
  createdAt: string;
}

export default function CustomDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [custom, setCustom] = useState<Custom | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [hasRegistered, setHasRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showRegForm, setShowRegForm] = useState(false);
  const [regForm, setRegForm] = useState({
    ingameName: "",
    lane: "",
    rank: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    scheduleTime: "",
    maxPlayers: 10,
    status: "open",
    bestOf: 3,
    gameMode: "5vs5",
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [selectedInvite, setSelectedInvite] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const gameModeOptions = [
    { value: "5vs5", label: "🗺️ 5vs5 - Summoner's Rift" },
    { value: "aram", label: "🌉 ARAM - Howling Abyss" },
    { value: "draft", label: "🏆 Giải đấu cấm chọn" },
    { value: "minigame", label: "🎮 Minigame" },
  ];
  const laneOptions = [
    { key: "Baron", icon: "🛡️", label: "Baron" },
    { key: "Rừng", icon: "🌲", label: "Rừng" },
    { key: "Giữa", icon: "⚡", label: "Giữa" },
    { key: "Rồng", icon: "🐉", label: "Rồng" },
    { key: "Hỗ Trợ", icon: "💚", label: "Hỗ Trợ" },
  ];
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

  const canManage = user && user.role !== "member";

  const loadMembers = async () => {
    try {
      const res = await http.get("/members");
      setAllMembers(res.data);
    } catch (err) {
      console.error("Error loading members:", err);
    }
  };

  const loadPendingInvites = async () => {
    if (!id || !canManage) return;
    try {
      const res = await http.get(`/customs/${id}/invites`);
      setPendingInvites(res.data);
    } catch (err) {
      console.error("Error loading invites:", err);
    }
  };

  const approveInvite = async (inviteId: string) => {
    if (!id) return;
    try {
      await http.post(`/customs/${id}/invites/${inviteId}/approve`);
      toast.success("Đã chấp nhận lời mời!");
      loadPendingInvites();
      // Reload custom data
      const res = await http.get(`/customs/${id}`);
      setCustom(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi chấp nhận");
    }
  };

  const rejectInvite = async (inviteId: string) => {
    if (!id) return;
    try {
      await http.post(`/customs/${id}/invites/${inviteId}/reject`);
      toast.success("Đã từ chối lời mời");
      loadPendingInvites();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi từ chối");
    }
  };

  const sendInvite = async () => {
    if (!selectedInvite || !id) return;
    try {
      await http.post(`/customs/${id}/invite`, { userId: selectedInvite });
      toast.success("Đã gửi lời mời!");
      setShowInviteModal(false);
      setSelectedInvite(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi gửi lời mời");
    }
  };

  const loadChat = async () => {
    if (!id) return;
    try {
      const res = await http.get(`/chat/customs/${id}`);
      setChatMessages(res.data);
    } catch (err) {
      console.error("Error loading chat:", err);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [res1, res2] = await Promise.all([
          http.get(`/customs/${id}`),
          canManage
            ? http.get(`/registrations/${id}/registrations`)
            : Promise.resolve({ data: [] }),
        ]);
        setCustom(res1.data);
        setTeam1Score(res1.data.team1Score || 0);
        setTeam2Score(res1.data.team2Score || 0);
        setEditForm({
          title: res1.data.title || "",
          description: res1.data.description || "",
          scheduleTime: res1.data.scheduleTime
            ? new Date(res1.data.scheduleTime).toISOString().slice(0, 16)
            : "",
          maxPlayers: res1.data.maxPlayers || 10,
          status: res1.data.status || "open",
          bestOf: res1.data.bestOf || 3,
          gameMode: res1.data.gameMode || "5vs5",
        });
        setRegistrations(res2.data);

        // Check if current user has registered
        if (user && res1.data) {
          if (user) {
            setHasRegistered(
              res2.data.some((r: Registration) => r.user._id === user.id)
            );
            setRegForm((prev) => ({
              ...prev,
              ingameName: user.ingameName || "",
            }));
          }
        }
      } catch {
        toast.error("Lỗi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    })();
    loadChat();
    loadMembers();
    loadPendingInvites();
    // Auto-refresh chat every 5 seconds
    const interval = setInterval(loadChat, 5000);
    return () => clearInterval(interval);
  }, [id, user, canManage]);

  useEffect(() => {
    if (canManage) {
      const edit = searchParams.get("edit");
      setIsEditing(edit === "1");
    }
  }, [searchParams, canManage]);

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.ingameName || !regForm.lane || !regForm.rank) {
      toast.error("Vui lòng nhập đủ Tên Trong Game, Vị Trí, Hạng");
      return;
    }
    try {
      await http.post(`/registrations/${id}/register`, regForm);
      toast.success("Đăng ký thành công!");
      window.location.reload();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Đăng ký thất bại");
    }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await http.put(`/customs/${id}`, {
        ...editForm,
        // ensure backend receives ISO string
        scheduleTime: editForm.scheduleTime
          ? new Date(editForm.scheduleTime).toISOString()
          : null,
      });
      toast.success("Cập nhật Custom thành công");
      setCustom((prev) =>
        prev
          ? {
              ...prev,
              title: editForm.title,
              description: editForm.description,
              scheduleTime: new Date(editForm.scheduleTime).toISOString(),
              maxPlayers: editForm.maxPlayers,
              status: editForm.status,
            }
          : prev
      );
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Cập nhật thất bại");
    }
  };

  const deleteCustom = async () => {
    if (!canManage) return;
    try {
      await http.delete(`/customs/${id}`);
      toast.success("Đã xóa Custom");
      navigate("/customs");
    } catch {
      toast.error("Xóa thất bại");
    } finally {
      setConfirmOpen(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    setChatLoading(true);
    try {
      const res = await http.post(`/chat/customs/${id}`, {
        message: chatInput.trim(),
      });
      setChatMessages((prev) => [...prev, res.data]);
      setChatInput("");
      // Scroll to bottom
      setTimeout(() => {
        const chatDiv = document.getElementById("chat-messages");
        if (chatDiv) chatDiv.scrollTop = chatDiv.scrollHeight;
      }, 100);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gửi tin nhắn thất bại");
    } finally {
      setChatLoading(false);
    }
  };

  const updateScore = async (team: "team1" | "team2", delta: number) => {
    if (!canManage) return;
    const maxScore = custom?.bestOf || 10;
    const currentScore = team === "team1" ? team1Score : team2Score;
    const newScore = Math.max(0, Math.min(maxScore, currentScore + delta));
    if (newScore === currentScore) return;

    try {
      await http.put(`/customs/${id}`, {
        [team === "team1" ? "team1Score" : "team2Score"]: newScore,
      });
      if (team === "team1") {
        setTeam1Score(newScore);
      } else {
        setTeam2Score(newScore);
      }
      toast.success("Cập nhật điểm thành công");
    } catch {
      toast.error("Cập nhật điểm thất bại");
    }
  };

  if (loading) return <div className="text-center py-10">Đang tải...</div>;
  if (!custom) return <div className="text-center py-10">Không tìm thấy</div>;

  // Use team1/team2 from custom if available, otherwise fall back to registrations
  let teamA = custom.team1 || [];
  let teamB = custom.team2 || [];

  // Fallback: if no team1/team2, use registrations
  if (teamA.length === 0 && teamB.length === 0) {
    const approvedPlayers = registrations.filter(
      (r) => r.status === "approved"
    );
    teamA = approvedPlayers.slice(0, 5);
    teamB = approvedPlayers.slice(5, 10);
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <BackButton />
        </div>

        {/* Title Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-l-4 border-red-600">
          {!isEditing ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-3xl font-bold text-red-600 mb-2">
                    {custom.title}
                  </h1>
                  <p className="text-gray-600 mb-4">{custom.description}</p>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-3 py-2 border-2 border-gray-300 rounded-lg hover:border-gray-400"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => setConfirmOpen(true)}
                      className="px-3 py-2 border-2 border-red-300 text-red-600 rounded-lg hover:border-red-400"
                    >
                      Xóa
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="px-3 py-1 bg-gray-100 rounded-full">
                  📅 {new Date(custom.scheduleTime).toLocaleString("vi-VN")}
                </span>
                <span className="px-3 py-1 bg-gray-100 rounded-full">
                  👥 {teamA.length + teamB.length}/{custom.maxPlayers} players
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
                  {gameModeOptions.find((m) => m.value === custom.gameMode)
                    ?.label || "🗺️ 5vs5"}
                </span>
                <span
                  className={`px-3 py-1 rounded-full font-semibold ${
                    custom.status === "open"
                      ? "bg-green-100 text-green-700"
                      : custom.status === "ongoing"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {custom.status === "open"
                    ? "🟢 Mở"
                    : custom.status === "ongoing"
                    ? "🔵 Đang chơi"
                    : "⚫ Đóng"}
                </span>
              </div>
            </>
          ) : (
            <form onSubmit={saveEdit} className="space-y-4">
              <h2 className="text-2xl font-bold text-red-600">Sửa Custom</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-gray-700 font-medium">
                    Tiêu đề
                  </label>
                  <input
                    className="w-full p-3 bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm({ ...editForm, title: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 text-gray-700 font-medium">
                    Thời gian
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full p-3 bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                    value={editForm.scheduleTime}
                    onChange={(e) =>
                      setEditForm({ ...editForm, scheduleTime: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 text-gray-700 font-medium">
                    Số người
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="w-full p-3 bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                    value={editForm.maxPlayers}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        maxPlayers: Number(e.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 text-gray-700 font-medium">
                    Trạng thái
                  </label>
                  <select
                    className="w-full p-3 bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status: e.target.value })
                    }
                  >
                    <option value="open">Mở</option>
                    <option value="ongoing">Đang chơi</option>
                    <option value="closed">Đóng</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-gray-700 font-medium">
                    Số trận thắng
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    className="w-full p-3 bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                    value={editForm.bestOf}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        bestOf: Number(e.target.value),
                      })
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1 text-gray-700 font-medium">
                  Chế độ chơi / Map
                </label>
                <select
                  className="w-full p-3 bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                  value={editForm.gameMode}
                  onChange={(e) =>
                    setEditForm({ ...editForm, gameMode: e.target.value })
                  }
                >
                  {gameModeOptions.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 text-gray-700 font-medium">
                  Mô tả
                </label>
                <textarea
                  rows={3}
                  className="w-full p-3 bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
                >
                  Lưu
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Hủy
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Main Layout Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Teams & Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Team Formation */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                ⚔️ Đội hình thi đấu
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Team A */}
                <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-red-700">🔴 ĐỘI ĐỎ</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-red-700">
                        {team1Score}
                      </span>
                      {canManage && (
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => updateScore("team1", 1)}
                            disabled={team1Score >= (custom?.bestOf || 10)}
                            className="px-2 py-0.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded text-xs font-bold"
                          >
                            +
                          </button>
                          <button
                            onClick={() => updateScore("team1", -1)}
                            disabled={team1Score <= 0}
                            className="px-2 py-0.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded text-xs font-bold"
                          >
                            −
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {teamA.length > 0 ? (
                      teamA.map((member: any) => {
                        const user = member.user || member;
                        return (
                          <div
                            key={user._id}
                            className="flex items-center gap-2 bg-white p-2 rounded"
                          >
                            <img
                              src={
                                user.avatarUrl || "https://placehold.co/40x40"
                              }
                              alt=""
                              className="w-8 h-8 rounded-full"
                            />
                            <div className="flex-1">
                              <div className="font-semibold text-sm">
                                {user.username}
                              </div>
                              <div className="text-xs text-gray-500">
                                {user.ingameName}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center text-gray-400 py-4">
                        Chưa có thành viên
                      </div>
                    )}
                  </div>
                </div>

                {/* Team B */}
                <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-blue-700">🔵 ĐỘI XANH</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-blue-700">
                        {team2Score}
                      </span>
                      {canManage && (
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => updateScore("team2", 1)}
                            disabled={team2Score >= (custom?.bestOf || 10)}
                            className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded text-xs font-bold"
                          >
                            +
                          </button>
                          <button
                            onClick={() => updateScore("team2", -1)}
                            disabled={team2Score <= 0}
                            className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded text-xs font-bold"
                          >
                            −
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {teamB.length > 0 ? (
                      teamB.map((member: any) => {
                        const user = member.user || member;
                        return (
                          <div
                            key={user._id}
                            className="flex items-center gap-2 bg-white p-2 rounded"
                          >
                            <img
                              src={
                                user.avatarUrl || "https://placehold.co/40x40"
                              }
                              alt=""
                              className="w-8 h-8 rounded-full"
                            />
                            <div className="flex-1">
                              <div className="font-semibold text-sm">
                                {user.username}
                              </div>
                              <div className="text-xs text-gray-500">
                                {user.ingameName}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center text-gray-400 py-4">
                        Chưa có thành viên
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats & Chart */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                📊 Thống kê trận đấu
              </h2>
              <div className="mb-4 text-center">
                <span className="inline-block px-4 py-2 bg-linear-to-r from-red-100 to-blue-100 rounded-lg border-2 border-gray-300">
                  <span className="text-sm text-gray-600">Thi đấu </span>
                  <span className="text-lg font-bold text-gray-900">
                    Best of {custom?.bestOf || 3}
                  </span>
                  <span className="text-sm text-gray-600">
                    {" "}
                    (Thắng {Math.ceil((custom?.bestOf || 3) / 2)} trận)
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center mb-6">
                <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
                  <div className="text-4xl font-bold text-red-600">
                    {team1Score}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Điểm Đội Đỏ</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center">
                  <div className="text-3xl font-bold text-gray-800">VS</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                  <div className="text-4xl font-bold text-blue-600">
                    {team2Score}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Điểm Đội Xanh
                  </div>
                </div>
              </div>

              {/* Score progress bar */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-600 w-12">0</span>
                  <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden flex">
                    <div
                      className="bg-red-500 transition-all duration-500"
                      style={{
                        width: `${(team1Score / (custom?.bestOf || 3)) * 100}%`,
                      }}
                    />
                    <div
                      className="bg-blue-500 transition-all duration-500"
                      style={{
                        width: `${(team2Score / (custom?.bestOf || 3)) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 w-12 text-right">
                    {custom?.bestOf || 3}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-gray-600">Thành viên Đội Đỏ</div>
                  <div className="text-xl font-bold text-red-600">
                    {teamA.length}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-gray-600">Thành viên Đội Xanh</div>
                  <div className="text-xl font-bold text-blue-600">
                    {teamB.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Video/Livestream */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                📺 Video / Livestream
              </h2>
              <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <div className="text-4xl mb-2">🎥</div>
                  <div>Stream sẽ bắt đầu khi trận đấu diễn ra</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Chat & Registrations */}
          <div className="space-y-6">
            {/* Register Button / Form */}
            {user && custom.status === "open" && !hasRegistered && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                {!showRegForm ? (
                  <button
                    onClick={() => setShowRegForm(true)}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition shadow-lg hover:shadow-xl"
                  >
                    🎮 Đăng ký tham gia
                  </button>
                ) : (
                  <form onSubmit={register} className="space-y-4">
                    <div>
                      <label className="block mb-1 text-gray-700 font-medium">
                        Tên trong game
                      </label>
                      <input
                        className="w-full p-3 bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                        value={regForm.ingameName}
                        onChange={(e) =>
                          setRegForm({ ...regForm, ingameName: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-gray-700 font-medium">
                        Vị Trí
                      </label>
                      <div className="grid grid-cols-5 gap-2">
                        {laneOptions.map((l) => (
                          <button
                            key={l.key}
                            type="button"
                            onClick={() =>
                              setRegForm({ ...regForm, lane: l.key })
                            }
                            className={`px-2 py-2 rounded-lg border-2 text-sm ${
                              regForm.lane === l.key
                                ? "border-red-500 bg-red-50 text-red-700"
                                : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                            }`}
                          >
                            <span className="block text-lg">{l.icon}</span>
                            <span>{l.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block mb-1 text-gray-700 font-medium">
                        Hạng
                      </label>
                      <div className="relative">
                        <select
                          className="w-full p-3 bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 appearance-none"
                          value={regForm.rank}
                          onChange={(e) =>
                            setRegForm({ ...regForm, rank: e.target.value })
                          }
                        >
                          <option value="">— Chọn hạng —</option>
                          {rankOptions.map((r) => (
                            <option key={r.key} value={r.key}>
                              {r.icon} {r.label}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                          ▾
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition"
                      >
                        Lưu đăng ký
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRegForm(false)}
                        className="px-4 py-3 rounded-lg bg-gray-100 hover:bg-gray-200"
                      >
                        Hủy
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {hasRegistered && (
              <div className="bg-green-50 rounded-xl shadow-lg p-6 border-2 border-green-200">
                <div className="text-center text-green-700 font-semibold">
                  ✅ Bạn đã đăng ký!
                </div>
              </div>
            )}

            {/* Chat Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                💬 Thảo luận
              </h2>
              <div
                id="chat-messages"
                className="h-64 bg-gray-50 rounded-lg p-3 overflow-y-auto mb-3 space-y-2"
              >
                {chatMessages.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm mt-8">
                    Chưa có tin nhắn nào. Hãy là người đầu tiên!
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg._id}
                      className={`flex gap-2 ${
                        msg.user._id === user?.id ? "flex-row-reverse" : ""
                      }`}
                    >
                      <img
                        src={msg.user.avatarUrl || "https://placehold.co/32x32"}
                        alt={msg.user.username}
                        className="w-8 h-8 rounded-full shrink-0"
                      />
                      <div
                        className={`flex-1 ${
                          msg.user._id === user?.id ? "text-right" : ""
                        }`}
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-semibold text-gray-700">
                            {msg.user.username}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(msg.createdAt).toLocaleTimeString(
                              "vi-VN",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        </div>
                        <div
                          className={`inline-block mt-1 px-3 py-2 rounded-lg text-sm ${
                            msg.user._id === user?.id
                              ? "bg-red-600 text-white"
                              : "bg-white border border-gray-300 text-gray-800"
                          }`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {user ? (
                <form onSubmit={sendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    disabled={chatLoading}
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 disabled:bg-gray-100"
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white rounded-lg font-semibold transition"
                  >
                    Gửi
                  </button>
                </form>
              ) : (
                <div className="text-center text-gray-500 text-sm">
                  Đăng nhập để tham gia thảo luận
                </div>
              )}
            </div>

            {/* Registered Members Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  👥 Danh sách đăng ký
                </h2>
                {user && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    disabled={teamA.length + teamB.length >= 10}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-sm shadow-md transition"
                    title={
                      teamA.length + teamB.length >= 10
                        ? "Phòng đã đủ 10 người"
                        : "Mời thành viên"
                    }
                  >
                    ✉️ Mời thành viên
                  </button>
                )}
              </div>

              {/* Pending Invites (Admin Only) */}
              {canManage && pendingInvites.length > 0 && (
                <div className="mb-4 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                  <h3 className="text-sm font-bold text-yellow-800 mb-3">
                    ⏳ Lời mời chờ duyệt ({pendingInvites.length})
                  </h3>
                  <div className="space-y-2">
                    {pendingInvites.map((invite) => (
                      <div
                        key={invite._id}
                        className="flex items-center gap-3 p-3 bg-white rounded-lg border border-yellow-300"
                      >
                        <img
                          src={
                            invite.user?.avatarUrl ||
                            "https://placehold.co/40x40"
                          }
                          alt={invite.user?.username}
                          className="w-10 h-10 rounded-full"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 text-sm">
                            {invite.user?.username}
                          </div>
                          <div className="text-xs text-gray-500">
                            Được mời bởi {invite.invitedBy?.username}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => approveInvite(invite._id)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-semibold"
                          >
                            ✓ Chấp nhận
                          </button>
                          <button
                            onClick={() => rejectInvite(invite._id)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold"
                          >
                            ✕ Từ chối
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {teamA.length === 0 && teamB.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-gray-200">
                  <div className="text-4xl mb-2">📭</div>
                  <p className="text-gray-500 font-medium">
                    Chưa có thành viên nào đăng ký
                  </p>
                </div>
              ) : teamA.length + teamB.length >= 10 ? (
                <div className="space-y-4">
                  <div className="text-center py-6 bg-yellow-50 rounded-lg border-2 border-yellow-300">
                    <div className="text-4xl mb-2">✅</div>
                    <p className="text-yellow-700 font-bold text-lg">
                      Đã đủ 10 người!
                    </p>
                    <p className="text-yellow-600 text-sm mt-1">Phòng đã đầy</p>
                  </div>

                  {/* Show member list even when full */}
                  <div className="max-h-96 overflow-y-auto space-y-3">
                    {[...teamA, ...teamB].map((member: any, index) => {
                      const memberUser = member.user || member;
                      const teamLabel =
                        index < teamA.length ? "🔴 Đội Đỏ" : "🔵 Đội Xanh";
                      function removeMemberFromRoom(_id: any): void {
                        throw new Error("Function not implemented.");
                      }

                      return (
                        <div
                          key={memberUser._id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
                        >
                          <img
                            src={
                              memberUser.avatarUrl ||
                              "https://placehold.co/40x40"
                            }
                            alt={memberUser.username}
                            className="w-10 h-10 rounded-full border-2 border-gray-300"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900">
                              {memberUser.username}
                            </div>
                            <div className="text-xs text-gray-500">
                              {memberUser.ingameName}
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold border border-gray-300 whitespace-nowrap">
                            {teamLabel}
                          </span>
                          {canManage && memberUser._id !== user?.id && (
                            <button
                              onClick={() =>
                                removeMemberFromRoom(memberUser._id)
                              }
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Xóa khỏi phòng"
                            >
                              ✖️
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <span className="text-sm font-semibold text-blue-700">
                      Đã có {teamA.length + teamB.length}/10 người
                    </span>
                    <span className="text-xs text-blue-600">
                      Còn {10 - (teamA.length + teamB.length)} chỗ trống
                    </span>
                  </div>

                  <div className="max-h-96 overflow-y-auto space-y-3">
                    {[...teamA, ...teamB].map((member: any, index) => {
                      const memberUser = member.user || member;
                      const teamLabel =
                        index < teamA.length ? "🔴 Đội Đỏ" : "🔵 Đội Xanh";
                      function removeMemberFromRoom(_id: any): void {
                        throw new Error("Function not implemented.");
                      }

                      return (
                        <div
                          key={memberUser._id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
                        >
                          <img
                            src={
                              memberUser.avatarUrl ||
                              "https://placehold.co/40x40"
                            }
                            alt={memberUser.username}
                            className="w-10 h-10 rounded-full border-2 border-gray-300"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900">
                              {memberUser.username}
                            </div>
                            <div className="text-xs text-gray-500">
                              {memberUser.ingameName}
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold border border-gray-300 whitespace-nowrap">
                            {teamLabel}
                          </span>
                          {canManage && memberUser._id !== user?.id && (
                            <button
                              onClick={() =>
                                removeMemberFromRoom(memberUser._id)
                              }
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Xóa khỏi phòng"
                            >
                              ✖️
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-xl max-w-md w-full flex flex-col"
            style={{ maxHeight: "85vh" }}
          >
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                ✉️ Mời thành viên
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Chọn thành viên để gửi lời mời tham gia phòng
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {allMembers
                .filter((m) => {
                  // Filter out members already in room
                  const allPlayers = [
                    ...(custom?.team1 || []),
                    ...(custom?.team2 || []),
                    ...(custom?.players || []),
                  ];
                  return !allPlayers.some((p: any) => (p._id || p) === m._id);
                })
                .map((member) => (
                  <button
                    key={member._id}
                    onClick={() => setSelectedInvite(member._id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition ${
                      selectedInvite === member._id
                        ? "bg-blue-50 border-blue-500"
                        : "bg-gray-50 border-gray-200 hover:border-gray-300"
                    }`}
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
                    {selectedInvite === member._id && (
                      <span className="text-blue-600 font-bold">✓</span>
                    )}
                  </button>
                ))}
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-2">
              <button
                onClick={sendInvite}
                disabled={!selectedInvite}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition"
              >
                Gửi lời mời
              </button>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setSelectedInvite(null);
                }}
                className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmOpen}
        title="Xóa Custom"
        message="Bạn có chắc muốn xóa Custom này? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
        onConfirm={deleteCustom}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
