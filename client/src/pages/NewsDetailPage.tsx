import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { http } from "../utils/http";
import { useAuth } from "../context/AuthContext";
import BackButton from "../components/BackButton";
import { toast } from "react-toastify";
import RegisterModal from "../components/RegisterModal";

interface Comment {
  _id: string;
  user: any;
  message: string;
  createdAt: string;
}

export default function NewsDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [news, setNews] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasRegistered, setHasRegistered] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  const loadData = () => {
    if (!id) return;
    http
      .get(`/news/${id}`)
      .then((res) => setNews(res.data))
      .catch(() => toast.error("Lỗi tải tin"));

    http
      .get(`/news/${id}/comments`)
      .then((res) => setComments(res.data))
      .catch(() => {});

    // Check if user already registered
    if (user) {
      http
        .get(`/registrations/news/${id}/registrations`)
        .then((res) => {
          setHasRegistered(
            res.data?.some((r: any) => r.user._id === user.id) || false
          );
        })
        .catch(() => {});
    }

    setLoading(false);
  };

  const postComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    try {
      const res = await http.post(`/news/${id}/comments`, { message });
      setComments([...comments, res.data]);
      setMessage("");
    } catch {
      toast.error("Lỗi gửi bình luận");
    }
  };

  if (loading || !news)
    return <div className="text-center py-10">Đang tải...</div>;

  const isRoomCreation = news.type === "room-creation";

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-4">
        <BackButton />
      </div>
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-6 shadow-lg">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-3xl font-bold bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            {news.title}
          </h1>
          {isRoomCreation && (
            <span className="shrink-0 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600 border border-red-200">
              🎮 Tạo Phòng
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-4">
          {new Date(news.createdAt).toLocaleString("vi-VN")}
        </p>
        <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
          {news.content}
        </div>
      </div>

      {/* Registration Button (only for room-creation type) */}
      {user && isRoomCreation && !hasRegistered && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-6 shadow-lg">
          <button
            onClick={() => setShowRegisterModal(true)}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow transition"
          >
            🎮 Đăng ký tham gia
          </button>
        </div>
      )}

      {user && isRoomCreation && hasRegistered && (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6">
          <p className="text-green-700 font-semibold text-center">
            ✓ Bạn đã đăng ký tham gia
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-4 text-indigo-600">
          Bình luận ({comments.length})
        </h2>

        {user && (
          <form onSubmit={postComment} className="mb-6">
            <textarea
              className="w-full p-3 bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 mb-2"
              placeholder="Viết bình luận..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
            <button
              type="submit"
              className="px-5 py-2 rounded-lg font-medium text-white shadow-md bg-linear-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
            >
              Gửi
            </button>
          </form>
        )}

        <div className="space-y-4">
          {comments.map((c) => (
            <div
              key={c._id}
              className="flex gap-3 p-3 bg-linear-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100"
            >
              <img
                src={c.user?.avatarUrl || "https://placehold.co/40x40"}
                alt={c.user?.username}
                className="w-10 h-10 rounded-full border-2 border-indigo-400"
              />
              <div className="flex-1">
                <p className="font-semibold text-sm text-indigo-700">
                  {c.user?.username}
                </p>
                <p className="text-gray-800 text-sm mt-1">{c.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(c.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showRegisterModal && id && (
        <RegisterModal
          open={showRegisterModal}
          onClose={() => setShowRegisterModal(false)}
          newsId={id}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
