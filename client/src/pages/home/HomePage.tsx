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

export default function HomePage() {
  const [clan, setClan] = useState<Clan | null>(null);
  const { user } = useAuth();
  const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const [news, setNews] = useState<News[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
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
    if (!user) {
      setLoadingNotifications(false);
      return;
    }
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API}/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const sorted = [...(res.data || [])].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
        );
        setNotifications(sorted);
      } catch {
        setNotifications([]);
      } finally {
        setLoadingNotifications(false);
      }
    })();
  }, [user]);

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-linear-to-br from-red-600 via-red-700 to-gray-900 text-white">
        <div className="absolute inset-0 opacity-10">
          <img
            src={
              clan?.bannerUrl ||
              "https://images.unsplash.com/photo-1606112219348-204d7d8b94ee?q=80&w=2069&auto=format&fit=crop"
            }
            alt="banner"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24">
          {/* Clan Name & Description */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-extrabold mb-4 drop-shadow-lg text-white!">
              {clan?.clanName || "BX Clan"}
            </h1>
            <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
              {clan?.description ||
                "Clan Tốc Chiến • Tốc độ – Chiến thắng – Đoàn kết"}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Link
              to={user ? "/customs" : "/register"}
              className="px-6 py-3 rounded-lg bg-white text-red-600 hover:bg-gray-100 text-base md:text-lg font-bold transition shadow-xl hover:shadow-2xl transform hover:scale-105"
            >
              {user ? "⚔️ Xem Custom Games" : "🎮 Tham gia ngay"}
            </Link>
            <Link
              to="/members"
              className="px-6 py-3 rounded-lg bg-black/30 backdrop-blur-sm border-2 border-white/50 hover:bg-black/50 text-white text-base md:text-lg font-bold transition shadow-xl hover:shadow-2xl transform hover:scale-105"
            >
              👥 Thành viên
            </Link>
          </div>

          {/* Clan Criteria */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-center">
              <div className="text-3xl mb-2">⚡</div>
              <h3 className="font-bold text-lg mb-1 text-white!">Tốc Độ</h3>
              <p className="text-sm text-white/80">
                Phản ứng nhanh, hành động quyết đoán
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-center">
              <div className="text-3xl mb-2">🏆</div>
              <h3 className="font-bold text-lg mb-1 text-white!">Chiến Thắng</h3>
              <p className="text-sm text-white/80">
                Luôn hướng đến mục tiêu cao nhất
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-center">
              <div className="text-3xl mb-2">🤝</div>
              <h3 className="font-bold text-lg mb-1 text-white!">Đoàn Kết</h3>
              <p className="text-sm text-white/80">
                Cùng nhau phát triển và thành công
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content - Two Column Layout */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tổng Quan Clan */}
          <div className="bg-linear-to-br from-red-50 to-white rounded-2xl border-2 border-red-200 p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-red-600 flex items-center gap-2">
                <span>📊</span> Tổng Quan Clan
              </h2>
            </div>
            <div className="space-y-4">
              <Link
                to="/members"
                className="block bg-white rounded-xl p-4 border-2 border-gray-200 hover:border-red-400 hover:shadow-md transition group"
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
                  <span className="text-red-600 text-2xl group-hover:translate-x-1 transition">
                    →
                  </span>
                </div>
              </Link>
              <Link
                to="/customs"
                className="block bg-white rounded-xl p-4 border-2 border-gray-200 hover:border-red-400 hover:shadow-md transition group"
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
                  <span className="text-red-600 text-2xl group-hover:translate-x-1 transition">
                    →
                  </span>
                </div>
              </Link>
              {user && (
                <Link
                  to="/profile"
                  className="block bg-white rounded-xl p-4 border-2 border-gray-200 hover:border-red-400 hover:shadow-md transition group"
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
                    <span className="text-red-600 text-2xl group-hover:translate-x-1 transition">
                      →
                    </span>
                  </div>
                </Link>
              )}
            </div>
          </div>

          {/* Thông Báo */}
          <div className="bg-linear-to-br from-blue-50 to-white rounded-2xl border-2 border-blue-200 p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                <span>📢</span> Thông Báo
              </h2>
              <Link
                to="/news"
                className="px-3 py-1 rounded-lg border-2 border-blue-600 text-blue-600 hover:bg-blue-50 text-xs font-semibold transition"
              >
                Xem tất cả
              </Link>
            </div>

            {loadingNotifications ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 rounded-xl border-2 border-gray-200 bg-gray-50 animate-pulse"
                  />
                ))}
              </div>
            ) : !user ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">🔒</div>
                <p className="mb-2">Đăng nhập để xem thông báo</p>
                <Link
                  to="/login"
                  className="inline-block px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                >
                  Đăng nhập
                </Link>
              </div>
            ) : notifications.length === 0 && news.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📭</div>
                <p>Chưa có thông báo nào</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {/* Notifications from backend */}
                {notifications.map((notif, idx) => {
                  const getNotificationIcon = () => {
                    if (notif.type === "custom-invite") return "💌";
                    if (notif.type === "room-assignment") return "🎮";
                    if (notif.type === "registration-confirmed") return "✅";
                    return "📢";
                  };

                  const getNotificationLink = () => {
                    if (notif.relatedCustomRoom) {
                      return `/customs/${notif.relatedCustomRoom._id}`;
                    }
                    if (notif.relatedNews) {
                      return `/news/${notif.relatedNews._id}`;
                    }
                    return "#";
                  };

                  const isClickable =
                    notif.relatedCustomRoom || notif.relatedNews;

                  return isClickable ? (
                    <Link
                      key={notif._id}
                      to={getNotificationLink()}
                      className={`block bg-white rounded-xl p-3 border-2 ${
                        notif.isRead
                          ? "border-gray-200"
                          : "border-yellow-300 bg-yellow-50"
                      } hover:border-blue-400 hover:shadow-md transition group`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-2xl shrink-0">
                          {getNotificationIcon()}
                        </span>
                        {idx === 0 && !notif.isRead && (
                          <span className="shrink-0 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-600 border border-red-200">
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
                        <span className="shrink-0 text-blue-600 group-hover:translate-x-0.5 transition">
                          →
                        </span>
                      </div>
                    </Link>
                  ) : (
                    <div
                      key={notif._id}
                      className={`bg-white rounded-xl p-3 border-2 ${
                        notif.isRead
                          ? "border-gray-200"
                          : "border-yellow-300 bg-yellow-50"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-2xl shrink-0">
                          {getNotificationIcon()}
                        </span>
                        {idx === 0 && !notif.isRead && (
                          <span className="shrink-0 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-600 border border-red-200">
                            MỚI
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-gray-900 line-clamp-1">
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
                      </div>
                    </div>
                  );
                })}

                {/* Latest news */}
                {news.slice(0, 3).map((n, idx) => (
                  <Link
                    key={n._id}
                    to={`/news/${n._id}`}
                    className="block bg-white rounded-xl p-3 border-2 border-gray-200 hover:border-blue-400 hover:shadow-md transition group"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-2xl shrink-0">📰</span>
                      {idx === 0 && notifications.length === 0 && (
                        <span className="shrink-0 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-600 border border-red-200">
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
                      <span className="shrink-0 text-blue-600 group-hover:translate-x-0.5 transition">
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
