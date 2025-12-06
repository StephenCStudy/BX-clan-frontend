import React, { useEffect, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { http } from "../utils/http";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import ConfirmModal from "../components/ConfirmModal";
import TournamentSelectModal from "../components/TournamentSelectModal";
import TeamSelectModal from "../components/TeamSelectModal";
import { createSocket } from "../utils/socket";
import { Socket } from "socket.io-client";

interface CustomRoom {
  _id: string;
  title: string;
  description?: string;
  scheduleTime: string;
  maxPlayers: number;
  status: string;
  createdBy: any;
  players?: Member[];
  team1?: Member[];
  team2?: Member[];
  isTournamentRoom?: boolean;
  tournament?: any;
  tournamentTeam1?: any;
  tournamentTeam2?: any;
}

interface Member {
  _id: string;
  username: string;
  ingameName: string;
  avatarUrl?: string;
}

interface Tournament {
  _id: string;
  name: string;
  description?: string;
  gameType: string;
  gameMode: string;
  defaultBestOf: number;
  maxTeams: number;
  teamSize: number;
  status: string;
  currentRound: number;
  registeredTeams: any[];
  // Optional fields for News-based tournament room creation
  newsId?: string;
  newsTitle?: string;
}

interface Team {
  _id: string;
  name: string;
  tag?: string;
  logoUrl?: string;
  members: any[];
}

export default function CustomsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [customs, setCustoms] = useState<CustomRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    scheduleTime: "",
    maxPlayers: 10,
    bestOf: 3,
    gameMode: "5vs5",
  });
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  const [showMemberSelect, setShowMemberSelect] = useState(false);
  const { user } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [changingStatusId, setChangingStatusId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || ""
  );
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") || "all"
  );
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get("page") || "1")
  );
  const [totalPages, setTotalPages] = useState(1);
  const socketRef = useRef<Socket | null>(null);

  // Tournament room creation states
  const [showTournamentSelect, setShowTournamentSelect] = useState(false);
  const [showTeamSelect, setShowTeamSelect] = useState(false);
  const [selectedTournament, setSelectedTournament] =
    useState<Tournament | null>(null);
  const [selectedTeam1, setSelectedTeam1] = useState<Team | null>(null);
  const [selectedTeam2, setSelectedTeam2] = useState<Team | null>(null);

  const gameModeOptions = [
    { value: "5vs5", label: "5vs5 - Summoner's Rift" },
    { value: "aram", label: "ARAM - Howling Abyss" },
    { value: "draft", label: "Giải đấu cấm chọn" },
    { value: "minigame", label: "Minigame" },
  ];

  // Socket connection for realtime updates
  useEffect(() => {
    const socket = createSocket();
    socketRef.current = socket;

    // Listen for new rooms created
    socket.on("custom:created", (_newRoom: CustomRoom) => {
      // Reload to get accurate pagination
      loadCustoms();
    });

    // Listen for room updates
    socket.on("custom:updated", (updatedRoom: CustomRoom) => {
      setCustoms((prev) =>
        prev.map((c) => (c._id === updatedRoom._id ? updatedRoom : c))
      );
    });

    return () => {
      socket.off("custom:created");
      socket.off("custom:updated");
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    loadCustoms();
    loadMembers();
  }, [currentPage, searchQuery, statusFilter]);

  const loadCustoms = () => {
    setLoading(true);
    // Update URL params
    const params: any = { page: currentPage.toString() };
    if (searchQuery) params.search = searchQuery;
    if (statusFilter !== "all") params.status = statusFilter;
    setSearchParams(params);

    const apiParams: any = { page: currentPage, limit: 4, search: searchQuery };
    if (statusFilter !== "all") apiParams.status = statusFilter;

    http
      .get("/customs", {
        params: apiParams,
      })
      .then((res) => {
        setCustoms(res.data.items || []);
        setTotalPages(res.data.totalPages || 1);
      })
      .catch(() => toast.error("Lỗi tải danh sách"))
      .finally(() => setLoading(false));
  };

  const loadMembers = () => {
    http
      .get("/members")
      .then((res) => setMembers(res.data))
      .catch(() => toast.error("Lỗi tải danh sách thành viên"));
  };

  const toggleMember = (member: Member) => {
    if (selectedMembers.find((m) => m._id === member._id)) {
      setSelectedMembers(selectedMembers.filter((m) => m._id !== member._id));
    } else {
      if (selectedMembers.length < 10) {
        setSelectedMembers([...selectedMembers, member]);
      } else {
        toast.warning("Chỉ được chọn tối đa 10 người");
      }
    }
  };

  const createCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Nếu tạo phòng từ giải đấu với team đã chọn
      if (selectedTournament && selectedTeam1 && selectedTeam2) {
        await http.post("/customs", {
          ...form,
          tournamentId: selectedTournament._id,
          team1Id: selectedTeam1._id,
          team2Id: selectedTeam2._id,
          tournamentRound: selectedTournament.currentRound,
          bestOf: form.bestOf || selectedTournament.defaultBestOf,
          gameMode: form.gameMode || selectedTournament.gameMode,
        });
        toast.success("Tạo phòng giải đấu thành công");
      } else if (selectedTournament && !selectedTeam1 && !selectedTeam2) {
        // Tạo phòng giải đấu đơn giản (không có team từ Tournament model)
        // Dùng cho trường hợp News type="room-creation" mà không link Tournament
        await http.post("/customs", {
          ...form,
          isTournamentRoom: true,
          newsId: selectedTournament.newsId || selectedTournament._id,
          tournamentName:
            selectedTournament.newsTitle || selectedTournament.name,
          bestOf: form.bestOf || selectedTournament.defaultBestOf || 3,
          gameMode: form.gameMode || selectedTournament.gameMode || "5vs5",
        });
        toast.success("Tạo phòng giải đấu thành công");
      } else {
        // Tạo phòng bình thường
        await http.post("/customs", {
          ...form,
          maxPlayers: 10,
          players: selectedMembers.map((m) => m._id),
        });
        toast.success("Tạo Custom thành công");
      }

      // Reset form
      setShowForm(false);
      setForm({
        title: "",
        description: "",
        scheduleTime: "",
        maxPlayers: 10,
        bestOf: 3,
        gameMode: "5vs5",
      });
      setSelectedMembers([]);
      resetTournamentSelection();
      loadCustoms();
    } catch {
      toast.error("Lỗi tạo Custom");
    }
  };

  // Tournament selection handlers
  const handleTournamentSelect = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    // Cập nhật form với thông tin từ giải đấu
    setForm((prev) => ({
      ...prev,
      bestOf: tournament.defaultBestOf,
      gameMode: tournament.gameMode,
    }));
    // Mở modal chọn team
    setShowTeamSelect(true);
  };

  const handleTeamSelect = (team1: Team, team2: Team) => {
    setSelectedTeam1(team1);
    setSelectedTeam2(team2);
    // Tự động tính số người = số thành viên của 2 team
    const totalPlayers =
      (team1.members?.length || 0) + (team2.members?.length || 0);
    setForm((prev) => ({
      ...prev,
      maxPlayers: totalPlayers,
    }));
  };

  const resetTournamentSelection = () => {
    setSelectedTournament(null);
    setSelectedTeam1(null);
    setSelectedTeam2(null);
  };

  const changeStatus = async (id: string, newStatus: string) => {
    try {
      await http.put(`/customs/${id}`, { status: newStatus });
      setCustoms((prev) =>
        prev.map((c) => (c._id === id ? { ...c, status: newStatus } : c))
      );
      toast.success("Đã cập nhật trạng thái");
      setChangingStatusId(null);
    } catch {
      toast.error("Lỗi cập nhật trạng thái");
    }
  };

  const canManage = user && user.role !== "member";

  const requestDelete = (id: string) => {
    if (!canManage) return;
    setPendingDeleteId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await http.delete(`/customs/${pendingDeleteId}`);
      toast.success("Đã xóa Custom");
      setCustoms((prev) => prev.filter((c) => c._id !== pendingDeleteId));
    } catch {
      toast.error("Xóa thất bại");
    } finally {
      setConfirmOpen(false);
      setPendingDeleteId(null);
    }
  };

  if (loading)
    return <div className="text-center py-10 text-gray-600">Đang tải...</div>;

  const canCreate =
    user && (user.role === "leader" || user.role === "organizer");
  const isMember = user && user.role === "member";

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6">
      <div className="flex items-center justify-between mb-4 md:mb-6 gap-2">
        <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-red-600">
          Custom Games
        </h1>
        {canCreate && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-3 md:px-5 py-1.5 md:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs md:text-sm font-medium shadow-md transition whitespace-nowrap"
          >
            {showForm ? "Hủy" : "+ Tạo Room"}
          </button>
        )}
        {isMember && (
          <Link
            to="/registration"
            className="px-3 md:px-5 py-1.5 md:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs md:text-sm font-medium shadow-md transition whitespace-nowrap inline-flex items-center gap-1"
          >
            <i className="fa-solid fa-pen-to-square"></i> Đăng ký
          </Link>
        )}
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-4 flex flex-col md:flex-row gap-3 animate-fade-in-up">
        <input
          type="text"
          placeholder="Tìm kiếm theo tên phòng..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="flex-1 p-3 text-sm bg-white rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-smooth gpu-accelerated"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="md:w-48 p-3 text-sm bg-white rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-smooth gpu-accelerated"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="open">Đang mở</option>
          <option value="playing">Đang chơi</option>
          <option value="full">Đã đầy</option>
          <option value="closed">Đã đóng</option>
        </select>
      </div>

      {showForm && (
        <form
          onSubmit={createCustom}
          className="bg-white rounded-xl border-2 border-gray-200 p-3 md:p-6 mb-4 md:mb-6 shadow-lg animate-scale-in gpu-accelerated"
        >
          <h2 className="text-lg md:text-2xl font-semibold text-red-600 mb-3 md:mb-4 flex items-center gap-2">
            <span className="animate-pulse">
              <i className="fa-solid fa-gamepad"></i>
            </span>
            {selectedTournament ? "Tạo phòng Giải Đấu" : "Tạo Custom mới"}
          </h2>

          {/* Tournament Selection Section */}
          <div className="mb-4 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-yellow-800 flex items-center gap-2">
                <i className="fa-solid fa-trophy"></i>
                Tạo phòng từ Giải Đấu (tùy chọn)
              </label>
              {selectedTournament && (
                <button
                  type="button"
                  onClick={resetTournamentSelection}
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  <i className="fa-solid fa-xmark"></i> Hủy chọn
                </button>
              )}
            </div>

            {!selectedTournament ? (
              <button
                type="button"
                onClick={() => setShowTournamentSelect(true)}
                className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-trophy"></i>
                Chọn Giải Đấu
              </button>
            ) : (
              <div className="space-y-3">
                {/* Selected Tournament Info */}
                <div className="p-3 bg-white rounded-lg border border-yellow-300">
                  <div className="flex items-center gap-2 mb-2">
                    <i className="fa-solid fa-trophy text-yellow-500"></i>
                    <span className="font-semibold text-gray-900">
                      {selectedTournament.name}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                      Vòng {selectedTournament.currentRound}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    BO{selectedTournament.defaultBestOf} •{" "}
                    {selectedTournament.gameMode}
                  </p>
                </div>

                {/* Selected Teams */}
                {selectedTeam1 && selectedTeam2 ? (
                  <div className="p-3 bg-white rounded-lg border border-green-300">
                    <div className="flex items-center justify-between gap-4">
                      {/* Team 1 */}
                      <div className="flex-1 text-center p-2 bg-red-50 rounded border border-red-200">
                        <div className="flex items-center justify-center gap-2">
                          {selectedTeam1.logoUrl && (
                            <img
                              src={selectedTeam1.logoUrl}
                              alt=""
                              className="w-8 h-8 rounded-full"
                            />
                          )}
                          <span className="font-semibold text-red-700">
                            {selectedTeam1.tag || selectedTeam1.name}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {selectedTeam1.members?.length || 0} thành viên
                        </p>
                      </div>

                      <span className="font-bold text-gray-400">VS</span>

                      {/* Team 2 */}
                      <div className="flex-1 text-center p-2 bg-blue-50 rounded border border-blue-200">
                        <div className="flex items-center justify-center gap-2">
                          {selectedTeam2.logoUrl && (
                            <img
                              src={selectedTeam2.logoUrl}
                              alt=""
                              className="w-8 h-8 rounded-full"
                            />
                          )}
                          <span className="font-semibold text-blue-700">
                            {selectedTeam2.tag || selectedTeam2.name}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {selectedTeam2.members?.length || 0} thành viên
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowTeamSelect(true)}
                      className="w-full mt-2 py-2 bg-gray-100 hover:bg-gray-200 rounded text-xs font-medium"
                    >
                      <i className="fa-solid fa-pen"></i> Đổi team
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowTeamSelect(true)}
                    className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-users"></i>
                    Chọn 2 Team Thi Đấu
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block mb-1 text-xs md:text-sm text-gray-700 font-medium">
                Tiêu đề
              </label>
              <input
                className="w-full p-2 md:p-3 text-sm bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-smooth gpu-accelerated"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block mb-1 text-xs md:text-sm text-gray-700 font-medium">
                Mô tả
              </label>
              <textarea
                className="w-full p-2 md:p-3 text-sm bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-smooth gpu-accelerated"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-xs md:text-sm text-gray-700 font-medium">
                  Thời gian
                </label>
                <input
                  type="datetime-local"
                  className="w-full p-2 text-xs md:text-sm bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-smooth gpu-accelerated"
                  value={form.scheduleTime}
                  onChange={(e) =>
                    setForm({ ...form, scheduleTime: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-xs md:text-sm text-gray-700 font-medium">
                  Số người (tự động: 10)
                </label>
                <input
                  type="number"
                  className="w-full p-2 text-xs md:text-sm bg-gray-100 rounded-lg border-2 border-gray-300"
                  value={10}
                  disabled
                  readOnly
                />
              </div>
              <div>
                <label className="block mb-1 text-xs md:text-sm text-gray-700 font-medium">
                  Số trận thắng (Best of)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  className="w-full p-2 md:p-3 text-sm bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-smooth gpu-accelerated"
                  value={form.bestOf}
                  onChange={(e) =>
                    setForm({ ...form, bestOf: Number(e.target.value) })
                  }
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Số trận cần thắng để giành chiến thắng (1-10)
                </p>
              </div>
              <div>
                <label className="block mb-1 text-xs md:text-sm text-gray-700 font-medium">
                  Chế độ chơi / Map
                </label>
                <select
                  className="w-full p-2 md:p-3 text-sm bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                  value={form.gameMode}
                  onChange={(e) =>
                    setForm({ ...form, gameMode: e.target.value })
                  }
                >
                  {gameModeOptions.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Player Selection Section - Chỉ hiển thị khi KHÔNG tạo phòng giải đấu */}
            {!selectedTournament && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs md:text-sm text-gray-700 font-medium">
                    Chọn người chơi ({selectedMembers.length}/10) - có thể thêm
                    sau
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowMemberSelect(!showMemberSelect)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"
                  >
                    {showMemberSelect ? "Ẩn" : "Chọn"}
                  </button>
                </div>

                {/* Selected Members Display */}
                {selectedMembers.length > 0 && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg border-2 border-gray-300 animate-fade-in gpu-accelerated">
                    <div className="grid grid-cols-2 gap-3">
                      {/* Team 1 */}
                      <div>
                        <h3 className="text-xs font-semibold text-blue-600 mb-2">
                          Đội 1 ({selectedMembers.slice(0, 5).length}/5)
                        </h3>
                        <div className="space-y-1">
                          {selectedMembers.slice(0, 5).map((m) => (
                            <div
                              key={m._id}
                              className="flex items-center gap-2 p-2 bg-white rounded border hover-lift transition-smooth gpu-accelerated"
                            >
                              {m.avatarUrl && (
                                <img
                                  src={m.avatarUrl}
                                  alt=""
                                  className="w-6 h-6 rounded-full hover-grow transition-smooth gpu-accelerated"
                                />
                              )}
                              <span className="text-xs font-medium flex-1">
                                {m.ingameName || m.username}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleMember(m)}
                                className="text-red-500 hover:text-red-700 text-xs transition-smooth hover-shrink"
                              >
                                <i className="fa-solid fa-xmark"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Team 2 */}
                      <div>
                        <h3 className="text-xs font-semibold text-red-600 mb-2">
                          Đội 2 ({selectedMembers.slice(5, 10).length}/5)
                        </h3>
                        <div className="space-y-1">
                          {selectedMembers.slice(5, 10).map((m) => (
                            <div
                              key={m._id}
                              className="flex items-center gap-2 p-2 bg-white rounded border hover-lift transition-smooth gpu-accelerated"
                            >
                              {m.avatarUrl && (
                                <img
                                  src={m.avatarUrl}
                                  alt=""
                                  className="w-6 h-6 rounded-full hover-grow transition-smooth gpu-accelerated"
                                />
                              )}
                              <span className="text-xs font-medium flex-1">
                                {m.ingameName || m.username}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleMember(m)}
                                className="text-red-500 hover:text-red-700 text-xs transition-smooth hover-shrink"
                              >
                                <i className="fa-solid fa-xmark"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Member Selection Dropdown */}
                {showMemberSelect && (
                  <div className="max-h-60 overflow-y-auto bg-white border-2 border-gray-300 rounded-lg p-2 animate-scale-in gpu-accelerated">
                    <div className="space-y-1">
                      {members.map((member) => {
                        const isSelected = selectedMembers.find(
                          (m) => m._id === member._id
                        );
                        return (
                          <button
                            key={member._id}
                            type="button"
                            onClick={() => toggleMember(member)}
                            disabled={
                              !isSelected && selectedMembers.length >= 10
                            }
                            className={`w-full flex items-center gap-2 p-2 rounded text-left transition-smooth hover-lift gpu-accelerated ${
                              isSelected
                                ? "bg-green-100 border-2 border-green-500"
                                : "bg-gray-50 hover:bg-gray-100 border border-gray-300"
                            } ${
                              !isSelected && selectedMembers.length >= 10
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            {member.avatarUrl && (
                              <img
                                src={member.avatarUrl}
                                alt=""
                                className="w-8 h-8 rounded-full hover-grow transition-smooth gpu-accelerated"
                              />
                            )}
                            <div className="flex-1">
                              <div className="text-xs font-medium">
                                {member.ingameName || member.username}
                              </div>
                              <div className="text-xs text-gray-500">
                                {member.username}
                              </div>
                            </div>
                            {isSelected && (
                              <span className="text-green-600 font-bold">
                                <i className="fa-solid fa-check"></i>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={
                !!(selectedTournament && (!selectedTeam1 || !selectedTeam2))
              }
              className="w-full py-2 md:py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm md:text-base font-bold shadow-lg transition"
            >
              {selectedTournament
                ? selectedTeam1 && selectedTeam2
                  ? "Tạo phòng Giải Đấu"
                  : "Chọn 2 team để tiếp tục"
                : "Tạo Custom"}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {customs.map((c) => (
          <div
            key={c._id}
            className="bg-white rounded-xl border-2 border-gray-200 p-3 md:p-5 hover:border-red-500 hover:shadow-lg transition"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <Link to={`/customs/${c._id}`} className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm md:text-lg text-gray-900 line-clamp-1 flex items-center gap-2">
                  {c.isTournamentRoom && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold">
                      <i className="fa-solid fa-trophy"></i>
                    </span>
                  )}
                  {c.title}
                </h3>
              </Link>
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                {changingStatusId === c._id ? (
                  <select
                    value={c.status}
                    onChange={(e) => changeStatus(c._id, e.target.value)}
                    className="px-2 py-0.5 rounded text-xs font-medium border-2 border-blue-400 bg-blue-50"
                    autoFocus
                    onBlur={() => setChangingStatusId(null)}
                  >
                    <option value="open">Mở</option>
                    <option value="ongoing">Đang chơi</option>
                    <option value="closed">Đã hoàn thành</option>
                  </select>
                ) : (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      if (canManage) setChangingStatusId(c._id);
                    }}
                    disabled={!canManage}
                    className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                      c.status === "open"
                        ? "bg-green-100 text-green-800 border border-green-300"
                        : c.status === "ongoing"
                        ? "bg-blue-100 text-blue-800 border border-blue-300"
                        : "bg-gray-100 text-gray-800 border border-gray-300"
                    } ${canManage ? "cursor-pointer hover:opacity-80" : ""}`}
                  >
                    {c.status === "open"
                      ? "Mở"
                      : c.status === "ongoing"
                      ? "Đang chơi"
                      : "Đã hoàn thành"}
                  </button>
                )}
                {canManage && (
                  <div className="flex items-center gap-1">
                    <Link
                      to={`/customs/${c._id}?edit=1`}
                      className="px-1.5 py-0.5 text-xs border border-gray-300 rounded hover:border-gray-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Sửa
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        requestDelete(c._id);
                      }}
                      className="px-1.5 py-0.5 text-xs border border-red-300 text-red-600 rounded hover:border-red-400"
                    >
                      Xóa
                    </button>
                  </div>
                )}
              </div>
            </div>
            <Link to={`/customs/${c._id}`} className="block">
              <p className="text-xs md:text-sm text-gray-600 line-clamp-2 mb-2">
                {c.description || "Không có mô tả"}
              </p>

              {/* Display Teams if available */}
              {c.team1 &&
                c.team1.length > 0 &&
                c.team2 &&
                c.team2.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div className="bg-blue-50 border border-blue-200 rounded p-2">
                      <div className="font-semibold text-blue-700 mb-1">
                        Đội 1 ({c.team1.length})
                      </div>
                      {c.team1.slice(0, 3).map((player: Member) => (
                        <div
                          key={player._id}
                          className="text-gray-700 truncate"
                        >
                          • {player.ingameName || player.username}
                        </div>
                      ))}
                      {c.team1.length > 3 && (
                        <div className="text-gray-500">
                          +{c.team1.length - 3} khác
                        </div>
                      )}
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded p-2">
                      <div className="font-semibold text-red-700 mb-1">
                        Đội 2 ({c.team2.length})
                      </div>
                      {c.team2.slice(0, 3).map((player: Member) => (
                        <div
                          key={player._id}
                          className="text-gray-700 truncate"
                        >
                          • {player.ingameName || player.username}
                        </div>
                      ))}
                      {c.team2.length > 3 && (
                        <div className="text-gray-500">
                          +{c.team2.length - 3} khác
                        </div>
                      )}
                    </div>
                  </div>
                )}

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="truncate inline-flex items-center gap-1">
                  <i className="fa-regular fa-clock"></i>{" "}
                  {new Date(c.scheduleTime).toLocaleString("vi-VN")}
                </span>
                <span className="ml-2 whitespace-nowrap inline-flex items-center gap-1">
                  <i className="fa-solid fa-users"></i> {c.players?.length || 0}
                  /{c.maxPlayers}
                </span>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium text-sm"
          >
            ← Trước
          </button>
          <span className="text-sm text-gray-700 font-medium">
            Trang {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium text-sm"
          >
            Sau →
          </button>
        </div>
      )}

      <ConfirmModal
        open={confirmOpen}
        title="Xóa Custom"
        message="Bạn có chắc muốn xóa Custom này? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
        onConfirm={confirmDelete}
        onClose={() => {
          setConfirmOpen(false);
          setPendingDeleteId(null);
        }}
      />

      {/* Tournament Select Modal */}
      <TournamentSelectModal
        open={showTournamentSelect}
        onClose={() => setShowTournamentSelect(false)}
        onSelect={handleTournamentSelect}
      />

      {/* Team Select Modal */}
      {selectedTournament && (
        <TeamSelectModal
          open={showTeamSelect}
          tournamentId={selectedTournament._id}
          onClose={() => setShowTeamSelect(false)}
          onSelect={handleTeamSelect}
        />
      )}
    </div>
  );
}
