import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

type Clan = { clanName: string; description?: string; bannerUrl?: string };
type News = { _id: string; title: string; content: string; createdAt: string };
type Notification = {
  _id: string;
  type: string;
  title: string;
  message: string;
  relatedCustomRoom?: { _id: string };
  relatedRoom?: { _id: string };
  relatedNews?: { _id: string; title: string };
  isRead: boolean;
  createdAt: string;
};
type PrivateMessage = {
  _id: string;
  from: { _id: string; username: string; avatarUrl?: string };
  to: { _id: string; username: string };
  message: string;
  isRead: boolean;
  createdAt: string;
};

export default function HomePage() {
  const [clan, setClan] = useState<Clan | null>(null);
  const { user } = useAuth();
  const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const [news, setNews] = useState<News[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/clan`);
        setClan(res.data);
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/news`);
        const items: News[] = res.data || [];
        items.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setNews(items);
      } catch {
        setNews([]);
      }
    })();
  }, []);

  useEffect(() => {
    // Load notifications và private messages chỉ khi đã đăng nhập
    (async () => {
      if (!user) {
        setNotifications([]);
        setPrivateMessages([]);
        setLoadingNotifications(false);
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const notifRes = await axios.get(`${API}/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const sortedNotifs = [...(notifRes.data || [])].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setNotifications(sortedNotifs);

        const pmRes = await axios.get(`${API}/private-messages/unread`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const sortedPMs = [...(pmRes.data || [])].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setPrivateMessages(sortedPMs);
      } catch (err) {
        console.error("Error loading notifications:", err);
        setNotifications([]);
        setPrivateMessages([]);
      } finally {
        setLoadingNotifications(false);
      }
    })();
  }, [user, API]);

  return (
    <div className="bg-white min-h-screen gpu-accelerated">
      <section className="relative overflow-hidden bg-linear-to-br from-red-600 via-red-700 to-gray-900 text-white animate-fade-in">
        <div className="absolute inset-0 opacity-10">
          <img
            src="https://cmsassets.rgpub.io/sanity/images/dsfx7636/news_live/3705653167ef8f43acdc03fb2f0a469d5b3086fd-1920x1080.jpg"
            alt="banner"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-8 animate-fade-in-down">
            <h1 className="text-4xl md:text-6xl font-extrabold mb-4 drop-shadow-lg text-white! animate-scale-in">
              {clan?.clanName || "BX Clan"}
            </h1>
            <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto animate-fade-in-up">
              {clan?.description ||
                "Clan Tốc Chiến • Tốc độ – Chiến thắng – Đoàn kết"}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 mb-12 animate-fade-in-up">
            <Link
              to={user ? "/customs" : "/register"}
              className="px-6 py-3 rounded-lg bg-white text-red-600 hover:bg-gray-100 text-base md:text-lg font-bold transition-smooth shadow-xl hover:shadow-2xl hover-lift gpu-accelerated animate-pulse"
            >
              {user ? "⚔️ Xem Custom Games" : "🎮 Tham gia ngay"}
            </Link>
            <Link
              to="/members"
              className="px-6 py-3 rounded-lg bg-black/30 backdrop-blur-sm border-2 border-white/50 hover:bg-black/50 text-white text-base md:text-lg font-bold transition-smooth shadow-xl hover:shadow-2xl hover-lift gpu-accelerated"
            >
              👥 Thành viên
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-center hover-lift transition-smooth stagger-item gpu-accelerated">
              <div className="text-3xl mb-2 animate-bounce">⚡</div>
              <h3 className="font-bold text-lg mb-1 text-white!">Tốc Độ</h3>
              <p className="text-sm text-white/80">
                Phản ứng nhanh, hành động quyết đoán
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-center hover-lift transition-smooth stagger-item gpu-accelerated">
              <div className="text-3xl mb-2 animate-pulse">🏆</div>
              <h3 className="font-bold text-lg mb-1 text-white!">
                Chiến Thắng
              </h3>
              <p className="text-sm text-white/80">
                Luôn hướng đến mục tiêu cao nhất
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-center hover-lift transition-smooth stagger-item gpu-accelerated">
              <div className="text-3xl mb-2 animate-swing">🤝</div>
              <h3 className="font-bold text-lg mb-1 text-white!">Đoàn Kết</h3>
              <p className="text-sm text-white/80">
                Cùng nhau phát triển và thành công
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="w-full max-w-screen-xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up">
          <div className="bg-linear-to-br from-red-50 to-white rounded-2xl border-2 border-red-200 p-6 shadow-lg hover-lift transition-smooth gpu-accelerated">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-red-600 flex items-center gap-2 animate-fade-in-left">
                <span className="hover-grow inline-block">📊</span> Tổng Quan
                Clan
              </h2>
            </div>
            <div className="space-y-4">
              <Link
                to="/members"
                className="block bg-white rounded-xl p-4 border-2 border-gray-200 hover:border-red-400 hover:shadow-md transition-smooth hover-lift gpu-accelerated group stagger-item"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      Thành Viên
                    </h3>
                    <p className="text-sm text-gray-600">
                      Xem danh sách và thông tin thành viên
                    </p>
                  </div>
                  <span className="text-red-600 text-2xl group-hover:translate-x-1 transition-smooth">
                    →
                  </span>
                </div>
              </Link>
              <Link
                to="/customs"
                className="block bg-white rounded-xl p-4 border-2 border-gray-200 hover:border-red-400 hover:shadow-md transition-smooth hover-lift gpu-accelerated group stagger-item"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      Custom Games
                    </h3>
                    <p className="text-sm text-gray-600">
                      Tham gia các trận đấu của clan
                    </p>
                  </div>
                  <span className="text-red-600 text-2xl group-hover:translate-x-1 transition-smooth">
                    →
                  </span>
                </div>
              </Link>
              {user && (
                <Link
                  to="/profile"
                  className="block bg-white rounded-xl p-4 border-2 border-gray-200 hover:border-red-400 hover:shadow-md transition-smooth hover-lift gpu-accelerated group stagger-item"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        Hồ Sơ Của Tôi
                      </h3>
                      <p className="text-sm text-gray-600">
                        Quản lý thông tin cá nhân
                      </p>
                    </div>
                    <span className="text-red-600 text-2xl group-hover:translate-x-1 transition-smooth">
                      →
                    </span>
                  </div>
                </Link>
              )}
            </div>
          </div>

          <div className="bg-linear-to-br from-blue-50 to-white rounded-2xl border-2 border-blue-200 p-6 shadow-lg hover-lift transition-smooth gpu-accelerated">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-blue-600 flex items-center gap-2 animate-fade-in-right">
                <span className="animate-swing inline-block">📢</span> Thông Báo
              </h2>
              <Link
                to="/news"
                className="px-3 py-1 rounded-lg border-2 border-blue-600 text-blue-600 hover:bg-blue-50 text-xs font-semibold transition-smooth hover-lift gpu-accelerated"
              >
                Xem tất cả
              </Link>
            </div>

            {loadingNotifications ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 rounded-xl border-2 border-gray-200 skeleton"
                  />
                ))}
              </div>
            ) : notifications.length === 0 &&
              privateMessages.length === 0 &&
              news.length === 0 ? (
              <div className="text-center py-8 text-gray-500 animate-fade-in">
                <div className="text-4xl mb-2 animate-swing">📭</div>
                <p>Chưa có thông báo nào</p>
                {!user && (
                  <Link
                    to="/login"
                    className="inline-block mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-smooth hover-lift gpu-accelerated"
                  >
                    Đăng nhập để xem thêm
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {notifications.map((notif, idx) => {
                  const getNotificationIcon = () => {
                    if (notif.type === "custom-invite") return "💌";
                    if (notif.type === "room-assignment") return "🎮";
                    if (notif.type === "registration-confirmed") return "✅";
                    return "📢";
                  };

                  const getNotificationLink = () => {
                    // For room-assignment type, always go to customs page
                    if (notif.type === "room-assignment") {
                      if (notif.relatedCustomRoom) {
                        return `/customs/${notif.relatedCustomRoom._id}`;
                      }
                      // Fallback to customs list if no specific room ID
                      return `/customs`;
                    }
                    // For custom-invite type, go to customs page
                    if (notif.type === "custom-invite") {
                      if (notif.relatedCustomRoom) {
                        return `/customs/${notif.relatedCustomRoom._id}`;
                      }
                      return `/customs`;
                    }
                    if (notif.relatedCustomRoom) {
                      return `/customs/${notif.relatedCustomRoom._id}`;
                    }
                    if (notif.relatedRoom) {
                      return `/customs/${notif.relatedRoom._id}`;
                    }
                    if (notif.relatedNews) {
                      return `/news/${notif.relatedNews._id}`;
                    }
                    return "#";
                  };

                  const isClickable =
                    notif.type === "room-assignment" ||
                    notif.type === "custom-invite" ||
                    notif.relatedCustomRoom ||
                    notif.relatedRoom ||
                    notif.relatedNews;

                  const baseClasses =
                    "rounded-xl p-3 border-2 transition-smooth hover-lift gpu-accelerated stagger-item";
                  const stateClasses = notif.isRead
                    ? "bg-white border-gray-200"
                    : "bg-yellow-50 border-yellow-300";

                  const content = (
                    <div className="flex items-start gap-2">
                      <span className="text-2xl shrink-0 hover-grow inline-block">
                        {getNotificationIcon()}
                      </span>
                      {idx === 0 && !notif.isRead && (
                        <span className="shrink-0 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-600 border border-red-200 animate-pulse">
                          MỚI
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-gray-900 line-clamp-1 group-hover:text-blue-600">
                          {notif.title}
                        </h3>
                        <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                          {notif.message}
                        </p>
                        <span className="text-xs text-gray-500 mt-1 block">
                          {new Date(notif.createdAt).toLocaleDateString(
                            "vi-VN"
                          )}
                        </span>
                      </div>
                      <span className="shrink-0 text-blue-600 group-hover:translate-x-0.5 transition-smooth">
                        →
                      </span>
                    </div>
                  );

                  return isClickable ? (
                    <Link
                      key={notif._id}
                      to={getNotificationLink()}
                      className={`block ${baseClasses} ${stateClasses} hover:border-blue-400 hover:shadow-md group`}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div
                      key={notif._id}
                      className={`${baseClasses} ${stateClasses}`}
                    >
                      {content}
                    </div>
                  );
                })}

                {privateMessages.slice(0, 3).map((pm, idx) => (
                  <Link
                    key={pm._id}
                    to="/profile"
                    className="block rounded-xl p-3 border-2 border-yellow-300 bg-yellow-50 hover:border-blue-400 hover:shadow-md transition-smooth hover-lift gpu-accelerated stagger-item group"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-2xl shrink-0 hover-swing inline-block">
                        💬
                      </span>
                      {idx === 0 && (
                        <span className="shrink-0 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-600 border border-red-200 animate-pulse">
                          MỚI
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-gray-900 line-clamp-1 group-hover:text-blue-600">
                          Tin nhắn từ {pm.from.username}
                        </h3>
                        <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                          {pm.message}
                        </p>
                        <span className="text-xs text-gray-500 mt-1 block">
                          {new Date(pm.createdAt).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                      <span className="shrink-0 text-blue-600 group-hover:translate-x-0.5 transition-smooth">
                        →
                      </span>
                    </div>
                  </Link>
                ))}

                {news.slice(0, 3).map((n, idx) => (
                  <Link
                    key={n._id}
                    to={`/news/${n._id}`}
                    className="block bg-white rounded-xl p-3 border-2 border-gray-200 hover:border-blue-400 hover:shadow-md transition-smooth hover-lift gpu-accelerated stagger-item group"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-2xl shrink-0 hover-grow inline-block">
                        📰
                      </span>
                      {idx === 0 && (
                        <span className="shrink-0 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-600 border border-red-200 animate-pulse">
                          MỚI
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-gray-900 line-clamp-1 group-hover:text-blue-600">
                          {n.title}
                        </h3>
                        <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                          {n.content}
                        </p>
                        <span className="text-xs text-gray-500 mt-1 block">
                          {new Date(n.createdAt).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                      <span className="shrink-0 text-blue-600 group-hover:translate-x-0.5 transition-smooth">
                        →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
