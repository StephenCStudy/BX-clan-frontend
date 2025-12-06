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
  team1?: any[];
  team2?: any[];
}

interface Registration {
  _id: string;
  news: string;
  user: any;
  status: string;
}

export default function RegistrationPage() {
  const [activeTab, setActiveTab] = useState<"news" | "rooms">("news");
  const [newsItems, setNewsItems] = useState<News[]>([]);
  const [customRooms, setCustomRooms] = useState<CustomRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRegistrations, setMyRegistrations] = useState<Registration[]>([]);
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
      const roomCreationNews = (newsRes.data.items || newsRes.data).filter(
        (n: News) => n.type === "room-creation"
      );
      setNewsItems(roomCreationNews);

      // Load open custom rooms
      const roomsRes = await http.get("/customs", { params: { limit: 100 } });
      const rooms = roomsRes.data.items || roomsRes.data;
      const openRooms = rooms.filter(
        (r: CustomRoom) => r.status === "open"
      );
      setCustomRooms(openRooms);

      // Load user's registrations to check what they've already registered for
      if (user) {
        const regRes = await http.get("/registrations/my");
        setMyRegistrations(regRes.data || []);
      }
    } catch (err) {
      console.error("Error loading data:", err);
      toast.error("Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  // Check if user has already registered for a news
  const hasRegisteredForNews = (newsId: string) => {
    return myRegistrations.some((reg) => reg.news === newsId || (reg.news as any)?._id === newsId);
  };

  // Check if user is already in a room
  const isInRoom = (room: CustomRoom) => {
    const allPlayers = [
      ...(room.players || []),
      ...(room.team1 || []),
      ...(room.team2 || []),
    ];
    return allPlayers.some((p: any) => 
      p._id === user?._id || p === user?._id
    );
  };

  // Check if room is full
  const isRoomFull = (room: CustomRoom) => {
    const totalPlayers = (room.team1?.length || 0) + (room.team2?.length || 0) + (room.players?.length || 0);
    return totalPlayers >= room.maxPlayers;
  };

  // Get room status text
  const getRoomStatusText = (room: CustomRoom) => {
    if (isInRoom(room)) return "Đã tham gia";
    if (isRoomFull(room)) return "Đã đầy";
    return null;
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
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6">
      <h1 className="text-2xl md:text-4xl font-bold text-red-600 mb-6 flex items-center gap-2">
        <i className="fa-solid fa-pen-to-square"></i> Đăng ký tham gia
      </h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b-2 border-gray-200">
        <button
          onClick={() => setActiveTab("news")}
          className={`px-6 py-3 font-semibold transition-all flex items-center gap-2 ${
            activeTab === "news"
              ? "text-red-600 border-b-4 border-red-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <i className="fa-solid fa-newspaper"></i> Tin tức tạo phòng (
          {newsItems.length})
        </button>
        <button
          onClick={() => setActiveTab("rooms")}
          className={`px-6 py-3 font-semibold transition-all flex items-center gap-2 ${
            activeTab === "rooms"
              ? "text-red-600 border-b-4 border-red-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <i className="fa-solid fa-house"></i> Phòng đang mở (
          {customRooms.length})
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
            newsItems.map((news) => {
              const alreadyRegistered = hasRegisteredForNews(news._id);
              return (
                <div
                  key={news._id}
                  className={`bg-white rounded-xl border-2 p-5 transition ${
                    alreadyRegistered
                      ? "border-green-300 bg-green-50"
                      : "border-gray-200 hover:border-red-500 hover:shadow-lg"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">
                          {news.title}
                        </h3>
                        {alreadyRegistered && (
                          <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full font-bold">
                            ĐÃ ĐĂNG KÝ
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 mb-3 line-clamp-3">
                        {news.content}
                      </p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <i className="fa-regular fa-calendar"></i>{" "}
                        {new Date(news.createdAt).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                    <button
                      onClick={() => registerForNews(news._id)}
                      disabled={alreadyRegistered}
                      className={`px-6 py-3 rounded-lg font-semibold shadow-md transition whitespace-nowrap flex items-center gap-2 ${
                        alreadyRegistered
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-red-600 hover:bg-red-700 text-white"
                      }`}
                    >
                      {alreadyRegistered ? (
                        <>
                          <i className="fa-solid fa-check"></i> Đã đăng ký
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-pen-to-square"></i> Đăng ký ngay
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
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
            customRooms.map((room) => {
              const statusText = getRoomStatusText(room);
              const isDisabled = !!statusText;
              const totalPlayers = (room.team1?.length || 0) + (room.team2?.length || 0) + (room.players?.length || 0);
              
              return (
                <div
                  key={room._id}
                  className={`bg-white rounded-xl border-2 p-5 transition ${
                    isInRoom(room)
                      ? "border-green-300 bg-green-50"
                      : isRoomFull(room)
                      ? "border-red-300 bg-red-50"
                      : "border-gray-200 hover:border-blue-500 hover:shadow-lg"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {room.title}
                      </h3>
                      {isInRoom(room) && (
                        <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full font-bold">
                          ĐÃ THAM GIA
                        </span>
                      )}
                      {isRoomFull(room) && !isInRoom(room) && (
                        <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full font-bold">
                          ĐÃ ĐẦY
                        </span>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      isRoomFull(room)
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }`}>
                      {totalPlayers}/{room.maxPlayers}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {room.description || "Không có mô tả"}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <i className="fa-regular fa-clock"></i>{" "}
                      {new Date(room.scheduleTime).toLocaleString("vi-VN")}
                    </p>
                    <button
                      onClick={() => registerForRoom(room._id)}
                      disabled={isDisabled}
                      className={`px-4 py-2 rounded-lg font-semibold shadow-md transition flex items-center gap-2 ${
                        isDisabled
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      {isInRoom(room) ? (
                        <>
                          <i className="fa-solid fa-eye"></i> Xem phòng
                        </>
                      ) : isRoomFull(room) ? (
                        <>
                          <i className="fa-solid fa-ban"></i> Đã đầy
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-plus"></i> Tham gia
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
