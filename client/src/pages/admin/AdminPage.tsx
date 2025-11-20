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

type Tab = "overview" | "members" | "customs" | "news" | "reports" | "rooms";

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
  const [selectedMemberToAdd, setSelectedMemberToAdd] = useState<string | null>(
    null
  );

  // Check permission - only leader can access AdminPage
  useEffect(() => {
    if (!user || user.role !== "leader") {
      toast.error("Chỉ Trưởng Clan mới có quyền truy cập trang này");
      navigate("/");
    }
  }, [user, navigate]);

  useEffect(() => {
    loadAllMembers();
  }, []);

  useEffect(() => {
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
        });
      })
      .catch(() => {});
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
    if (!selectedMemberToAdd || !selectedNewsForRegistrations) return;
    try {
      await http.post("/registrations", {
        news: selectedNewsForRegistrations,
        user: selectedMemberToAdd,
        ingameName: "Manual Add",
        lane: "Giữa",
        rank: "Vàng",
      });
      toast.success("Đã thêm thành viên");
      setShowAddMemberModal(false);
      setSelectedMemberToAdd(null);
      loadRegistrationList(selectedNewsForRegistrations);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi thêm thành viên");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-3 md:p-6">
      <h1 className="text-xl md:text-3xl lg:text-4xl font-extrabold mb-3 md:mb-6 bg-linear-to-r from-fuchsia-500 via-rose-500 to-amber-400 bg-clip-text text-transparent">
        Admin Dashboard
      </h1>

      {/* Stat Cards - Clickable */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4 mb-3 md:mb-8">
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
          <div className="bg-white rounded-xl border-2 border-gray-200 p-4 sm:p-5 md:p-6 shadow-md">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-indigo-600">
              Biểu đồ tổng quan
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Members by Role Chart */}
              <div className="bg-linear-to-br from-emerald-50 to-teal-50 rounded-xl p-5 border-2 border-emerald-200">
                <h3 className="text-lg font-bold mb-4 text-emerald-700 flex items-center gap-2">
                  👥 Thành viên theo Role
                </h3>
                <div className="h-64 flex items-end justify-around gap-4 px-2">
                  {[
                    {
                      role: "Leader",
                      count: members.filter((m: any) => m.role === "leader")
                        .length,
                      color: "bg-gradient-to-t from-red-500 to-red-400",
                      shadowColor: "shadow-red-300",
                    },
                    {
                      role: "Organizer",
                      count: members.filter((m: any) => m.role === "organizer")
                        .length,
                      color: "bg-gradient-to-t from-blue-500 to-blue-400",
                      shadowColor: "shadow-blue-300",
                    },
                    {
                      role: "Moderator",
                      count: members.filter((m: any) => m.role === "moderator")
                        .length,
                      color: "bg-gradient-to-t from-purple-500 to-purple-400",
                      shadowColor: "shadow-purple-300",
                    },
                    {
                      role: "Member",
                      count: members.filter((m: any) => m.role === "member")
                        .length,
                      color: "bg-gradient-to-t from-gray-500 to-gray-400",
                      shadowColor: "shadow-gray-300",
                    },
                  ].map((item) => {
                    const heightPercent = Math.max(
                      (item.count / Math.max(members.length, 1)) * 100,
                      8
                    );
                    return (
                      <div
                        key={item.role}
                        className="flex-1 flex flex-col items-center group"
                      >
                        <div className="relative w-full flex flex-col items-center">
                          {/* Value label on top */}
                          <div className="mb-2 px-3 py-1 bg-white rounded-full shadow-md border-2 border-gray-200 group-hover:scale-110 transition-transform">
                            <span className="text-lg font-extrabold text-gray-800">
                              {item.count}
                            </span>
                          </div>
                          {/* Bar */}
                          <div
                            className={`w-full ${item.color} rounded-t-xl ${item.shadowColor} shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105`}
                            style={{
                              height: `${heightPercent}%`,
                              minHeight: "20px",
                            }}
                          />
                        </div>
                        {/* Label */}
                        <p className="text-xs md:text-sm font-bold mt-3 text-gray-700 text-center">
                          {item.role}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reports Status Chart */}
              <div className="bg-linear-to-br from-orange-50 to-amber-50 rounded-xl p-5 border-2 border-orange-200">
                <h3 className="text-lg font-bold mb-4 text-orange-700 flex items-center gap-2">
                  📋 Trạng thái báo cáo
                </h3>
                <div className="h-64 flex items-end justify-around gap-8 px-4">
                  {[
                    {
                      status: "Pending",
                      count: reports.filter((r: any) => r.status === "pending")
                        .length,
                      color: "bg-gradient-to-t from-yellow-500 to-yellow-400",
                      shadowColor: "shadow-yellow-300",
                      icon: "⏳",
                    },
                    {
                      status: "Reviewed",
                      count: reports.filter((r: any) => r.status === "reviewed")
                        .length,
                      color: "bg-gradient-to-t from-green-500 to-green-400",
                      shadowColor: "shadow-green-300",
                      icon: "✅",
                    },
                  ].map((item) => {
                    const maxCount = Math.max(
                      reports.filter((r: any) => r.status === "pending").length,
                      reports.filter((r: any) => r.status === "reviewed")
                        .length,
                      1
                    );
                    const heightPercent = Math.max(
                      (item.count / maxCount) * 100,
                      10
                    );
                    return (
                      <div
                        key={item.status}
                        className="flex-1 max-w-[120px] flex flex-col items-center group"
                      >
                        <div className="relative w-full flex flex-col items-center">
                          {/* Value label on top */}
                          <div className="mb-2 px-4 py-1.5 bg-white rounded-full shadow-md border-2 border-gray-200 group-hover:scale-110 transition-transform">
                            <span className="text-xl font-extrabold text-gray-800">
                              {item.count}
                            </span>
                          </div>
                          {/* Bar */}
                          <div
                            className={`w-full ${item.color} rounded-t-xl ${item.shadowColor} shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105 relative`}
                            style={{
                              height: `${heightPercent}%`,
                              minHeight: "30px",
                            }}
                          >
                            {/* Icon inside bar */}
                            <div className="absolute inset-0 flex items-center justify-center text-2xl opacity-80">
                              {item.icon}
                            </div>
                          </div>
                        </div>
                        {/* Label */}
                        <p className="text-sm md:text-base font-bold mt-3 text-gray-700 text-center">
                          {item.status}
                        </p>
                      </div>
                    );
                  })}
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
                            <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded border border-gray-300">
                              123456
                            </span>
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
              Chọn thành viên để thêm vào danh sách đăng ký
            </p>
            <div className="space-y-2 mb-6">
              {allMembersForAdd
                .filter((m) => {
                  // Filter out members already registered
                  return !registrationList.some(
                    (reg) => reg.user?._id === m._id
                  );
                })
                .map((member) => (
                  <button
                    key={member._id}
                    onClick={() => setSelectedMemberToAdd(member._id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition ${
                      selectedMemberToAdd === member._id
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
                    {selectedMemberToAdd === member._id && (
                      <span className="text-green-600 font-bold">✓</span>
                    )}
                  </button>
                ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={addMemberToRegistration}
                disabled={!selectedMemberToAdd}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition"
              >
                Thêm
              </button>
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setSelectedMemberToAdd(null);
                }}
                className="flex-1 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold transition"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
