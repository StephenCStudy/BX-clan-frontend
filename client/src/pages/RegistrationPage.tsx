import { useEffect, useState } from "react";
import { http } from "../utils/http";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

interface News {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
  type: string;
}

interface CustomRoom {
  _id: string;
  title: string;
  description?: string;
  scheduleTime: string;
  maxPlayers: number;
  status: string;
  players?: any[];
}

export default function RegistrationPage() {
  const [activeTab, setActiveTab] = useState<"news" | "rooms">("news");
  const [newsItems, setNewsItems] = useState<News[]>([]);
  const [customRooms, setCustomRooms] = useState<CustomRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để đăng ký");
      navigate("/login");
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load news with type room-creation
      const newsRes = await http.get("/news");
      const roomCreationNews = newsRes.data.filter(
        (n: News) => n.type === "room-creation"
      );
      setNewsItems(roomCreationNews);

      // Load open custom rooms with available slots
      const roomsRes = await http.get("/customs");
      const openRooms = roomsRes.data.filter(
        (r: CustomRoom) =>
          r.status === "open" && (r.players?.length || 0) < r.maxPlayers
      );
      setCustomRooms(openRooms);
    } catch (err) {
      toast.error("Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const registerForNews = (newsId: string) => {
    navigate(`/news/${newsId}`);
  };

  const registerForRoom = (roomId: string) => {
    navigate(`/customs/${roomId}`);
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-600">Đang tải...</div>;
  }

  return (
    <div className="w-full max-w-screen-xl mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6">
      <h1 className="text-2xl md:text-4xl font-bold text-red-600 mb-6">
        📝 Đăng ký tham gia
      </h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b-2 border-gray-200">
        <button
          onClick={() => setActiveTab("news")}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === "news"
              ? "text-red-600 border-b-4 border-red-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          📰 Tin tức tạo phòng ({newsItems.length})
        </button>
        <button
          onClick={() => setActiveTab("rooms")}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === "rooms"
              ? "text-red-600 border-b-4 border-red-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          🏠 Phòng đang mở ({customRooms.length})
        </button>
      </div>

      {/* News Tab */}
      {activeTab === "news" && (
        <div className="space-y-4">
          {newsItems.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-gray-200">
              <p className="text-gray-500 text-lg">
                Hiện chưa có tin tức tuyển thành viên nào
              </p>
            </div>
          ) : (
            newsItems.map((news) => (
              <div
                key={news._id}
                className="bg-white rounded-xl border-2 border-gray-200 p-5 hover:border-red-500 hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {news.title}
                    </h3>
                    <p className="text-gray-700 mb-3 line-clamp-3">
                      {news.content}
                    </p>
                    <p className="text-sm text-gray-500">
                      📅 {new Date(news.createdAt).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  <button
                    onClick={() => registerForNews(news._id)}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold shadow-md transition whitespace-nowrap"
                  >
                    📝 Đăng ký ngay
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Rooms Tab */}
      {activeTab === "rooms" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {customRooms.length === 0 ? (
            <div className="col-span-2 text-center py-12 bg-gray-50 rounded-xl border-2 border-gray-200">
              <p className="text-gray-500 text-lg">
                Hiện không có phòng nào đang mở
              </p>
            </div>
          ) : (
            customRooms.map((room) => (
              <div
                key={room._id}
                className="bg-white rounded-xl border-2 border-gray-200 p-5 hover:border-blue-500 hover:shadow-lg transition"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-900">
                    {room.title}
                  </h3>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">
                    {room.players?.length || 0}/{room.maxPlayers}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {room.description || "Không có mô tả"}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    🕒 {new Date(room.scheduleTime).toLocaleString("vi-VN")}
                  </p>
                  <button
                    onClick={() => registerForRoom(room._id)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-md transition"
                  >
                    ➕ Tham gia
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
