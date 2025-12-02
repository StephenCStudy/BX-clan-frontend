import { http } from "../utils/http";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  relatedNews?: any;
  relatedRoom?: any;
  relatedCustomRoom?: { _id: string };
  isRead: boolean;
  createdAt: string;
}

interface NewsItem {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
}

interface NotificationModalProps {
  open: boolean;
  onClose: () => void;
  notifications: Notification[];
  news?: NewsItem[];
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function NotificationModal({
  open,
  onClose,
  notifications,
  news = [],
  onMarkRead,
  onDelete,
}: NotificationModalProps) {
  if (!open) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const allItems = [
    ...notifications.map((n) => ({ ...n, itemType: "notification" })),
    ...news.map((n) => ({
      ...n,
      itemType: "news",
      type: "news",
      message: n.content,
    })),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const markAllAsRead = async () => {
    try {
      await http.put("/notifications/read-all");
      notifications.forEach((n) => {
        if (!n.isRead) onMarkRead(n._id);
      });
      toast.success("Đã đánh dấu tất cả là đã đọc");
    } catch {
      toast.error("Lỗi đánh dấu đã đọc");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border-2 border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white">Thông báo</h3>
              {unreadCount > 0 && (
                <p className="text-sm text-white/90 mt-1">
                  {unreadCount} thông báo chưa đọc
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-semibold border border-white/40"
              >
                Đánh dấu tất cả
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {allItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-5xl mb-3">
                <i className="fa-solid fa-inbox"></i>
              </div>
              <p>Chưa có thông báo nào</p>
            </div>
          ) : (
            allItems.map((item: any) => {
              const getNotificationLink = () => {
                if (item.itemType === "news") {
                  return `/news/${item._id}`;
                }
                // For room-assignment type, prioritize customs page
                if (item.type === "room-assignment") {
                  if (item.relatedCustomRoom) {
                    return `/customs/${item.relatedCustomRoom._id}`;
                  }
                  if (item.relatedRoom) {
                    return `/customs/${item.relatedRoom._id}`;
                  }
                  // Fallback to customs list
                  return `/customs`;
                }
                // For custom-invite type, go to customs page
                if (item.type === "custom-invite") {
                  if (item.relatedCustomRoom) {
                    return `/customs/${item.relatedCustomRoom._id}`;
                  }
                  return `/customs`;
                }
                if (item.relatedCustomRoom) {
                  return `/customs/${item.relatedCustomRoom._id}`;
                }
                if (item.relatedRoom) {
                  return `/customs/${item.relatedRoom._id}`;
                }
                if (item.relatedNews) {
                  return `/news/${item.relatedNews._id}`;
                }
                return null;
              };

              const link = getNotificationLink();
              const isClickable = !!link;

              const content = (
                <div
                  className={`rounded-xl border-2 p-4 transition ${
                    item.itemType === "news"
                      ? "bg-purple-50 border-purple-300"
                      : item.isRead
                      ? "bg-gray-50 border-gray-200"
                      : "bg-blue-50 border-blue-300"
                  } ${
                    isClickable
                      ? "hover:border-blue-400 hover:shadow-md cursor-pointer"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">
                          {item.itemType === "news" ? (
                            <i className="fa-solid fa-newspaper"></i>
                          ) : item.type === "room-assignment" ? (
                            <i className="fa-solid fa-gamepad"></i>
                          ) : item.type === "custom-invite" ? (
                            <i className="fa-solid fa-envelope"></i>
                          ) : item.type === "registration-confirmed" ? (
                            <i className="fa-solid fa-circle-check"></i>
                          ) : (
                            <i className="fa-solid fa-bullhorn"></i>
                          )}
                        </span>
                        <h4 className="font-bold text-gray-900">
                          {item.title}
                        </h4>
                        {item.itemType === "notification" && !item.isRead && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">
                            Mới
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-2 line-clamp-3">
                        {item.message}
                      </p>
                      {item.relatedRoom && (
                        <div className="text-xs text-blue-600 font-semibold">
                          Phòng số: {item.relatedRoom.roomNumber}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(item.createdAt).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    {item.itemType === "notification" && (
                      <div className="flex flex-col gap-2 shrink-0">
                        {!item.isRead && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onMarkRead(item._id);
                            }}
                            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                            title="Đánh dấu đã đọc"
                          >
                            <i className="fa-solid fa-check"></i>
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDelete(item._id);
                          }}
                          className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
                          title="Xóa"
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );

              return (
                <div key={item._id}>
                  {isClickable ? (
                    <Link to={link!} onClick={onClose}>
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t-2 border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
