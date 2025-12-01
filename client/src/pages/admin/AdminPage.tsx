import { useEffect, useState } from "react";
import {
  Link,
  useSearchParams,
  useParams,
  useNavigate,
} from "react-router-dom";
import { http } from "../../utils/http";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";

type Tab =
  | "overview"
  | "members"
  | "customs"
  | "news"
  | "reports"
  | "rooms"
  | "matches";

export default function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeTab: Tab = (tab as Tab) || "overview";
  const [stats, setStats] = useState({
    members: 0,
    customs: 0,
    news: 0,
    reports: 0,
    rooms: 0,
  });
  const [members, setMembers] = useState<any[]>([]);
  const [customs, setCustoms] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [roomsByNews, setRoomsByNews] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [laneFilter, setLaneFilter] = useState("all");
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const PAGE_SIZE = 7;
  const [showAutoCreateModal, setShowAutoCreateModal] = useState(false);
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);
  const [autoCreateForm, setAutoCreateForm] = useState({
    gameMode: "5vs5",
    bestOf: 3,
  });
  const [showDeleteCustomModal, setShowDeleteCustomModal] = useState(false);
  const [customToDelete, setCustomToDelete] = useState<string | null>(null);
  const [showViewReportModal, setShowViewReportModal] = useState(false);
  const [showDeleteReportModal, setShowDeleteReportModal] = useState(false);
  const [reportToView, setReportToView] = useState<any>(null);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [showRegistrationListModal, setShowRegistrationListModal] =
    useState(false);
  const [registrationList, setRegistrationList] = useState<any[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [selectedNewsForRegistrations, setSelectedNewsForRegistrations] =
    useState<string | null>(null);
  const [allMembersForAdd, setAllMembersForAdd] = useState<any[]>([]);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedMembersToAdd, setSelectedMembersToAdd] = useState<string[]>(
    []
  );
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showRoomParticipantsModal, setShowRoomParticipantsModal] =
    useState(false);
  const [selectedRoomForParticipants, setSelectedRoomForParticipants] =
    useState<any>(null);

  // Check permission - only leader or organizer can access AdminPage
  useEffect(() => {
    if (!user || (user.role !== "leader" && user.role !== "organizer")) {
      toast.error(
        "Chỉ Trưởng Clan hoặc Ban Tổ Chức mới có quyền truy cập trang này"
      );
      navigate("/");
    }
  }, [user, navigate]);

  useEffect(() => {
    loadAllMembers();
  }, []);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      http.get("/members"),
      http.get("/customs", { params: { limit: 1000 } }),
      http.get("/news", { params: { limit: 1000 } }),
      http.get("/reports"),
    ])
      .then(([m, c, n, r]) => {
        const roomCreationNews = (n.data.items || n.data).filter(
          (item: any) => item.type === "room-creation"
        );
        setStats({
          members: m.data.length,
          customs: c.data.items?.length || c.data.length,
          news: n.data.items?.length || n.data.length,
          reports: r.data.length,
          rooms: roomCreationNews.length,
        });
        setMembers(m.data);
        setCustoms(c.data.items || c.data);
        setNews(n.data.items || n.data);
        setReports(r.data);

        // Load rooms for room-creation news
        Promise.all(
          roomCreationNews.map(async (newsItem: any) => {
            try {
              // First check if there are assigned registrations without rooms
              const regsResponse = await http.get(
                `/registrations/news/${newsItem._id}`
              );
              const registrations = regsResponse.data;
              const assignedCount = registrations.filter(
                (r: any) => r.status === "assigned"
              ).length;

              // Get rooms for this news
              const roomsResponse = await http.get(
                `/registrations/news/${newsItem._id}/rooms`
              );
              const rooms = roomsResponse.data;

              // Auto-reset if there are assigned registrations but no rooms
              if (assignedCount > 0 && rooms.length === 0) {
                console.log(
                  `Auto-resetting ${assignedCount} assignments for news ${newsItem._id}`
                );
                await http.post(
                  `/registrations/news/${newsItem._id}/reset-assignments`
                );
              }

              return {
                newsId: newsItem._id,
                newsTitle: newsItem.title,
                rooms: rooms,
              };
            } catch (err) {
              return {
                newsId: newsItem._id,
                newsTitle: newsItem.title,
                rooms: [],
              };
            }
          })
        ).then((roomsData) => {
          setRoomsByNews(roomsData);
          setIsLoading(false);
        });
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  const kickMember = async (id: string) => {
    if (!confirm("Chắc chắn kick?")) return;
    try {
      await http.delete(`/members/${id}`);
      setMembers(members.filter((m) => m._id !== id));
      toast.success("Đã kick");
    } catch {
      toast.error("Lỗi");
    }
  };

  const changeRole = async (id: string, role: string) => {
    try {
      await http.put(`/members/${id}/role`, { role });
      setMembers(members.map((m) => (m._id === id ? { ...m, role } : m)));
      toast.success("Đã đổi role");
    } catch {
      toast.error("Lỗi");
    }
  };

  const deleteCustom = async () => {
    if (!customToDelete) return;
    try {
      await http.delete(`/customs/${customToDelete}`);
      setCustoms(customs.filter((c) => c._id !== customToDelete));
      toast.success("Đã xóa");
      setShowDeleteCustomModal(false);
      setCustomToDelete(null);
    } catch {
      toast.error("Lỗi xóa custom");
    }
  };

  const requestDeleteCustom = (id: string) => {
    setCustomToDelete(id);
    setShowDeleteCustomModal(true);
  };

  const deleteCustomRoom = async (newsId: string, roomId: string) => {
    if (!confirm("Xóa phòng này?")) return;
    try {
      await http.delete(`/customs/${roomId}`);
      // Reload rooms data
      const res = await http.get(`/registrations/news/${newsId}/rooms`);
      setRoomsByNews((prev) =>
        prev.map((item) =>
          item.newsId === newsId ? { ...item, rooms: res.data } : item
        )
      );
      toast.success("Đã xóa phòng");
    } catch {
      toast.error("Lỗi xóa phòng");
    }
  };

  const handleAutoCreate = async () => {
    if (!selectedNewsId) return;
    try {
      console.log("Creating rooms for news:", selectedNewsId, autoCreateForm);
      const response = await http.post(
        `/registrations/news/${selectedNewsId}/auto-create-rooms`,
        autoCreateForm
      );
      console.log("Auto-create response:", response.data);

      if (response.data.rooms && response.data.rooms.length > 0) {
        toast.success(`Đã tạo ${response.data.rooms.length} phòng thành công`);
      } else {
        toast.info(
          response.data.message || "Không có đăng ký nào để xếp phòng"
        );
      }

      setShowAutoCreateModal(false);
      setSelectedNewsId(null);

      // Reload page after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      console.error("Auto-create error:", err);
      toast.error(err.response?.data?.message || "Lỗi tạo phòng");
    }
  };

  const deleteNews = async (id: string) => {
    if (!confirm("Xóa tin tức này?")) return;
    try {
      await http.delete(`/news/${id}`);
      setNews(news.filter((n) => n._id !== id));
      toast.success("Đã xóa");
    } catch {
      toast.error("Lỗi xóa tin tức");
    }
  };

  const deleteReport = async () => {
    if (!reportToDelete) return;
    try {
      await http.delete(`/reports/${reportToDelete}`);
      setReports(reports.filter((r) => r._id !== reportToDelete));
      toast.success("Đã xóa");
      setShowDeleteReportModal(false);
      setReportToDelete(null);
    } catch {
      toast.error("Lỗi xóa báo cáo");
    }
  };

  const requestViewReport = (report: any) => {
    setReportToView(report);
    setShowViewReportModal(true);
  };

  const requestDeleteReport = (id: string) => {
    setReportToDelete(id);
    setShowDeleteReportModal(true);
  };

  const loadRegistrationList = async (newsId: string) => {
    setLoadingRegistrations(true);
    try {
      console.log("Loading registrations for newsId:", newsId);
      const res = await http.get(`/registrations/news/${newsId}`);
      console.log("Registration response:", res.data);

      if (!res.data) {
        setRegistrationList([]);
      } else if (Array.isArray(res.data)) {
        setRegistrationList(res.data);
      } else if (res.data.items && Array.isArray(res.data.items)) {
        setRegistrationList(res.data.items);
      } else {
        console.error("Unexpected data format:", res.data);
        setRegistrationList([]);
      }

      setSelectedNewsForRegistrations(newsId);
      setShowRegistrationListModal(true);
    } catch (err: any) {
      console.error("Error loading registrations:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);
      toast.error(err.response?.data?.message || "Lỗi tải danh sách đăng ký");
    } finally {
      setLoadingRegistrations(false);
    }
  };

  const loadAllMembers = async () => {
    try {
      const res = await http.get("/members");
      setAllMembersForAdd(res.data);
    } catch (err) {
      console.error("Error loading members:", err);
    }
  };

  const deleteRegistration = async (regId: string) => {
    if (!selectedNewsForRegistrations) return;
    try {
      await http.delete(`/registrations/${regId}`);
      toast.success("Đã xóa đăng ký");
      loadRegistrationList(selectedNewsForRegistrations);
    } catch (err) {
      toast.error("Lỗi xóa đăng ký");
    }
  };

  const addMemberToRegistration = async () => {
    if (!selectedMembersToAdd.length || !selectedNewsForRegistrations) return;
    try {
      // Add members in parallel
      await Promise.all(
        selectedMembersToAdd.map((userId) =>
          http.post("/registrations", {
            news: selectedNewsForRegistrations,
            user: userId,
            ingameName: "Manual Add",
            lane: "Giữa",
            rank: "Vàng",
          })
        )
      );
      toast.success(`Đã thêm ${selectedMembersToAdd.length} thành viên`);
      setShowAddMemberModal(false);
      setSelectedMembersToAdd([]);
      setMemberSearchQuery("");
      loadRegistrationList(selectedNewsForRegistrations);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi thêm thành viên");
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6">
      {isLoading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mb-4"></div>
            <p className="text-gray-700 font-semibold">Đang tải dữ liệu...</p>
            <p className="text-sm text-gray-500 mt-2">
              Vui lòng đợi trong giây lát
            </p>
          </div>
        </div>
      )}

      <h1 className="text-xl md:text-3xl lg:text-4xl font-extrabold mb-3 md:mb-6 bg-linear-to-r from-fuchsia-500 via-rose-500 to-amber-400 bg-clip-text text-transparent">
        Admin Dashboard
      </h1>

      {/* Stat Cards - Clickable */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4 mb-3 md:mb-8">
        <button
          onClick={() => navigate("/admin/members")}
          className="rounded-lg p-2.5 md:p-5 text-center text-white shadow-lg bg-linear-to-br from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 transition-all transform hover:scale-105 cursor-pointer"
        >
          <p className="text-xl md:text-4xl font-extrabold drop-shadow-sm">
            {stats.members ?? 0}
          </p>
          <p className="mt-1 md:mt-2 opacity-90 font-medium text-xs md:text-base">
            Thành viên
          </p>
        </button>
        <button
          onClick={() => navigate("/admin/customs")}
          className="rounded-lg p-2.5 md:p-5 text-center text-white shadow-lg bg-linear-to-br from-sky-400 to-blue-600 hover:from-sky-500 hover:to-blue-700 transition-all transform hover:scale-105 cursor-pointer"
        >
          <p className="text-xl md:text-4xl font-extrabold drop-shadow-sm">
            {stats.customs ?? 0}
          </p>
          <p className="mt-1 md:mt-2 opacity-90 font-medium text-xs md:text-base">
            Custom Games
          </p>
        </button>
        <button
          onClick={() => navigate("/admin/news")}
          className="rounded-lg p-2.5 md:p-5 text-center text-white shadow-lg bg-linear-to-br from-fuchsia-400 to-purple-600 hover:from-fuchsia-500 hover:to-purple-700 transition-all transform hover:scale-105 cursor-pointer"
        >
          <p className="text-xl md:text-4xl font-extrabold drop-shadow-sm">
            {stats.news ?? 0}
          </p>
          <p className="mt-1 md:mt-2 opacity-90 font-medium text-xs md:text-base">
            Tin tức
          </p>
        </button>
        <button
          onClick={() => navigate("/admin/reports")}
          className="rounded-lg p-2.5 md:p-5 text-center text-white shadow-lg bg-linear-to-br from-amber-400 to-orange-600 hover:from-amber-500 hover:to-orange-700 transition-all transform hover:scale-105 cursor-pointer"
        >
          <p className="text-xl md:text-4xl font-extrabold drop-shadow-sm">
            {stats.reports ?? 0}
          </p>
          <p className="mt-1 md:mt-2 opacity-90 font-medium text-xs md:text-base">
            Báo cáo
          </p>
        </button>
        <button
          onClick={() => navigate("/admin/rooms")}
          className="rounded-lg p-2.5 md:p-5 text-center text-white shadow-lg bg-linear-to-br from-cyan-400 to-teal-600 hover:from-cyan-500 hover:to-teal-700 transition-all transform hover:scale-105 cursor-pointer"
        >
          <p className="text-xl md:text-4xl font-extrabold drop-shadow-sm">
            {stats.rooms ?? 0}
          </p>
          <p className="mt-1 md:mt-2 opacity-90 font-medium text-xs md:text-base">
            Đăng ký phòng
          </p>
        </button>
        <button
          onClick={() => navigate("/admin/matches")}
          className="rounded-lg p-2.5 md:p-5 text-center text-white shadow-lg bg-linear-to-br from-indigo-400 to-indigo-600 hover:from-indigo-500 hover:to-indigo-700 transition-all transform hover:scale-105 cursor-pointer"
        >
          <p className="text-xl md:text-4xl font-extrabold drop-shadow-sm">
            {stats.rooms ?? 0}
          </p>
          <p className="mt-1 md:mt-2 opacity-90 font-medium text-xs md:text-base">
            Danh Sách Đấu
          </p>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Activity Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Activities Card */}
            <div className="bg-linear-to-br from-emerald-50 to-emerald-100 rounded-xl border-2 border-emerald-300 p-5 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-emerald-800">
                  Hoạt động
                </h3>
                <span className="text-3xl">📊</span>
              </div>
              <p className="text-3xl font-extrabold text-emerald-600 mb-2">
                {parseInt(stats.customs?.toString() || "0", 10) +
                  parseInt(stats.news?.toString() || "0", 10)}
              </p>
              <p className="text-sm text-emerald-700">
                {stats.customs} custom + {stats.news} tin tức
              </p>
            </div>

            {/* Room Creation Card */}
            <div className="bg-linear-to-br from-cyan-50 to-cyan-100 rounded-xl border-2 border-cyan-300 p-5 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-cyan-800">Tạo phòng</h3>
                <span className="text-3xl">🏠</span>
              </div>
              <p className="text-3xl font-extrabold text-cyan-600 mb-2">
                {stats.rooms}
              </p>
              <p className="text-sm text-cyan-700">Bài đăng tạo phòng</p>
            </div>

            {/* New Members Card */}
            <div className="bg-linear-to-br from-purple-50 to-purple-100 rounded-xl border-2 border-purple-300 p-5 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-purple-800">
                  Thành viên mới
                </h3>
                <span className="text-3xl">👥</span>
              </div>
              <p className="text-3xl font-extrabold text-purple-600 mb-2">
                {
                  members.filter((m: any) => {
                    const joinDate = new Date(m.createdAt || m.joinDate);
                    const weekAgo = new Date(
                      Date.now() - 7 * 24 * 60 * 60 * 1000
                    );
                    return joinDate > weekAgo;
                  }).length
                }
              </p>
              <p className="text-sm text-purple-700">Tham gia tuần này</p>
            </div>

            {/* News Card */}
            <div className="bg-linear-to-br from-amber-50 to-amber-100 rounded-xl border-2 border-amber-300 p-5 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-amber-800">Tin tức</h3>
                <span className="text-3xl">📰</span>
              </div>
              <p className="text-3xl font-extrabold text-amber-600 mb-2">
                {stats.news}
              </p>
              <p className="text-sm text-amber-700">Tổng số bài viết</p>
            </div>
          </div>

          {/* Recent Activities Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent News */}
            <div className="bg-white rounded-xl border-2 border-gray-200 p-5 shadow-md">
              <h3 className="text-xl font-bold mb-4 text-purple-600 flex items-center gap-2">
                📰 Tin tức gần đây
              </h3>
              <div className="space-y-3">
                {news.slice(0, 5).map((n: any) => (
                  <div
                    key={n._id}
                    className="p-3 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition"
                  >
                    <Link to={`/news/${n._id}`}>
                      <p className="font-semibold text-gray-900 text-sm line-clamp-1">
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {n.content}
                      </p>
                      <p className="text-xs text-purple-600 mt-2">
                        {new Date(n.createdAt).toLocaleDateString("vi-VN")}
                      </p>
                    </Link>
                  </div>
                ))}
                {news.length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    Chưa có tin tức
                  </p>
                )}
              </div>
            </div>

            {/* Recent Custom Rooms */}
            <div className="bg-white rounded-xl border-2 border-gray-200 p-5 shadow-md">
              <h3 className="text-xl font-bold mb-4 text-blue-600 flex items-center gap-2">
                🎮 Custom games gần đây
              </h3>
              <div className="space-y-3">
                {customs.slice(0, 5).map((c: any) => (
                  <div
                    key={c._id}
                    className="p-3 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition"
                  >
                    <Link to={`/customs/${c._id}`}>
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-gray-900 text-sm line-clamp-1 flex-1">
                          {c.title}
                        </p>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold ml-2 ${
                            c.status === "open"
                              ? "bg-green-100 text-green-700"
                              : c.status === "ongoing"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {c.status === "open"
                            ? "Mở"
                            : c.status === "ongoing"
                            ? "Đang chơi"
                            : "Đóng"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        👥 {c.players?.length || 0}/{c.maxPlayers} • 🕒{" "}
                        {new Date(c.scheduleTime).toLocaleDateString("vi-VN")}
                      </p>
                    </Link>
                  </div>
                ))}
                {customs.length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    Chưa có custom games
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="bg-white rounded-xl border-2 border-gray-200 p-4 sm:p-5 md:p-6 shadow-lg">
            <h2 className="text-xl sm:text-2xl font-bold mb-6 text-indigo-600 flex items-center gap-3">
              <span className="w-2 h-8 bg-indigo-500 rounded-full"></span>
              Biểu đồ tổng quan
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* Members by Role Chart */}
              <div className="bg-linear-to-br from-emerald-50 via-white to-teal-50 rounded-2xl p-6 border-2 border-emerald-200 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg font-bold mb-5 text-emerald-700 flex items-center gap-2 border-b-2 border-emerald-100 pb-3">
                  <span className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                    👥
                  </span>
                  Thành viên theo Role
                </h3>
                <div className="h-64 flex items-end justify-around gap-3 px-2 pt-4 border-b-2 border-dashed border-gray-200">
                  {[
                    {
                      role: "Leader",
                      count: members.filter((m: any) => m.role === "leader")
                        .length,
                      color: "bg-linear-to-t from-red-600 to-red-400",
                      bgColor: "bg-red-50",
                      borderColor: "border-red-200",
                    },
                    {
                      role: "Organizer",
                      count: members.filter((m: any) => m.role === "organizer")
                        .length,
                      color: "bg-linear-to-t from-blue-600 to-blue-400",
                      bgColor: "bg-blue-50",
                      borderColor: "border-blue-200",
                    },
                    {
                      role: "Moderator",
                      count: members.filter((m: any) => m.role === "moderator")
                        .length,
                      color: "bg-linear-to-t from-purple-600 to-purple-400",
                      bgColor: "bg-purple-50",
                      borderColor: "border-purple-200",
                    },
                    {
                      role: "Member",
                      count: members.filter((m: any) => m.role === "member")
                        .length,
                      color: "bg-linear-to-t from-gray-600 to-gray-400",
                      bgColor: "bg-gray-50",
                      borderColor: "border-gray-200",
                    },
                  ].map((item, index) => {
                    const maxCount = Math.max(
                      members.filter((m: any) => m.role === "leader").length,
                      members.filter((m: any) => m.role === "organizer").length,
                      members.filter((m: any) => m.role === "moderator").length,
                      members.filter((m: any) => m.role === "member").length,
                      1
                    );
                    const heightPercent = Math.max(
                      (item.count / maxCount) * 100,
                      8
                    );
                    return (
                      <div
                        key={item.role}
                        className={`flex-1 flex flex-col items-center group ${
                          index < 3
                            ? "border-r-2 border-dashed border-gray-200 pr-3"
                            : ""
                        }`}
                      >
                        <div className="relative w-full flex flex-col items-center">
                          <div
                            className={`mb-3 px-3 py-1.5 ${item.bgColor} rounded-lg shadow-sm border ${item.borderColor} group-hover:scale-110 transition-all duration-200`}
                          >
                            <span className="text-lg font-black text-gray-800">
                              {item.count}
                            </span>
                          </div>
                          <div
                            className={`w-4/5 ${item.color} rounded-t-lg shadow-md hover:shadow-lg transition-all duration-300 group-hover:w-full`}
                            style={{
                              height: `${heightPercent}%`,
                              minHeight: "16px",
                            }}
                          />
                        </div>
                        <p className="text-xs md:text-sm font-bold mt-3 text-gray-600 text-center">
                          {item.role}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rooms by Time Period Chart */}
              <div className="bg-linear-to-br from-violet-50 via-white to-indigo-50 rounded-2xl p-6 border-2 border-violet-200 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg font-bold mb-5 text-violet-700 flex items-center gap-2 border-b-2 border-violet-100 pb-3">
                  <span className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                    🏠
                  </span>
                  Phòng theo thời gian
                </h3>
                <div className="h-64 flex items-end justify-around gap-3 px-2 pt-4 border-b-2 border-dashed border-gray-200">
                  {(() => {
                    const now = new Date();
                    const today = now.toDateString();
                    const thisMonth = now.getMonth();
                    const thisYear = now.getFullYear();

                    const roomsToday = customs.filter((c: any) => {
                      const d = new Date(c.createdAt || c.scheduleTime);
                      return d.toDateString() === today;
                    }).length;

                    const roomsThisMonth = customs.filter((c: any) => {
                      const d = new Date(c.createdAt || c.scheduleTime);
                      return (
                        d.getMonth() === thisMonth &&
                        d.getFullYear() === thisYear
                      );
                    }).length;

                    const roomsThisYear = customs.filter((c: any) => {
                      const d = new Date(c.createdAt || c.scheduleTime);
                      return d.getFullYear() === thisYear;
                    }).length;

                    const totalRooms = customs.length;

                    const chartData = [
                      {
                        label: "Hôm nay",
                        count: roomsToday,
                        color: "bg-linear-to-t from-cyan-600 to-cyan-400",
                        bgColor: "bg-cyan-50",
                        borderColor: "border-cyan-200",
                        icon: "📅",
                      },
                      {
                        label: "Tháng này",
                        count: roomsThisMonth,
                        color: "bg-linear-to-t from-violet-600 to-violet-400",
                        bgColor: "bg-violet-50",
                        borderColor: "border-violet-200",
                        icon: "📆",
                      },
                      {
                        label: "Năm nay",
                        count: roomsThisYear,
                        color: "bg-linear-to-t from-fuchsia-600 to-fuchsia-400",
                        bgColor: "bg-fuchsia-50",
                        borderColor: "border-fuchsia-200",
                        icon: "🗓️",
                      },
                      {
                        label: "Tổng cộng",
                        count: totalRooms,
                        color: "bg-linear-to-t from-indigo-600 to-indigo-400",
                        bgColor: "bg-indigo-50",
                        borderColor: "border-indigo-200",
                        icon: "📊",
                      },
                    ];

                    const maxCount = Math.max(
                      ...chartData.map((d) => d.count),
                      1
                    );

                    return chartData.map((item, index) => {
                      const heightPercent = Math.max(
                        (item.count / maxCount) * 100,
                        8
                      );
                      return (
                        <div
                          key={item.label}
                          className={`flex-1 flex flex-col items-center group ${
                            index < 3
                              ? "border-r-2 border-dashed border-gray-200 pr-3"
                              : ""
                          }`}
                        >
                          <div className="relative w-full flex flex-col items-center">
                            <div
                              className={`mb-3 px-3 py-1.5 ${item.bgColor} rounded-lg shadow-sm border ${item.borderColor} group-hover:scale-110 transition-all duration-200 flex items-center gap-1`}
                            >
                              <span className="text-sm">{item.icon}</span>
                              <span className="text-lg font-black text-gray-800">
                                {item.count}
                              </span>
                            </div>
                            <div
                              className={`w-4/5 ${item.color} rounded-t-lg shadow-md hover:shadow-lg transition-all duration-300 group-hover:w-full`}
                              style={{
                                height: `${heightPercent}%`,
                                minHeight: "16px",
                              }}
                            />
                          </div>
                          <p className="text-xs md:text-sm font-bold mt-3 text-gray-600 text-center">
                            {item.label}
                          </p>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "members" && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-3 md:p-6 shadow-md">
          <h2 className="text-lg md:text-2xl font-bold mb-3 md:mb-4 text-emerald-600">
            Quản lý thành viên
          </h2>

          {/* Search and Filter */}
          <div className="mb-3 flex gap-2">
            <input
              type="text"
              placeholder="Tìm kiếm..."
              className="flex-1 p-2 md:p-3 text-sm rounded-lg border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchParams({ page: "1" });
              }}
            />
            <select
              className="p-2 md:p-3 text-sm rounded-lg border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              value={laneFilter}
              onChange={(e) => {
                setLaneFilter(e.target.value);
                setSearchParams({ page: "1" });
              }}
            >
              <option value="all">Tất cả</option>
              <option value="Baron">Baron</option>
              <option value="Rừng">Rừng</option>
              <option value="Giữa">Giữa</option>
              <option value="Rồng">Rồng</option>
              <option value="Hỗ Trợ">Hỗ Trợ</option>
            </select>
          </div>

          {/* Members Table */}
          <div className="overflow-x-auto -mx-3 md:mx-0">
            <table className="w-full">
              <thead>
                <tr className="bg-emerald-50 border-b-2 border-emerald-200">
                  <th className="px-2 md:px-3 py-2 md:py-3 text-left text-xs font-semibold text-emerald-800 uppercase">
                    Thành viên
                  </th>
                  <th className="px-2 md:px-3 py-2 md:py-3 text-left text-xs font-semibold text-emerald-800 uppercase hidden md:table-cell">
                    Vị trí
                  </th>
                  <th className="px-2 md:px-3 py-2 md:py-3 text-left text-xs font-semibold text-emerald-800 uppercase hidden lg:table-cell">
                    Mật khẩu
                  </th>
                  <th className="px-2 md:px-3 py-2 md:py-3 text-left text-xs font-semibold text-emerald-800 uppercase">
                    Role
                  </th>
                  <th className="px-2 md:px-3 py-2 md:py-3 text-right text-xs font-semibold text-emerald-800 uppercase">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(() => {
                  // Filter members
                  let filtered = members.filter((m) => {
                    const matchSearch =
                      m.username
                        ?.toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                      m.ingameName
                        ?.toLowerCase()
                        .includes(searchQuery.toLowerCase());
                    const matchLane =
                      laneFilter === "all" || m.lane?.includes(laneFilter);
                    return matchSearch && matchLane;
                  });

                  // Pagination
                  const startIndex = (currentPage - 1) * PAGE_SIZE;
                  const paginatedMembers = filtered.slice(
                    startIndex,
                    startIndex + PAGE_SIZE
                  );

                  return (
                    <>
                      {paginatedMembers.map((m) => (
                        <tr key={m._id} className="hover:bg-gray-50">
                          <td className="px-2 md:px-3 py-2 md:py-3">
                            <div className="flex items-center gap-2">
                              <img
                                src={
                                  m.avatarUrl || "https://placehold.co/40x40"
                                }
                                alt={m.username}
                                className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-emerald-400"
                              />
                              <div>
                                <p className="font-semibold text-gray-900 text-xs md:text-sm">
                                  {m.username}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {m.ingameName}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 md:px-3 py-2 md:py-3 hidden md:table-cell">
                            <span className="text-xs md:text-sm text-gray-700">
                              {m.lane || "—"}
                            </span>
                          </td>
                          <td className="px-2 md:px-3 py-2 md:py-3 hidden lg:table-cell">
                            <div className="text-xs">
                              {user?.role === "leader" && m.password ? (
                                <>
                                  <span className="font-mono bg-gray-100 px-2 py-1 rounded border border-gray-300 inline-block">
                                    {m.password}
                                  </span>
                                  <span className="block text-[10px] text-gray-500 mt-1">
                                    Chỉ leader mới thấy
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="font-mono bg-gray-100 px-2 py-1 rounded border border-gray-300 inline-block">
                                    ••••••••
                                  </span>
                                  <span className="block text-[10px] text-gray-500 mt-1">
                                    Ẩn vì bảo mật
                                  </span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-2 md:px-3 py-2 md:py-3">
                            <select
                              value={m.role}
                              onChange={(e) =>
                                changeRole(m._id, e.target.value)
                              }
                              className="px-2 py-1 bg-white rounded-lg border-2 border-gray-300 text-xs md:text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                            >
                              <option value="member">Thành Viên</option>
                              <option value="moderator">Quản Trị Viên</option>
                              <option value="organizer">Ban Tổ Chức</option>
                              <option value="leader">Trưởng Clan</option>
                            </select>
                          </td>
                          <td className="px-2 md:px-3 py-2 md:py-3 text-right">
                            <button
                              onClick={() => kickMember(m._id)}
                              className="px-2 md:px-3 py-1 rounded-lg text-xs md:text-sm text-white shadow-md bg-linear-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700"
                            >
                              Kick
                            </button>
                          </td>
                        </tr>
                      ))}
                      {paginatedMembers.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-3 py-8 text-center text-gray-500"
                          >
                            Không tìm thấy thành viên
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(() => {
            let filtered = members.filter((m) => {
              const matchSearch =
                m.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.ingameName?.toLowerCase().includes(searchQuery.toLowerCase());
              const matchLane =
                laneFilter === "all" || m.lane?.includes(laneFilter);
              return matchSearch && matchLane;
            });
            const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

            if (totalPages <= 1) return null;

            return (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}-
                  {Math.min(currentPage * PAGE_SIZE, filtered.length)} /{" "}
                  {filtered.length} thành viên
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setSearchParams({
                        page: String(Math.max(1, currentPage - 1)),
                      })
                    }
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    ← Trước
                  </button>
                  <span className="px-3 py-1 text-sm font-medium">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setSearchParams({
                        page: String(Math.min(totalPages, currentPage + 1)),
                      })
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Sau →
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === "customs" && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-3 md:p-6 shadow-md">
          <h2 className="text-lg md:text-2xl font-bold mb-3 md:mb-4 text-blue-600">
            Quản lý Custom Games
          </h2>

          {/* Customs Table */}
          <div className="overflow-x-auto -mx-3 md:mx-0">
            <table className="w-full">
              <thead>
                <tr className="bg-blue-50 border-b-2 border-blue-200">
                  <th className="px-2 md:px-3 py-2 md:py-3 text-left text-xs font-semibold text-blue-800 uppercase">
                    Custom Game
                  </th>
                  <th className="px-2 md:px-3 py-2 md:py-3 text-left text-xs font-semibold text-blue-800 uppercase hidden md:table-cell">
                    Thời gian
                  </th>
                  <th className="px-2 md:px-3 py-2 md:py-3 text-left text-xs font-semibold text-blue-800 uppercase hidden lg:table-cell">
                    Trạng thái
                  </th>
                  <th className="px-2 md:px-3 py-2 md:py-3 text-right text-xs font-semibold text-blue-800 uppercase">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(() => {
                  const startIndex = (currentPage - 1) * PAGE_SIZE;
                  const paginatedCustoms = customs.slice(
                    startIndex,
                    startIndex + PAGE_SIZE
                  );

                  return (
                    <>
                      {paginatedCustoms.map((c) => (
                        <tr key={c._id} className="hover:bg-gray-50">
                          <td className="px-2 md:px-3 py-2 md:py-3">
                            <div>
                              <p className="font-semibold text-gray-900 text-xs md:text-sm">
                                {c.title}
                              </p>
                              <p className="text-xs text-gray-600 line-clamp-1">
                                {c.description || "Không có mô tả"}
                              </p>
                            </div>
                          </td>
                          <td className="px-2 md:px-3 py-2 md:py-3 hidden md:table-cell">
                            <span className="text-xs text-gray-700">
                              {new Date(c.scheduleTime).toLocaleString("vi-VN")}
                            </span>
                          </td>
                          <td className="px-2 md:px-3 py-2 md:py-3 hidden lg:table-cell">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                c.status === "open"
                                  ? "bg-green-100 text-green-800"
                                  : c.status === "ongoing"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="px-2 md:px-3 py-2 md:py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                to={`/customs/${c._id}`}
                                className="px-2 md:px-3 py-1 rounded-lg text-xs md:text-sm text-white bg-blue-600 hover:bg-blue-700"
                              >
                                Xem
                              </Link>
                              <button
                                onClick={() => requestDeleteCustom(c._id)}
                                className="px-2 md:px-3 py-1 rounded-lg text-xs md:text-sm text-white bg-red-600 hover:bg-red-700"
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {paginatedCustoms.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-3 py-8 text-center text-gray-500"
                          >
                            Không có custom game
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(() => {
            const totalPages = Math.ceil(customs.length / PAGE_SIZE);
            if (totalPages <= 1) return null;

            return (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}-
                  {Math.min(currentPage * PAGE_SIZE, customs.length)} /{" "}
                  {customs.length} custom games
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setSearchParams({
                        page: String(Math.max(1, currentPage - 1)),
                      })
                    }
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    ← Trước
                  </button>
                  <span className="px-3 py-1 text-sm font-medium">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setSearchParams({
                        page: String(Math.min(totalPages, currentPage + 1)),
                      })
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Sau →
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === "news" && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4 sm:p-5 md:p-6 shadow-md">
          <h2 className="text-xl sm:text-2xl font-bold mb-3 md:mb-4 text-purple-600">
            Quản lý Tin tức
          </h2>

          {/* News Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-purple-50 border-b-2 border-purple-200">
                  <th className="px-2 md:px-3 py-2 md:py-3 text-left text-xs font-semibold text-purple-800 uppercase">
                    Tin tức
                  </th>
                  <th className="px-2 md:px-3 py-2 md:py-3 text-left text-xs font-semibold text-purple-800 uppercase hidden lg:table-cell">
                    Ngày tạo
                  </th>
                  <th className="px-2 md:px-3 py-2 md:py-3 text-right text-xs font-semibold text-purple-800 uppercase">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(() => {
                  const startIndex = (currentPage - 1) * PAGE_SIZE;
                  const paginatedNews = news.slice(
                    startIndex,
                    startIndex + PAGE_SIZE
                  );

                  return (
                    <>
                      {paginatedNews.map((n) => (
                        <tr key={n._id} className="hover:bg-gray-50">
                          <td className="px-2 md:px-3 py-2 md:py-3">
                            <div>
                              <p className="font-semibold text-gray-900 text-xs md:text-sm">
                                {n.title}
                              </p>
                              <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                                {n.content}
                              </p>
                            </div>
                          </td>
                          <td className="px-2 md:px-3 py-2 md:py-3 hidden lg:table-cell">
                            <span className="text-xs text-gray-700">
                              {new Date(n.createdAt).toLocaleString("vi-VN")}
                            </span>
                          </td>
                          <td className="px-2 md:px-3 py-2 md:py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                to={`/news/${n._id}`}
                                className="px-2 md:px-3 py-1 rounded-lg text-xs md:text-sm text-white bg-purple-600 hover:bg-purple-700"
                              >
                                Xem
                              </Link>
                              <button
                                onClick={() => deleteNews(n._id)}
                                className="px-2 md:px-3 py-1 rounded-lg text-xs md:text-sm text-white bg-red-600 hover:bg-red-700"
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {paginatedNews.length === 0 && (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-3 py-8 text-center text-gray-500"
                          >
                            Không có tin tức
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(() => {
            const totalPages = Math.ceil(news.length / PAGE_SIZE);
            if (totalPages <= 1) return null;

            return (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}-
                  {Math.min(currentPage * PAGE_SIZE, news.length)} /{" "}
                  {news.length} tin tức
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setSearchParams({
                        page: String(Math.max(1, currentPage - 1)),
                      })
                    }
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    ← Trước
                  </button>
                  <span className="px-3 py-1 text-sm font-medium">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setSearchParams({
                        page: String(Math.min(totalPages, currentPage + 1)),
                      })
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Sau →
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === "reports" && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4 sm:p-5 md:p-6 shadow-md">
          <h2 className="text-xl sm:text-2xl font-bold mb-3 md:mb-4 text-orange-600">
            Quản lý Báo cáo vi phạm
          </h2>

          {/* Reports Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-orange-50 border-b-2 border-orange-200">
                  <th className="px-2 md:px-3 py-2 md:py-3 text-left text-xs font-semibold text-orange-800 uppercase">
                    Báo cáo
                  </th>
                  <th className="px-2 md:px-3 py-2 md:py-3 text-left text-xs font-semibold text-orange-800 uppercase hidden lg:table-cell">
                    Trạng thái
                  </th>
                  <th className="px-2 md:px-3 py-2 md:py-3 text-right text-xs font-semibold text-orange-800 uppercase">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(() => {
                  const startIndex = (currentPage - 1) * PAGE_SIZE;
                  const paginatedReports = reports.slice(
                    startIndex,
                    startIndex + PAGE_SIZE
                  );

                  return (
                    <>
                      {paginatedReports.map((r) => (
                        <tr key={r._id} className="hover:bg-gray-50">
                          <td className="px-2 md:px-3 py-2 md:py-3">
                            <p className="text-xs md:text-sm text-gray-800 line-clamp-2">
                              {r.content}
                            </p>
                          </td>
                          <td className="px-2 md:px-3 py-2 md:py-3 hidden lg:table-cell">
                            <span className="px-2 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-800">
                              {r.status}
                            </span>
                          </td>
                          <td className="px-2 md:px-3 py-2 md:py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => requestViewReport(r)}
                                className="px-2 md:px-3 py-1 rounded-lg text-xs md:text-sm text-white bg-orange-600 hover:bg-orange-700"
                              >
                                Xem
                              </button>
                              <button
                                onClick={() => requestDeleteReport(r._id)}
                                className="px-2 md:px-3 py-1 rounded-lg text-xs md:text-sm text-white bg-red-600 hover:bg-red-700"
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {paginatedReports.length === 0 && (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-3 py-8 text-center text-gray-500"
                          >
                            Không có báo cáo
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(() => {
            const totalPages = Math.ceil(reports.length / PAGE_SIZE);
            if (totalPages <= 1) return null;

            return (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}-
                  {Math.min(currentPage * PAGE_SIZE, reports.length)} /{" "}
                  {reports.length} báo cáo
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setSearchParams({
                        page: String(Math.max(1, currentPage - 1)),
                      })
                    }
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    ← Trước
                  </button>
                  <span className="px-3 py-1 text-sm font-medium">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setSearchParams({
                        page: String(Math.min(totalPages, currentPage + 1)),
                      })
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Sau →
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === "rooms" && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-3 sm:p-4 md:p-6 shadow-md">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 md:mb-4 text-teal-600">
            Quản lý Đăng ký theo Phòng
          </h2>

          {roomsByNews.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              Chưa có bài đăng "Tạo phòng" nào
            </div>
          )}

          {roomsByNews.map((newsData: any) => (
            <div
              key={newsData.newsId}
              className="mb-4 sm:mb-6 border-2 border-teal-200 rounded-xl p-3 sm:p-4 bg-teal-50"
            >
              {/* Header with buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-bold text-teal-800 line-clamp-2">
                  {newsData.newsTitle}
                </h3>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => loadRegistrationList(newsData.newsId)}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold whitespace-nowrap"
                  >
                    📋 Xem DS
                  </button>
                  <button
                    onClick={() => {
                      setSelectedNewsId(newsData.newsId);
                      setShowAutoCreateModal(true);
                    }}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-semibold whitespace-nowrap"
                  >
                    ⚙️ Tạo tự động
                  </button>
                </div>
              </div>

              {newsData.rooms.length === 0 ? (
                <p className="text-gray-600 text-xs sm:text-sm">
                  Chưa có phòng nào
                </p>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {newsData.rooms.map((room: any) => (
                    <div
                      key={room._id}
                      className="bg-white rounded-lg border-2 border-gray-200 p-2 sm:p-3"
                    >
                      {/* Room header */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900 text-sm sm:text-base line-clamp-1">
                          {room.title || `Phòng ${room.roomNumber}`}
                        </h4>
                        <div className="flex items-center justify-between sm:justify-end gap-2">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/customs/${room._id}`}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium flex items-center gap-1"
                              title="Xem chi tiết phòng"
                            >
                              👁️ <span className="hidden sm:inline">Xem</span>
                            </Link>
                            <button
                              onClick={() =>
                                deleteCustomRoom(newsData.newsId, room._id)
                              }
                              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium"
                              title="Xóa phòng"
                            >
                              🗑️ <span className="hidden sm:inline">Xóa</span>
                            </button>
                          </div>
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${
                              room.status === "full" ||
                              room.players?.length >= 10
                                ? "bg-red-100 text-red-600"
                                : "bg-green-100 text-green-600"
                            }`}
                          >
                            {room.players?.length || 0}/10
                          </span>
                        </div>
                      </div>

                      {/* Teams */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Team 1 */}
                        {room.team1 && room.team1.length > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded p-2">
                            <div className="font-semibold text-blue-700 text-xs mb-1">
                              Đội 1 ({room.team1.length})
                            </div>
                            <div className="space-y-0.5">
                              {room.team1.map((player: any) => (
                                <div
                                  key={player._id}
                                  className="flex items-center gap-2"
                                >
                                  <img
                                    src={
                                      player.avatarUrl ||
                                      "https://placehold.co/24x24"
                                    }
                                    alt=""
                                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full shrink-0"
                                  />
                                  <span className="text-xs text-gray-700 truncate">
                                    {player.ingameName || player.username}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Team 2 */}
                        {room.team2 && room.team2.length > 0 && (
                          <div className="bg-red-50 border border-red-200 rounded p-2">
                            <div className="font-semibold text-red-700 text-xs mb-1">
                              Đội 2 ({room.team2.length})
                            </div>
                            <div className="space-y-0.5">
                              {room.team2.map((player: any) => (
                                <div
                                  key={player._id}
                                  className="flex items-center gap-2"
                                >
                                  <img
                                    src={
                                      player.avatarUrl ||
                                      "https://placehold.co/24x24"
                                    }
                                    alt=""
                                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full shrink-0"
                                  />
                                  <span className="text-xs text-gray-700 truncate">
                                    {player.ingameName || player.username}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Section 2: Manual Rooms (customs not linked to news) */}
          <div className="mt-6 border-2 border-purple-200 rounded-xl p-3 sm:p-4 bg-purple-50">
            <h3 className="text-base sm:text-lg font-bold text-purple-700 mb-3 flex items-center gap-2">
              🎮 Phòng tạo bằng tay (Custom Games)
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Các phòng được tạo thủ công từ trang Custom Games, không liên kết
              với bài đăng.
            </p>
            {(() => {
              const newsRoomIds = roomsByNews.flatMap((nr: any) =>
                nr.rooms.map((r: any) => r._id)
              );
              const manualRooms = customs.filter(
                (c: any) => !newsRoomIds.includes(c._id)
              );

              if (manualRooms.length === 0) {
                return (
                  <p className="text-gray-500 text-sm">
                    Chưa có phòng nào được tạo bằng tay.
                  </p>
                );
              }

              return (
                <div className="space-y-3">
                  {manualRooms.map((room: any) => (
                    <div
                      key={room._id}
                      className="bg-white rounded-lg border-2 border-gray-200 p-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {room.title}
                          </h4>
                          <p className="text-xs text-gray-600">
                            🕒{" "}
                            {new Date(room.scheduleTime).toLocaleString(
                              "vi-VN"
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/customs/${room._id}`}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"
                          >
                            👁️ Xem
                          </Link>
                          <button
                            onClick={() => requestDeleteCustom(room._id)}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium"
                          >
                            🗑️ Xóa
                          </button>
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold ${
                              room.status === "open"
                                ? "bg-green-100 text-green-700"
                                : room.status === "ongoing"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {room.status === "open"
                              ? "Mở"
                              : room.status === "ongoing"
                              ? "Đang chơi"
                              : "Đóng"}
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold ${
                              room.players?.length >= 10
                                ? "bg-red-100 text-red-600"
                                : "bg-green-100 text-green-600"
                            }`}
                          >
                            {room.players?.length || 0}/10
                          </span>
                        </div>
                      </div>
                      {/* Teams display */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        {room.team1 && room.team1.length > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded p-2">
                            <div className="font-semibold text-blue-700 text-xs mb-1">
                              Đội 1 ({room.team1.length}/5)
                            </div>
                            <div className="space-y-0.5">
                              {room.team1.map((player: any) => (
                                <div
                                  key={player._id}
                                  className="flex items-center gap-2"
                                >
                                  <img
                                    src={
                                      player.avatarUrl ||
                                      "https://placehold.co/24x24"
                                    }
                                    alt=""
                                    className="w-5 h-5 rounded-full shrink-0"
                                  />
                                  <span className="text-xs text-gray-700 truncate">
                                    {player.ingameName || player.username}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {room.team2 && room.team2.length > 0 && (
                          <div className="bg-red-50 border border-red-200 rounded p-2">
                            <div className="font-semibold text-red-700 text-xs mb-1">
                              Đội 2 ({room.team2.length}/5)
                            </div>
                            <div className="space-y-0.5">
                              {room.team2.map((player: any) => (
                                <div
                                  key={player._id}
                                  className="flex items-center gap-2"
                                >
                                  <img
                                    src={
                                      player.avatarUrl ||
                                      "https://placehold.co/24x24"
                                    }
                                    alt=""
                                    className="w-5 h-5 rounded-full shrink-0"
                                  />
                                  <span className="text-xs text-gray-700 truncate">
                                    {player.ingameName || player.username}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {activeTab === "matches" && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-3 sm:p-4 md:p-6 shadow-md">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 md:mb-4 text-indigo-700">
            📋 Danh Sách Đấu
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Tổng hợp tất cả các phòng đấu. Ấn "Coi" để xem danh sách thành viên.
          </p>

          {/* All rooms list */}
          {(() => {
            const newsRoomIds = roomsByNews.flatMap((nr: any) =>
              nr.rooms.map((r: any) => r._id)
            );
            const manualRooms = customs.filter(
              (c: any) => !newsRoomIds.includes(c._id)
            );
            const allNewsRooms = roomsByNews.flatMap((nr: any) =>
              nr.rooms.map((r: any) => ({ ...r, newsTitle: nr.newsTitle }))
            );
            const allRooms = [...allNewsRooms, ...manualRooms];

            if (allRooms.length === 0) {
              return (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Chưa có phòng đấu nào.
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {allRooms.map((room: any) => (
                  <div
                    key={room._id}
                    className="bg-gray-50 rounded-lg border-2 border-gray-200 p-3 hover:bg-gray-100 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">
                          {room.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {room.newsTitle && (
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                              📰 {room.newsTitle}
                            </span>
                          )}
                          {!room.newsTitle && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                              🎮 Tạo tay
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            🕒{" "}
                            {new Date(room.scheduleTime).toLocaleString(
                              "vi-VN"
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedRoomForParticipants(room);
                            setShowRoomParticipantsModal(true);
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
                        >
                          👁️ Coi
                        </button>
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            room.status === "open"
                              ? "bg-green-100 text-green-700"
                              : room.status === "ongoing"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {room.status === "open"
                            ? "Mở"
                            : room.status === "ongoing"
                            ? "Đang chơi"
                            : "Đóng"}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            room.players?.length >= 10
                              ? "bg-red-100 text-red-600"
                              : "bg-green-100 text-green-600"
                          }`}
                        >
                          {room.players?.length || 0}/10
                        </span>
                      </div>
                    </div>
                    {/* Teams summary */}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="text-xs text-blue-700">
                        🔵 Đội 1: {room.team1?.length || 0}/5
                      </div>
                      <div className="text-xs text-red-700">
                        🔴 Đội 2: {room.team2?.length || 0}/5
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Auto Create Modal */}
      {showAutoCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Tạo phòng tự động
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Chế độ chơi
                </label>
                <select
                  value={autoCreateForm.gameMode}
                  onChange={(e) =>
                    setAutoCreateForm({
                      ...autoCreateForm,
                      gameMode: e.target.value,
                    })
                  }
                  className="w-full p-3 text-sm bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                >
                  <option value="5vs5">🗺️ 5vs5 - Summoner's Rift</option>
                  <option value="aram">🌉 ARAM - Howling Abyss</option>
                  <option value="draft">🏆 Giải đấu cấm chọn</option>
                  <option value="minigame">🎮 Minigame</option>
                </select>
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Số trận (Best of)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={autoCreateForm.bestOf}
                  onChange={(e) =>
                    setAutoCreateForm({
                      ...autoCreateForm,
                      bestOf: Number(e.target.value),
                    })
                  }
                  className="w-full p-3 text-sm bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Số trận cần thắng (1-10)
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAutoCreate}
                  className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold"
                >
                  Tạo phòng
                </button>
                <button
                  onClick={() => {
                    setShowAutoCreateModal(false);
                    setSelectedNewsId(null);
                  }}
                  className="flex-1 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Custom Modal */}
      {showDeleteCustomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-red-600 mb-4">
              ⚠️ Xác nhận xóa Custom
            </h3>
            <p className="text-gray-700 mb-6">
              Bạn có chắc muốn xóa custom game này? Hành động này không thể hoàn
              tác.
            </p>
            <div className="flex gap-3">
              <button
                onClick={deleteCustom}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
              >
                Xóa
              </button>
              <button
                onClick={() => {
                  setShowDeleteCustomModal(false);
                  setCustomToDelete(null);
                }}
                className="flex-1 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold transition"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Report Modal */}
      {showViewReportModal && reportToView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full">
            <h3 className="text-xl font-bold text-orange-600 mb-4">
              📋 Chi tiết báo cáo
            </h3>
            <div className="space-y-3 mb-6">
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Nội dung:
                </label>
                <p className="text-gray-800 bg-gray-50 p-3 rounded-lg mt-1">
                  {reportToView.content}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Trạng thái:
                </label>
                <p className="mt-1">
                  <span className="px-3 py-1 rounded text-sm font-semibold bg-amber-100 text-amber-800">
                    {reportToView.status}
                  </span>
                </p>
              </div>
              {reportToView.createdAt && (
                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Thời gian:
                  </label>
                  <p className="text-gray-600 text-sm mt-1">
                    {new Date(reportToView.createdAt).toLocaleString("vi-VN")}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setShowViewReportModal(false);
                setReportToView(null);
              }}
              className="w-full py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold transition"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Delete Report Modal */}
      {showDeleteReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-red-600 mb-4">
              ⚠️ Xác nhận xóa báo cáo
            </h3>
            <p className="text-gray-700 mb-6">
              Bạn có chắc muốn xóa báo cáo này? Hành động này không thể hoàn
              tác.
            </p>
            <div className="flex gap-3">
              <button
                onClick={deleteReport}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
              >
                Xóa
              </button>
              <button
                onClick={() => {
                  setShowDeleteReportModal(false);
                  setReportToDelete(null);
                }}
                className="flex-1 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold transition"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registration List Modal */}
      {showRegistrationListModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-teal-800">
                📋 Danh sách đăng ký
              </h3>
              <button
                onClick={() => {
                  setShowAddMemberModal(true);
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm"
              >
                ➕ Thêm thành viên
              </button>
            </div>

            {loadingRegistrations ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                <p className="text-gray-600 mt-2">Đang tải...</p>
              </div>
            ) : registrationList.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Chưa có đăng ký nào
              </div>
            ) : (
              <div className="space-y-2">
                {registrationList.map((reg) => (
                  <div
                    key={reg._id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          reg.user?.avatarUrl || "https://placehold.co/40x40"
                        }
                        alt={reg.user?.username}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <div className="font-semibold text-gray-900">
                          {reg.user?.username}
                        </div>
                        <div className="text-xs text-gray-600">
                          {reg.ingameName} • {reg.lane} • {reg.rank}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          reg.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : reg.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : reg.status === "assigned"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {reg.status === "pending"
                          ? "Chờ duyệt"
                          : reg.status === "approved"
                          ? "Đã duyệt"
                          : reg.status === "assigned"
                          ? "Đã xếp phòng"
                          : "Từ chối"}
                      </span>
                      <button
                        onClick={() => deleteRegistration(reg._id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowRegistrationListModal(false);
                  setSelectedNewsForRegistrations(null);
                  setRegistrationList([]);
                }}
                className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member to Registration Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-green-600 mb-4">
              ➕ Thêm thành viên vào danh sách
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Chọn nhiều thành viên để thêm vào danh sách đăng ký (có thể chọn
              nhiều)
            </p>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Tìm kiếm theo tên..."
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              className="w-full p-3 mb-4 text-sm rounded-lg border-2 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200"
            />

            {/* Selected Count */}
            {selectedMembersToAdd.length > 0 && (
              <div className="mb-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-sm font-semibold text-green-700">
                  Đã chọn {selectedMembersToAdd.length} thành viên
                </span>
              </div>
            )}

            <div className="space-y-2 mb-6">
              {allMembersForAdd
                .filter((m) => {
                  // Filter out members already registered
                  const isRegistered = registrationList.some(
                    (reg) => reg.user?._id === m._id
                  );
                  // Filter by search query
                  const matchesSearch = memberSearchQuery
                    ? m.username
                        .toLowerCase()
                        .includes(memberSearchQuery.toLowerCase()) ||
                      m.ingameName
                        ?.toLowerCase()
                        .includes(memberSearchQuery.toLowerCase())
                    : true;
                  return !isRegistered && matchesSearch;
                })
                .map((member) => (
                  <button
                    key={member._id}
                    onClick={() => {
                      setSelectedMembersToAdd((prev) =>
                        prev.includes(member._id)
                          ? prev.filter((id) => id !== member._id)
                          : [...prev, member._id]
                      );
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition ${
                      selectedMembersToAdd.includes(member._id)
                        ? "bg-green-50 border-green-500"
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
                    {selectedMembersToAdd.includes(member._id) && (
                      <span className="text-green-600 font-bold">✓</span>
                    )}
                  </button>
                ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={addMemberToRegistration}
                disabled={selectedMembersToAdd.length === 0}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition"
              >
                Thêm ({selectedMembersToAdd.length})
              </button>
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setSelectedMembersToAdd([]);
                  setMemberSearchQuery("");
                }}
                className="flex-1 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold transition"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room Participants Modal */}
      {showRoomParticipantsModal && selectedRoomForParticipants && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-indigo-700">
                📋 Danh sách thành viên
              </h3>
              <button
                onClick={() => {
                  setShowRoomParticipantsModal(false);
                  setSelectedRoomForParticipants(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Room Info */}
            <div className="bg-indigo-50 rounded-lg p-3 mb-4 border border-indigo-200">
              <h4 className="font-bold text-indigo-800">
                {selectedRoomForParticipants.title}
              </h4>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-sm">
                {selectedRoomForParticipants.newsTitle && (
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                    📰 {selectedRoomForParticipants.newsTitle}
                  </span>
                )}
                {!selectedRoomForParticipants.newsTitle && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                    🎮 Tạo tay
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  🕒{" "}
                  {new Date(
                    selectedRoomForParticipants.scheduleTime
                  ).toLocaleString("vi-VN")}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-bold ${
                    selectedRoomForParticipants.status === "open"
                      ? "bg-green-100 text-green-700"
                      : selectedRoomForParticipants.status === "ongoing"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {selectedRoomForParticipants.status === "open"
                    ? "Mở"
                    : selectedRoomForParticipants.status === "ongoing"
                    ? "Đang chơi"
                    : "Đóng"}
                </span>
              </div>
            </div>

            {/* Teams */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Team 1 */}
              <div className="bg-blue-50 rounded-lg border-2 border-blue-200 p-4">
                <h5 className="font-bold text-blue-700 mb-3 flex items-center gap-2 text-lg">
                  🔵 Đội 1{" "}
                  <span className="text-sm font-normal">
                    ({selectedRoomForParticipants.team1?.length || 0}/5)
                  </span>
                </h5>
                {selectedRoomForParticipants.team1 &&
                selectedRoomForParticipants.team1.length > 0 ? (
                  <div className="space-y-2">
                    {selectedRoomForParticipants.team1.map(
                      (player: any, index: number) => (
                        <div
                          key={player._id}
                          className="flex items-center gap-3 bg-white rounded-lg p-3 border border-blue-100 shadow-sm"
                        >
                          <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                            {index + 1}
                          </span>
                          <img
                            src={
                              player.avatarUrl || "https://placehold.co/40x40"
                            }
                            alt=""
                            className="w-10 h-10 rounded-full border-2 border-blue-300 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">
                              {player.ingameName || player.username}
                            </p>
                            <p className="text-xs text-gray-500">
                              {player.lane || "N/A"} • {player.rank || "N/A"}
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-6">
                    Chưa có người chơi
                  </p>
                )}
              </div>

              {/* Team 2 */}
              <div className="bg-red-50 rounded-lg border-2 border-red-200 p-4">
                <h5 className="font-bold text-red-700 mb-3 flex items-center gap-2 text-lg">
                  🔴 Đội 2{" "}
                  <span className="text-sm font-normal">
                    ({selectedRoomForParticipants.team2?.length || 0}/5)
                  </span>
                </h5>
                {selectedRoomForParticipants.team2 &&
                selectedRoomForParticipants.team2.length > 0 ? (
                  <div className="space-y-2">
                    {selectedRoomForParticipants.team2.map(
                      (player: any, index: number) => (
                        <div
                          key={player._id}
                          className="flex items-center gap-3 bg-white rounded-lg p-3 border border-red-100 shadow-sm"
                        >
                          <span className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                            {index + 1}
                          </span>
                          <img
                            src={
                              player.avatarUrl || "https://placehold.co/40x40"
                            }
                            alt=""
                            className="w-10 h-10 rounded-full border-2 border-red-300 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">
                              {player.ingameName || player.username}
                            </p>
                            <p className="text-xs text-gray-500">
                              {player.lane || "N/A"} • {player.rank || "N/A"}
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-6">
                    Chưa có người chơi
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <Link
                to={`/customs/${selectedRoomForParticipants._id}`}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-center transition"
              >
                👁️ Xem chi tiết phòng
              </Link>
              <button
                onClick={() => {
                  setShowRoomParticipantsModal(false);
                  setSelectedRoomForParticipants(null);
                }}
                className="flex-1 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
