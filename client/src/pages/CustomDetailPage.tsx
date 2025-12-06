import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { http } from "../utils/http";
import { useAuth } from "../context/AuthContext";
import BackButton from "../components/BackButton";
import ConfirmModal from "../components/ConfirmModal";
import { toast } from "react-toastify";
import { createSocket } from "../utils/socket";
import { Socket } from "socket.io-client";

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
  // Tournament fields
  isTournamentRoom?: boolean;
  tournament?: {
    _id: string;
    name: string;
    status: string;
    currentRound: number;
  };
  tournamentTeam1?: {
    _id: string;
    name: string;
    tag?: string;
    logoUrl?: string;
    members?: any[];
  };
  tournamentTeam2?: {
    _id: string;
    name: string;
    tag?: string;
    logoUrl?: string;
    members?: any[];
  };
  tournamentRound?: number;
  winningTeam?: {
    _id: string;
    name: string;
    tag?: string;
    logoUrl?: string;
  };
  // Simple tournament room fields (no Team model)
  tournamentName?: string;
  winningTeamName?: string; // "team1" or "team2"
  newsReference?: string;
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
  const [selectedInvites, setSelectedInvites] = useState<string[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [showTeamEditModal, setShowTeamEditModal] = useState(false);
  const [editTeam1, setEditTeam1] = useState<any[]>([]);
  const [editTeam2, setEditTeam2] = useState<any[]>([]);
  // Tournament finish states
  const [showFinishTournamentModal, setShowFinishTournamentModal] =
    useState(false);
  const [selectedWinningTeam, setSelectedWinningTeam] = useState<string | null>(
    null
  );
  const [finishingMatch, setFinishingMatch] = useState(false);
  // Result modal state - shows when room is closed with a winner
  const [showResultModal, setShowResultModal] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const gameModeOptions = [
    { value: "5vs5", label: "5vs5 - Summoner's Rift" },
    { value: "aram", label: "ARAM - Howling Abyss" },
    { value: "draft", label: "Giải đấu cấm chọn" },
    { value: "minigame", label: "Minigame" },
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

  const removeMemberFromRoom = async (memberId: string) => {
    if (!id) return;
    try {
      await http.delete(`/customs/${id}/members/${memberId}`);
      toast.success("Đã xóa thành viên khỏi phòng");
      // Reload custom data
      const res = await http.get(`/customs/${id}`);
      setCustom(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi xóa thành viên");
    }
  };

  // Team editing functions
  const openTeamEditModal = () => {
    if (!custom) return;
    setEditTeam1([...(custom.team1 || [])]);
    setEditTeam2([...(custom.team2 || [])]);
    setShowTeamEditModal(true);
  };

  const moveToTeam2 = (member: any) => {
    if (editTeam2.length >= 5) {
      toast.error("Đội Xanh đã đầy (5/5)");
      return;
    }
    const memberId = member._id || member;
    setEditTeam1((prev) =>
      prev.filter((m) => (m.user?._id || m._id) !== memberId)
    );
    setEditTeam2((prev) => [...prev, { user: member }]);
  };

  const moveToTeam1 = (member: any) => {
    if (editTeam1.length >= 5) {
      toast.error("Đội Đỏ đã đầy (5/5)");
      return;
    }
    const memberId = member._id || member;
    setEditTeam2((prev) =>
      prev.filter((m) => (m.user?._id || m._id) !== memberId)
    );
    setEditTeam1((prev) => [...prev, { user: member }]);
  };

  const saveTeamChanges = async () => {
    if (!id) return;
    try {
      const team1Ids = editTeam1.map((m) => m.user?._id || m._id);
      const team2Ids = editTeam2.map((m) => m.user?._id || m._id);

      await http.put(`/customs/${id}/teams`, {
        team1: team1Ids,
        team2: team2Ids,
      });

      toast.success("Đã cập nhật đội hình!");
      setShowTeamEditModal(false);

      // Reload custom data
      const res = await http.get(`/customs/${id}`);
      setCustom(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi cập nhật đội hình");
    }
  };

  // Finish tournament match - lưu team thắng (có Team model)
  const finishTournamentMatch = async () => {
    if (!id || !selectedWinningTeam || !custom?.isTournamentRoom) return;

    setFinishingMatch(true);
    try {
      const res = await http.post(`/customs/${id}/finish-tournament-match`, {
        winningTeamId: selectedWinningTeam,
      });

      toast.success("Đã kết thúc trận đấu và lưu kết quả!");
      setShowFinishTournamentModal(false);
      setSelectedWinningTeam(null);

      // Cập nhật custom data
      if (res.data.customRoom) {
        setCustom(res.data.customRoom);
      } else {
        const refreshRes = await http.get(`/customs/${id}`);
        setCustom(refreshRes.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi kết thúc trận đấu");
    } finally {
      setFinishingMatch(false);
    }
  };

  // Finish simple tournament match - không có Team model
  const finishSimpleTournamentMatch = async () => {
    if (!id || !selectedWinningTeam || !custom?.isTournamentRoom) return;

    setFinishingMatch(true);
    try {
      const res = await http.post(`/customs/${id}/finish-simple-tournament`, {
        winningTeamName: selectedWinningTeam, // "team1" or "team2"
        team1Score,
        team2Score,
      });

      toast.success("Đã kết thúc trận đấu và lưu kết quả!");
      setShowFinishTournamentModal(false);
      setSelectedWinningTeam(null);

      // Cập nhật custom data
      if (res.data.customRoom) {
        setCustom(res.data.customRoom);
      } else {
        const refreshRes = await http.get(`/customs/${id}`);
        setCustom(refreshRes.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi kết thúc trận đấu");
    } finally {
      setFinishingMatch(false);
    }
  };

  // Kiểm tra xem có thể kết thúc trận đấu không
  const canFinishTournamentMatch = () => {
    if (!custom?.isTournamentRoom) return false;
    if (custom?.winningTeam || custom?.winningTeamName) return false; // Đã có team thắng rồi
    if (custom?.status === "closed") return false;
    // Cho phép kết thúc bất cứ lúc nào (admin chọn team thắng)
    return true;
  };

  // Xác định team thắng dựa trên điểm
  const getLeadingTeam = () => {
    if (team1Score > team2Score) return custom?.tournamentTeam1;
    if (team2Score > team1Score) return custom?.tournamentTeam2;
    return null;
  };

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
    if (selectedInvites.length === 0 || !id) return;

    // Tính số slot còn trống
    const currentPlayers =
      (custom?.team1?.length || 0) + (custom?.team2?.length || 0);
    const maxAllowed = (custom?.maxPlayers || 10) - currentPlayers;

    if (selectedInvites.length > maxAllowed) {
      toast.error(`Chỉ còn ${maxAllowed} chỗ trống trong phòng`);
      return;
    }

    try {
      // Gửi lời mời cho từng người được chọn
      let successCount = 0;
      let errorCount = 0;

      for (const userId of selectedInvites) {
        try {
          await http.post(`/customs/${id}/invite`, { userId });
          successCount++;
        } catch (err: any) {
          errorCount++;
          console.error(`Failed to invite ${userId}:`, err);
        }
      }

      if (successCount > 0) {
        toast.success(`Đã gửi ${successCount} lời mời!`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} lời mời thất bại`);
      }

      setShowInviteModal(false);
      setSelectedInvites([]);
      loadPendingInvites();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi gửi lời mời");
    }
  };

  const toggleInviteSelection = (memberId: string) => {
    const currentPlayers =
      (custom?.team1?.length || 0) + (custom?.team2?.length || 0);
    const maxAllowed =
      (custom?.maxPlayers || 10) - currentPlayers - pendingInvites.length;

    setSelectedInvites((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      } else {
        if (prev.length >= maxAllowed) {
          toast.error(`Chỉ có thể mời tối đa ${maxAllowed} người nữa`);
          return prev;
        }
        return [...prev, memberId];
      }
    });
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

  // Socket connection for realtime updates
  useEffect(() => {
    if (!id) return;

    const socket = createSocket();
    socketRef.current = socket;

    // Listen for room updates (invites approved, members added/removed)
    socket.on("custom:updated", (updatedRoom: any) => {
      if (updatedRoom._id === id) {
        setCustom(updatedRoom);
      }
    });

    // Listen for invite updates
    socket.on("invite:created", (data: any) => {
      if (data.roomId === id) {
        loadPendingInvites();
      }
    });

    return () => {
      socket.off("custom:updated");
      socket.off("invite:created");
      socket.disconnect();
    };
  }, [id]);

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

  // Auto show result modal when room is closed with winner
  useEffect(() => {
    if (
      custom?.status === "closed" &&
      custom?.isTournamentRoom &&
      (custom?.winningTeam || custom?.winningTeamName)
    ) {
      setShowResultModal(true);
    }
  }, [custom]);

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

    // Kiểm tra nếu đang đóng phòng tournament
    if (editForm.status === "closed" && custom?.isTournamentRoom) {
      // Nếu chưa có team thắng
      if (!custom?.winningTeam && !custom?.winningTeamName) {
        const bestOf = custom?.bestOf || 3;
        const winsNeeded = Math.ceil(bestOf / 2);

        // Tự động xác định team thắng dựa trên điểm
        if (team1Score >= winsNeeded || team2Score >= winsNeeded) {
          // Có team đạt đủ điểm thắng - tự động kết thúc trận
          if (custom?.tournamentTeam1 && custom?.tournamentTeam2) {
            // Tournament room với Team model
            const winningTeamId =
              team1Score > team2Score
                ? custom.tournamentTeam1._id
                : custom.tournamentTeam2._id;
            setSelectedWinningTeam(winningTeamId);
            setShowFinishTournamentModal(true);
            toast.info(
              "Vui lòng xác nhận team thắng trước khi đóng phòng giải đấu."
            );
            return;
          } else {
            // Simple tournament room
            const winningTeamName = team1Score > team2Score ? "team1" : "team2";
            setSelectedWinningTeam(winningTeamName);
            setShowFinishTournamentModal(true);
            toast.info(
              "Vui lòng xác nhận team thắng trước khi đóng phòng giải đấu."
            );
            return;
          }
        } else if (team1Score !== team2Score) {
          // Chưa đạt đủ điểm nhưng có team dẫn trước
          if (custom?.tournamentTeam1 && custom?.tournamentTeam2) {
            const winningTeamId =
              team1Score > team2Score
                ? custom.tournamentTeam1._id
                : custom.tournamentTeam2._id;
            setSelectedWinningTeam(winningTeamId);
          } else {
            const winningTeamName = team1Score > team2Score ? "team1" : "team2";
            setSelectedWinningTeam(winningTeamName);
          }
          setShowFinishTournamentModal(true);
          toast.info(
            "Vui lòng xác nhận team thắng trước khi đóng phòng giải đấu."
          );
          return;
        } else {
          // Điểm hòa - bắt buộc chọn thủ công
          setShowFinishTournamentModal(true);
          toast.warning(
            "Điểm số hòa nhau. Vui lòng chọn team thắng trước khi đóng phòng."
          );
          return;
        }
      }
    }

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
        <div
          className={`bg-white rounded-xl shadow-lg p-6 mb-6 border-l-4 ${
            custom.isTournamentRoom ? "border-yellow-500" : "border-red-600"
          }`}
        >
          {/* Tournament Badge */}
          {custom.isTournamentRoom && custom.tournament && (
            <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-trophy text-yellow-500 text-lg"></i>
                  <div>
                    <span className="font-semibold text-yellow-800">
                      {custom.tournament.name}
                    </span>
                    <span className="ml-2 px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded text-xs">
                      Vòng{" "}
                      {custom.tournamentRound || custom.tournament.currentRound}
                    </span>
                  </div>
                </div>
                {custom.winningTeam && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-lg border border-green-300">
                    <i className="fa-solid fa-crown text-yellow-500"></i>
                    <span className="font-semibold text-green-700">
                      Team thắng:{" "}
                      {custom.winningTeam.tag || custom.winningTeam.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Tournament Teams Info */}
              {custom.tournamentTeam1 && custom.tournamentTeam2 && (
                <div className="flex items-center justify-center gap-4 mt-3 p-2 bg-white rounded border">
                  <div className="flex items-center gap-2">
                    {custom.tournamentTeam1.logoUrl && (
                      <img
                        src={custom.tournamentTeam1.logoUrl}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <span
                      className={`font-semibold ${
                        custom.winningTeam?._id === custom.tournamentTeam1._id
                          ? "text-green-600"
                          : "text-gray-700"
                      }`}
                    >
                      {custom.tournamentTeam1.tag ||
                        custom.tournamentTeam1.name}
                    </span>
                    {custom.winningTeam?._id === custom.tournamentTeam1._id && (
                      <i className="fa-solid fa-crown text-yellow-500"></i>
                    )}
                  </div>
                  <span className="font-bold text-gray-400">VS</span>
                  <div className="flex items-center gap-2">
                    {custom.winningTeam?._id === custom.tournamentTeam2._id && (
                      <i className="fa-solid fa-crown text-yellow-500"></i>
                    )}
                    <span
                      className={`font-semibold ${
                        custom.winningTeam?._id === custom.tournamentTeam2._id
                          ? "text-green-600"
                          : "text-gray-700"
                      }`}
                    >
                      {custom.tournamentTeam2.tag ||
                        custom.tournamentTeam2.name}
                    </span>
                    {custom.tournamentTeam2.logoUrl && (
                      <img
                        src={custom.tournamentTeam2.logoUrl}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {!isEditing ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-3xl font-bold text-red-600 mb-2">
                    {custom.title}
                  </h1>
                  <p className="text-gray-600 mb-4">{custom.description}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {/* View Result Button - for everyone when room is closed with winner */}
                  {custom.isTournamentRoom &&
                    (custom.winningTeam || custom.winningTeamName) &&
                    custom.status === "closed" && (
                      <button
                        onClick={() => setShowResultModal(true)}
                        className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold flex items-center gap-1"
                      >
                        <i className="fa-solid fa-trophy"></i>
                        Xem kết quả
                      </button>
                    )}

                  {canManage && (
                    <>
                      {/* Finish Tournament Match Button */}
                      {custom.isTournamentRoom &&
                        !custom.winningTeam &&
                        !custom.winningTeamName &&
                        canFinishTournamentMatch() && (
                          <button
                            onClick={() => {
                              // Auto-select winning team based on score for Team model mode
                              if (
                                custom.tournamentTeam1 &&
                                custom.tournamentTeam2
                              ) {
                                const leadingTeam = getLeadingTeam();
                                if (leadingTeam) {
                                  setSelectedWinningTeam(leadingTeam._id);
                                }
                              } else {
                                // Simple mode: auto-select based on score
                                if (team1Score > team2Score) {
                                  setSelectedWinningTeam("team1");
                                } else if (team2Score > team1Score) {
                                  setSelectedWinningTeam("team2");
                                }
                              }
                              setShowFinishTournamentModal(true);
                            }}
                            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center gap-1"
                          >
                            <i className="fa-solid fa-flag-checkered"></i>
                            Kết thúc trận
                          </button>
                        )}
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
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="px-3 py-1 bg-gray-100 rounded-full inline-flex items-center gap-1">
                  <i className="fa-solid fa-calendar"></i>{" "}
                  {new Date(custom.scheduleTime).toLocaleString("vi-VN")}
                </span>
                <span className="px-3 py-1 bg-gray-100 rounded-full inline-flex items-center gap-1">
                  <i className="fa-solid fa-users"></i>{" "}
                  {teamA.length + teamB.length}/{custom.maxPlayers} players
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
                  {gameModeOptions.find((m) => m.value === custom.gameMode)
                    ?.label || "5vs5"}
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
                  {custom.status === "open" ? (
                    <>
                      <i className="fa-solid fa-circle text-green-500"></i> Mở
                    </>
                  ) : custom.status === "ongoing" ? (
                    <>
                      <i className="fa-solid fa-circle text-blue-500"></i> Đang
                      chơi
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-circle text-gray-500"></i> Đóng
                    </>
                  )}
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800 inline-flex items-center gap-2">
                  <i className="fa-solid fa-shield-halved"></i> Đội hình thi đấu
                </h2>
                {canManage && (teamA.length > 0 || teamB.length > 0) && (
                  <button
                    onClick={openTeamEditModal}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold inline-flex items-center gap-1"
                  >
                    <i className="fa-solid fa-pen"></i> Chỉnh sửa đội
                  </button>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Team A */}
                <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-red-700 inline-flex items-center gap-1">
                      <i className="fa-solid fa-circle text-red-500"></i> ĐỘI ĐỎ
                      ({teamA.length}/5)
                    </h3>
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
                        const memberUser = member.user || member;
                        return (
                          <div
                            key={memberUser._id}
                            className="flex items-center gap-2 bg-white p-2 rounded"
                          >
                            <img
                              src={
                                memberUser.avatarUrl ||
                                "https://placehold.co/40x40"
                              }
                              alt=""
                              className="w-8 h-8 rounded-full"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm truncate">
                                {memberUser.username}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {memberUser.ingameName}
                              </div>
                            </div>
                            {canManage && (
                              <button
                                onClick={() =>
                                  removeMemberFromRoom(memberUser._id)
                                }
                                className="p-1 text-red-500 hover:bg-red-100 rounded"
                                title="Xóa khỏi phòng"
                              >
                                <i className="fa-solid fa-xmark"></i>
                              </button>
                            )}
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
                    <h3 className="font-bold text-blue-700 inline-flex items-center gap-1">
                      <i className="fa-solid fa-circle text-blue-500"></i> ĐỘI
                      XANH ({teamB.length}/5)
                    </h3>
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
                        const memberUser = member.user || member;
                        return (
                          <div
                            key={memberUser._id}
                            className="flex items-center gap-2 bg-white p-2 rounded"
                          >
                            <img
                              src={
                                memberUser.avatarUrl ||
                                "https://placehold.co/40x40"
                              }
                              alt=""
                              className="w-8 h-8 rounded-full"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm truncate">
                                {memberUser.username}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {memberUser.ingameName}
                              </div>
                            </div>
                            {canManage && (
                              <button
                                onClick={() =>
                                  removeMemberFromRoom(memberUser._id)
                                }
                                className="p-1 text-red-500 hover:bg-red-100 rounded"
                                title="Xóa khỏi phòng"
                              >
                                <i className="fa-solid fa-xmark"></i>
                              </button>
                            )}
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
              <h2 className="text-2xl font-bold text-gray-800 mb-4 inline-flex items-center gap-2">
                <i className="fa-solid fa-chart-bar"></i> Thống kê trận đấu
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
              <h2 className="text-2xl font-bold text-gray-800 mb-4 inline-flex items-center gap-2">
                <i className="fa-solid fa-tv"></i> Video / Livestream
              </h2>
              <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <div className="text-4xl mb-2">
                    <i className="fa-solid fa-video"></i>
                  </div>
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
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition shadow-lg hover:shadow-xl inline-flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-gamepad"></i> Đăng ký tham gia
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
                <div className="text-center text-green-700 font-semibold inline-flex items-center justify-center gap-2">
                  <i className="fa-solid fa-circle-check"></i> Bạn đã đăng ký!
                </div>
              </div>
            )}

            {/* Chat Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 inline-flex items-center gap-2">
                <i className="fa-solid fa-comments"></i> Thảo luận
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
                <h2 className="text-xl font-bold text-gray-800 inline-flex items-center gap-2">
                  <i className="fa-solid fa-users"></i> Danh sách đăng ký
                </h2>
                {user && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    disabled={teamA.length + teamB.length >= 10}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-sm shadow-md transition inline-flex items-center gap-1"
                    title={
                      teamA.length + teamB.length >= 10
                        ? "Phòng đã đủ 10 người"
                        : "Mời thành viên"
                    }
                  >
                    <i className="fa-solid fa-envelope"></i> Mời thành viên
                  </button>
                )}
              </div>

              {/* Pending Invites (Admin Only) */}
              {canManage && pendingInvites.length > 0 && (
                <div className="mb-4 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                  <h3 className="text-sm font-bold text-yellow-800 mb-3 inline-flex items-center gap-1">
                    <i className="fa-solid fa-hourglass-half"></i> Lời mời chờ
                    duyệt ({pendingInvites.length})
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
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-semibold inline-flex items-center gap-1"
                          >
                            <i className="fa-solid fa-check"></i> Chấp nhận
                          </button>
                          <button
                            onClick={() => rejectInvite(invite._id)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold inline-flex items-center gap-1"
                          >
                            <i className="fa-solid fa-xmark"></i> Từ chối
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {teamA.length === 0 && teamB.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-gray-200">
                  <div className="text-4xl mb-2">
                    <i className="fa-solid fa-inbox"></i>
                  </div>
                  <p className="text-gray-500 font-medium">
                    Chưa có thành viên nào đăng ký
                  </p>
                </div>
              ) : teamA.length + teamB.length >= 10 ? (
                <div className="space-y-4">
                  <div className="text-center py-6 bg-yellow-50 rounded-lg border-2 border-yellow-300">
                    <div className="text-4xl mb-2">
                      <i className="fa-solid fa-circle-check text-green-500"></i>
                    </div>
                    <p className="text-yellow-700 font-bold text-lg">
                      Đã đủ 10 người!
                    </p>
                    <p className="text-yellow-600 text-sm mt-1">Phòng đã đầy</p>
                  </div>

                  {/* Show member list even when full */}
                  <div className="max-h-96 overflow-y-auto space-y-3">
                    {[...teamA, ...teamB].map((member: any, index) => {
                      const memberUser = member.user || member;
                      const isTeam1 = index < teamA.length;

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
                          <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold border border-gray-300 whitespace-nowrap inline-flex items-center gap-1">
                            <i
                              className={`fa-solid fa-circle ${
                                isTeam1 ? "text-red-500" : "text-blue-500"
                              }`}
                            ></i>{" "}
                            {isTeam1 ? "Đội Đỏ" : "Đội Xanh"}
                          </span>
                          {canManage && memberUser._id !== user?.id && (
                            <button
                              onClick={() =>
                                removeMemberFromRoom(memberUser._id)
                              }
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Xóa khỏi phòng"
                            >
                              <i className="fa-solid fa-xmark"></i>
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
                      const isTeam1 = index < teamA.length;

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
                          <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold border border-gray-300 whitespace-nowrap inline-flex items-center gap-1">
                            <i
                              className={`fa-solid fa-circle ${
                                isTeam1 ? "text-red-500" : "text-blue-500"
                              }`}
                            ></i>{" "}
                            {isTeam1 ? "Đội Đỏ" : "Đội Xanh"}
                          </span>
                          {canManage && memberUser._id !== user?.id && (
                            <button
                              onClick={() =>
                                removeMemberFromRoom(memberUser._id)
                              }
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Xóa khỏi phòng"
                            >
                              <i className="fa-solid fa-xmark"></i>
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
              <h3 className="text-xl font-bold text-gray-900 inline-flex items-center gap-2">
                <i className="fa-solid fa-envelope"></i> Mời thành viên
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Chọn thành viên để gửi lời mời tham gia phòng (có thể chọn
                nhiều)
              </p>
              <div className="mt-2 text-sm">
                <span className="text-blue-600 font-semibold">
                  Đã chọn: {selectedInvites.length}
                </span>
                <span className="text-gray-500 ml-2">
                  / Còn trống:{" "}
                  {(custom?.maxPlayers || 10) -
                    (custom?.team1?.length || 0) -
                    (custom?.team2?.length || 0) -
                    pendingInvites.length}{" "}
                  chỗ
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {(() => {
                // Lọc ra những thành viên chưa ở trong phòng và chưa được mời
                const allPlayersIds = [
                  ...(custom?.team1 || []).map((p: any) => p._id || p),
                  ...(custom?.team2 || []).map((p: any) => p._id || p),
                  ...(custom?.players || []).map((p: any) => p._id || p),
                ];
                const pendingInviteUserIds = pendingInvites.map(
                  (inv: any) => inv.user?._id
                );

                const availableMembers = allMembers.filter((m) => {
                  // Loại bỏ những người đã trong phòng
                  if (allPlayersIds.includes(m._id)) return false;
                  // Loại bỏ những người đã được mời (pending)
                  if (pendingInviteUserIds.includes(m._id)) return false;
                  return true;
                });

                if (availableMembers.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">
                        <i className="fa-solid fa-inbox"></i>
                      </div>
                      <p>Không còn thành viên nào để mời</p>
                    </div>
                  );
                }

                return availableMembers.map((member) => (
                  <button
                    key={member._id}
                    onClick={() => toggleInviteSelection(member._id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition ${
                      selectedInvites.includes(member._id)
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
                    {selectedInvites.includes(member._id) && (
                      <span className="text-blue-600 font-bold text-xl">
                        <i className="fa-solid fa-check"></i>
                      </span>
                    )}
                  </button>
                ));
              })()}
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-2">
              <button
                onClick={sendInvite}
                disabled={selectedInvites.length === 0}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition"
              >
                Gửi lời mời ({selectedInvites.length})
              </button>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setSelectedInvites([]);
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

      {/* Team Edit Modal */}
      {showTeamEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-xl max-w-2xl w-full flex flex-col"
            style={{ maxHeight: "85vh" }}
          >
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 inline-flex items-center gap-2">
                <i className="fa-solid fa-pen-to-square"></i> Chỉnh sửa đội hình
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Kéo thả hoặc click để chuyển thành viên giữa 2 đội
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Edit Team 1 */}
                <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
                  <h4 className="font-bold text-red-700 mb-3 inline-flex items-center gap-1">
                    <i className="fa-solid fa-circle text-red-500"></i> ĐỘI ĐỎ (
                    {editTeam1.length}/5)
                  </h4>
                  <div className="space-y-2 min-h-[200px]">
                    {editTeam1.map((member: any) => {
                      const memberUser = member.user || member;
                      return (
                        <div
                          key={memberUser._id}
                          className="flex items-center gap-2 bg-white p-2 rounded border border-red-200"
                        >
                          <img
                            src={
                              memberUser.avatarUrl ||
                              "https://placehold.co/32x32"
                            }
                            alt=""
                            className="w-8 h-8 rounded-full"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate">
                              {memberUser.username}
                            </div>
                          </div>
                          <button
                            onClick={() => moveToTeam2(memberUser)}
                            disabled={editTeam2.length >= 5}
                            className="px-2 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded text-xs font-semibold"
                            title="Chuyển sang Đội Xanh"
                          >
                            → Xanh
                          </button>
                        </div>
                      );
                    })}
                    {editTeam1.length === 0 && (
                      <div className="text-center text-gray-400 py-4">
                        Trống
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit Team 2 */}
                <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                  <h4 className="font-bold text-blue-700 mb-3 inline-flex items-center gap-1">
                    <i className="fa-solid fa-circle text-blue-500"></i> ĐỘI
                    XANH ({editTeam2.length}/5)
                  </h4>
                  <div className="space-y-2 min-h-[200px]">
                    {editTeam2.map((member: any) => {
                      const memberUser = member.user || member;
                      return (
                        <div
                          key={memberUser._id}
                          className="flex items-center gap-2 bg-white p-2 rounded border border-blue-200"
                        >
                          <button
                            onClick={() => moveToTeam1(memberUser)}
                            disabled={editTeam1.length >= 5}
                            className="px-2 py-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white rounded text-xs font-semibold"
                            title="Chuyển sang Đội Đỏ"
                          >
                            Đỏ ←
                          </button>
                          <img
                            src={
                              memberUser.avatarUrl ||
                              "https://placehold.co/32x32"
                            }
                            alt=""
                            className="w-8 h-8 rounded-full"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate">
                              {memberUser.username}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {editTeam2.length === 0 && (
                      <div className="text-center text-gray-400 py-4">
                        Trống
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-2">
              <button
                onClick={saveTeamChanges}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition inline-flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-floppy-disk"></i> Lưu thay đổi
              </button>
              <button
                onClick={() => setShowTeamEditModal(false)}
                className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finish Tournament Match Modal - With Team Model */}
      {showFinishTournamentModal &&
        custom?.isTournamentRoom &&
        custom?.tournamentTeam1 &&
        custom?.tournamentTeam2 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 inline-flex items-center gap-2">
                  <i className="fa-solid fa-flag-checkered text-green-600"></i>{" "}
                  Kết thúc trận đấu
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Chọn đội thắng để kết thúc trận đấu giải đấu
                </p>
              </div>

              <div className="p-6">
                {/* Current Score Display */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                  <div className="text-center text-sm text-gray-600 mb-2">
                    Tỉ số hiện tại
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600">
                        {team1Score}
                      </div>
                      <div className="text-sm text-gray-600">
                        {custom.tournamentTeam1.tag ||
                          custom.tournamentTeam1.name}
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-gray-400">-</span>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {team2Score}
                      </div>
                      <div className="text-sm text-gray-600">
                        {custom.tournamentTeam2.tag ||
                          custom.tournamentTeam2.name}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team Selection */}
                <div className="space-y-3">
                  <p className="font-semibold text-gray-700">
                    Chọn đội chiến thắng:
                  </p>

                  {/* Team 1 Option */}
                  <button
                    onClick={() =>
                      setSelectedWinningTeam(custom.tournamentTeam1?._id || "")
                    }
                    className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition ${
                      selectedWinningTeam === custom.tournamentTeam1?._id
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {custom.tournamentTeam1?.logoUrl ? (
                      <img
                        src={custom.tournamentTeam1.logoUrl}
                        alt=""
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <i className="fa-solid fa-circle text-red-500 text-xl"></i>
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-gray-900">
                        {custom.tournamentTeam1.name}
                      </div>
                      {custom.tournamentTeam1.tag && (
                        <div className="text-sm text-gray-500">
                          [{custom.tournamentTeam1.tag}]
                        </div>
                      )}
                    </div>
                    {selectedWinningTeam === custom.tournamentTeam1._id && (
                      <i className="fa-solid fa-check-circle text-green-500 text-2xl"></i>
                    )}
                  </button>

                  {/* Team 2 Option */}
                  <button
                    onClick={() =>
                      setSelectedWinningTeam(custom.tournamentTeam2?._id || "")
                    }
                    className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition ${
                      selectedWinningTeam === custom.tournamentTeam2?._id
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {custom.tournamentTeam2?.logoUrl ? (
                      <img
                        src={custom.tournamentTeam2.logoUrl}
                        alt=""
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <i className="fa-solid fa-circle text-blue-500 text-xl"></i>
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-gray-900">
                        {custom.tournamentTeam2.name}
                      </div>
                      {custom.tournamentTeam2.tag && (
                        <div className="text-sm text-gray-500">
                          [{custom.tournamentTeam2.tag}]
                        </div>
                      )}
                    </div>
                    {selectedWinningTeam === custom.tournamentTeam2._id && (
                      <i className="fa-solid fa-check-circle text-green-500 text-2xl"></i>
                    )}
                  </button>
                </div>

                {/* Warning */}
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-start gap-2">
                    <i className="fa-solid fa-triangle-exclamation text-yellow-600 mt-0.5"></i>
                    <div className="text-sm text-yellow-800">
                      <strong>Lưu ý:</strong> Sau khi xác nhận, kết quả sẽ được
                      cập nhật vào giải đấu và không thể thay đổi.
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3">
                <button
                  onClick={finishTournamentMatch}
                  disabled={!selectedWinningTeam || finishingMatch}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition inline-flex items-center justify-center gap-2"
                >
                  {finishingMatch ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> Đang xử
                      lý...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check"></i> Xác nhận kết thúc
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowFinishTournamentModal(false);
                    setSelectedWinningTeam(null);
                  }}
                  disabled={finishingMatch}
                  className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-800 rounded-lg font-semibold transition"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Finish Tournament Match Modal - Simple Mode (No Team Model) */}
      {showFinishTournamentModal &&
        custom?.isTournamentRoom &&
        !custom?.tournamentTeam1 &&
        !custom?.tournamentTeam2 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 inline-flex items-center gap-2">
                  <i className="fa-solid fa-flag-checkered text-green-600"></i>{" "}
                  Kết thúc trận đấu
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Chọn đội thắng để kết thúc trận đấu
                </p>
              </div>

              <div className="p-6">
                {/* Current Score Display */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                  <div className="text-center text-sm text-gray-600 mb-2">
                    Tỉ số hiện tại
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600">
                        {team1Score}
                      </div>
                      <div className="text-sm text-gray-600">Team 1</div>
                    </div>
                    <span className="text-2xl font-bold text-gray-400">-</span>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {team2Score}
                      </div>
                      <div className="text-sm text-gray-600">Team 2</div>
                    </div>
                  </div>
                </div>

                {/* Team Selection */}
                <div className="space-y-3">
                  <p className="font-semibold text-gray-700">
                    Chọn đội chiến thắng:
                  </p>

                  {/* Team 1 Option */}
                  <button
                    onClick={() => setSelectedWinningTeam("team1")}
                    className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition ${
                      selectedWinningTeam === "team1"
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <i className="fa-solid fa-users text-red-500 text-xl"></i>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-gray-900">Team 1</div>
                      <div className="text-sm text-gray-500">
                        {custom.team1?.length || 0} thành viên
                      </div>
                    </div>
                    {selectedWinningTeam === "team1" && (
                      <i className="fa-solid fa-check-circle text-green-500 text-2xl"></i>
                    )}
                  </button>

                  {/* Team 2 Option */}
                  <button
                    onClick={() => setSelectedWinningTeam("team2")}
                    className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition ${
                      selectedWinningTeam === "team2"
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <i className="fa-solid fa-users text-blue-500 text-xl"></i>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-gray-900">Team 2</div>
                      <div className="text-sm text-gray-500">
                        {custom.team2?.length || 0} thành viên
                      </div>
                    </div>
                    {selectedWinningTeam === "team2" && (
                      <i className="fa-solid fa-check-circle text-green-500 text-2xl"></i>
                    )}
                  </button>
                </div>

                {/* Warning */}
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-start gap-2">
                    <i className="fa-solid fa-triangle-exclamation text-yellow-600 mt-0.5"></i>
                    <div className="text-sm text-yellow-800">
                      <strong>Lưu ý:</strong> Sau khi xác nhận, kết quả sẽ được
                      lưu và không thể thay đổi.
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3">
                <button
                  onClick={finishSimpleTournamentMatch}
                  disabled={!selectedWinningTeam || finishingMatch}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition inline-flex items-center justify-center gap-2"
                >
                  {finishingMatch ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> Đang xử
                      lý...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check"></i> Xác nhận kết thúc
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowFinishTournamentModal(false);
                    setSelectedWinningTeam(null);
                  }}
                  disabled={finishingMatch}
                  className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-800 rounded-lg font-semibold transition"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Result Modal - Shows when room is closed with winner */}
      {showResultModal &&
        custom?.isTournamentRoom &&
        custom?.winningTeam &&
        custom?.tournamentTeam1 &&
        custom?.tournamentTeam2 && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-scale-in">
              {/* Header with confetti effect */}
              <div className="bg-linear-to-r from-yellow-400 via-yellow-500 to-orange-500 p-6 text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-2 left-4 text-4xl">🎉</div>
                  <div className="absolute top-4 right-6 text-3xl">🏆</div>
                  <div className="absolute bottom-2 left-8 text-2xl">⭐</div>
                  <div className="absolute bottom-4 right-4 text-3xl">🎊</div>
                </div>
                <div className="relative">
                  <i className="fa-solid fa-trophy text-white text-5xl mb-3 drop-shadow-lg"></i>
                  <h3 className="text-2xl font-bold text-white drop-shadow">
                    Kết quả trận đấu
                  </h3>
                  {custom.tournament && (
                    <p className="text-yellow-100 text-sm mt-1">
                      {custom.tournament.name} - Vòng{" "}
                      {custom.tournamentRound || custom.tournament.currentRound}
                    </p>
                  )}
                </div>
              </div>

              {/* Score Display */}
              <div className="p-6">
                <div className="flex items-center justify-center gap-4 mb-6">
                  {/* Team 1 */}
                  <div
                    className={`flex-1 text-center p-4 rounded-xl border-2 ${
                      custom.winningTeam._id === custom.tournamentTeam1._id
                        ? "bg-green-50 border-green-400"
                        : "bg-red-50 border-red-300"
                    }`}
                  >
                    {custom.tournamentTeam1.logoUrl ? (
                      <img
                        src={custom.tournamentTeam1.logoUrl}
                        alt=""
                        className="w-16 h-16 rounded-full mx-auto mb-2 border-2 border-white shadow"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-red-200 rounded-full mx-auto mb-2 flex items-center justify-center">
                        <i className="fa-solid fa-users text-red-600 text-xl"></i>
                      </div>
                    )}
                    <div className="font-bold text-gray-900">
                      {custom.tournamentTeam1.tag ||
                        custom.tournamentTeam1.name}
                    </div>
                    <div className="text-3xl font-bold mt-2 text-gray-800">
                      {team1Score}
                    </div>
                    {custom.winningTeam._id === custom.tournamentTeam1._id ? (
                      <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-full text-sm font-semibold">
                        <i className="fa-solid fa-crown text-yellow-300"></i>{" "}
                        THẮNG
                      </div>
                    ) : (
                      <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded-full text-sm font-semibold">
                        <i className="fa-solid fa-times"></i> THUA
                      </div>
                    )}
                  </div>

                  {/* VS */}
                  <div className="text-2xl font-bold text-gray-400">VS</div>

                  {/* Team 2 */}
                  <div
                    className={`flex-1 text-center p-4 rounded-xl border-2 ${
                      custom.winningTeam._id === custom.tournamentTeam2._id
                        ? "bg-green-50 border-green-400"
                        : "bg-red-50 border-red-300"
                    }`}
                  >
                    {custom.tournamentTeam2.logoUrl ? (
                      <img
                        src={custom.tournamentTeam2.logoUrl}
                        alt=""
                        className="w-16 h-16 rounded-full mx-auto mb-2 border-2 border-white shadow"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-blue-200 rounded-full mx-auto mb-2 flex items-center justify-center">
                        <i className="fa-solid fa-users text-blue-600 text-xl"></i>
                      </div>
                    )}
                    <div className="font-bold text-gray-900">
                      {custom.tournamentTeam2.tag ||
                        custom.tournamentTeam2.name}
                    </div>
                    <div className="text-3xl font-bold mt-2 text-gray-800">
                      {team2Score}
                    </div>
                    {custom.winningTeam._id === custom.tournamentTeam2._id ? (
                      <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-full text-sm font-semibold">
                        <i className="fa-solid fa-crown text-yellow-300"></i>{" "}
                        THẮNG
                      </div>
                    ) : (
                      <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded-full text-sm font-semibold">
                        <i className="fa-solid fa-times"></i> THUA
                      </div>
                    )}
                  </div>
                </div>

                {/* Winner Announcement */}
                <div className="text-center p-4 bg-linear-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <p className="text-gray-600 text-sm mb-1">Đội chiến thắng</p>
                  <div className="flex items-center justify-center gap-2">
                    <i className="fa-solid fa-crown text-yellow-500 text-xl"></i>
                    <span className="text-xl font-bold text-green-700">
                      {custom.winningTeam.name}
                    </span>
                  </div>
                </div>

                {/* Match Info */}
                <div className="mt-4 text-center text-sm text-gray-500">
                  <p>Best of {custom.bestOf || 3}</p>
                  <p className="mt-1">
                    {new Date(custom.scheduleTime).toLocaleString("vi-VN")}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setShowResultModal(false)}
                  className="w-full py-3 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold transition shadow-md"
                >
                  <i className="fa-solid fa-check mr-2"></i>
                  Đã hiểu
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Result Modal - Simple Tournament Room (no Team Model) */}
      {showResultModal &&
        custom?.isTournamentRoom &&
        custom?.winningTeamName &&
        !custom?.tournamentTeam1 &&
        !custom?.tournamentTeam2 && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-scale-in">
              {/* Header with confetti effect */}
              <div className="bg-linear-to-r from-yellow-400 via-yellow-500 to-orange-500 p-6 text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-2 left-4 text-4xl">🎉</div>
                  <div className="absolute top-4 right-6 text-3xl">🏆</div>
                  <div className="absolute bottom-2 left-8 text-2xl">⭐</div>
                  <div className="absolute bottom-4 right-4 text-3xl">🎊</div>
                </div>
                <div className="relative">
                  <i className="fa-solid fa-trophy text-white text-5xl mb-3 drop-shadow-lg"></i>
                  <h3 className="text-2xl font-bold text-white drop-shadow">
                    Kết quả trận đấu
                  </h3>
                  {custom.tournamentName && (
                    <p className="text-yellow-100 text-sm mt-1">
                      {custom.tournamentName}
                    </p>
                  )}
                </div>
              </div>

              {/* Score Display */}
              <div className="p-6">
                <div className="flex items-center justify-center gap-4 mb-6">
                  {/* Team 1 */}
                  <div
                    className={`flex-1 text-center p-4 rounded-xl border-2 ${
                      custom.winningTeamName === "team1"
                        ? "bg-green-50 border-green-400"
                        : "bg-red-50 border-red-300"
                    }`}
                  >
                    <div className="w-16 h-16 bg-red-200 rounded-full mx-auto mb-2 flex items-center justify-center">
                      <i className="fa-solid fa-users text-red-600 text-xl"></i>
                    </div>
                    <div className="font-bold text-gray-900">Team 1</div>
                    <div className="text-3xl font-bold mt-2 text-gray-800">
                      {custom.team1Score || 0}
                    </div>
                    {custom.winningTeamName === "team1" ? (
                      <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-full text-sm font-semibold">
                        <i className="fa-solid fa-crown text-yellow-300"></i>{" "}
                        THẮNG
                      </div>
                    ) : (
                      <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded-full text-sm font-semibold">
                        <i className="fa-solid fa-times"></i> THUA
                      </div>
                    )}
                  </div>

                  {/* VS */}
                  <div className="text-2xl font-bold text-gray-400">VS</div>

                  {/* Team 2 */}
                  <div
                    className={`flex-1 text-center p-4 rounded-xl border-2 ${
                      custom.winningTeamName === "team2"
                        ? "bg-green-50 border-green-400"
                        : "bg-red-50 border-red-300"
                    }`}
                  >
                    <div className="w-16 h-16 bg-blue-200 rounded-full mx-auto mb-2 flex items-center justify-center">
                      <i className="fa-solid fa-users text-blue-600 text-xl"></i>
                    </div>
                    <div className="font-bold text-gray-900">Team 2</div>
                    <div className="text-3xl font-bold mt-2 text-gray-800">
                      {custom.team2Score || 0}
                    </div>
                    {custom.winningTeamName === "team2" ? (
                      <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-full text-sm font-semibold">
                        <i className="fa-solid fa-crown text-yellow-300"></i>{" "}
                        THẮNG
                      </div>
                    ) : (
                      <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded-full text-sm font-semibold">
                        <i className="fa-solid fa-times"></i> THUA
                      </div>
                    )}
                  </div>
                </div>

                {/* Winner Announcement */}
                <div className="text-center p-4 bg-linear-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <p className="text-gray-600 text-sm mb-1">Đội chiến thắng</p>
                  <div className="flex items-center justify-center gap-2">
                    <i className="fa-solid fa-crown text-yellow-500 text-xl"></i>
                    <span className="text-xl font-bold text-green-700">
                      {custom.winningTeamName === "team1" ? "Team 1" : "Team 2"}
                    </span>
                  </div>
                </div>

                {/* Match Info */}
                <div className="mt-4 text-center text-sm text-gray-500">
                  <p>Best of {custom.bestOf || 3}</p>
                  <p className="mt-1">
                    {new Date(custom.scheduleTime).toLocaleString("vi-VN")}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setShowResultModal(false)}
                  className="w-full py-3 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold transition shadow-md"
                >
                  <i className="fa-solid fa-check mr-2"></i>
                  Đã hiểu
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
