import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [news, setNews] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasRegistered, setHasRegistered] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    content: "",
    type: "announcement",
  });

  const canEdit = user && user.role !== "member";

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  useEffect(() => {
    // Check if edit mode from URL
    if (canEdit && searchParams.get("edit") === "1") {
      setIsEditing(true);
    }
  }, [searchParams, canEdit]);

  useEffect(() => {
    // Update edit form when news loads
    if (news) {
      setEditForm({
        title: news.title || "",
        content: news.content || "",
        type: news.type || "announcement",
      });
    }
  }, [news]);

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

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await http.put(`/news/${id}`, editForm);
      toast.success("Cập nhật bài viết thành công");
      setNews({ ...news, ...editForm });
      setIsEditing(false);
      // Remove edit param from URL
      navigate(`/news/${id}`, { replace: true });
    } catch {
      toast.error("Lỗi cập nhật bài viết");
    }
  };

  const deleteNews = async () => {
    if (!confirm("Bạn có chắc muốn xóa bài viết này?")) return;
    try {
      await http.delete(`/news/${id}`);
      toast.success("Đã xóa bài viết");
      navigate("/news");
    } catch {
      toast.error("Lỗi xóa bài viết");
    }
  };

  if (loading || !news)
    return <div className="text-center py-10">Đang tải...</div>;

  const isRoomCreation = news.type === "room-creation";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6 lg:px-8">
      <div className="mb-4">
        <BackButton />
      </div>
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-6 shadow-lg">
        {!isEditing ? (
          <>
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-3xl font-bold bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                {news.title}
              </h1>
              <div className="flex items-center gap-2">
                {isRoomCreation && (
                  <span className="shrink-0 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600 border border-red-200 inline-flex items-center gap-1">
                    <i className="fa-solid fa-gamepad"></i> Tạo Phòng
                  </span>
                )}
                {canEdit && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1 bg-blue-100 hover:bg-blue-600 text-blue-600 hover:text-white rounded-lg transition text-sm font-medium"
                    title="Sửa bài viết"
                  >
                    <i className="fa-solid fa-pen-to-square mr-1"></i> Sửa
                  </button>
                )}
                {canEdit && (
                  <button
                    onClick={deleteNews}
                    className="px-3 py-1 bg-red-100 hover:bg-red-600 text-red-600 hover:text-white rounded-lg transition text-sm font-medium"
                    title="Xóa bài viết"
                  >
                    <i className="fa-regular fa-trash-can mr-1"></i> Xóa
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {new Date(news.createdAt).toLocaleString("vi-VN")}
            </p>
            <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
              {news.content}
            </div>
          </>
        ) : (
          <form onSubmit={saveEdit} className="space-y-4">
            <h2 className="text-2xl font-bold text-indigo-600 mb-4">
              <i className="fa-solid fa-pen-to-square mr-2"></i>
              Chỉnh sửa bài viết
            </h2>
            <div>
              <label className="block mb-1 text-sm text-gray-700 font-medium">
                Loại bài đăng
              </label>
              <select
                className="w-full p-3 text-sm bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                value={editForm.type}
                onChange={(e) =>
                  setEditForm({ ...editForm, type: e.target.value })
                }
              >
                <option value="announcement">Thông báo</option>
                <option value="room-creation">Tạo phòng</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 text-sm text-gray-700 font-medium">
                Tiêu đề
              </label>
              <input
                className="w-full p-3 text-sm bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="block mb-1 text-sm text-gray-700 font-medium">
                Nội dung
              </label>
              <textarea
                className="w-full p-3 text-sm bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                value={editForm.content}
                onChange={(e) =>
                  setEditForm({ ...editForm, content: e.target.value })
                }
                rows={8}
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow transition"
              >
                <i className="fa-solid fa-floppy-disk mr-2"></i>
                Lưu thay đổi
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditForm({
                    title: news.title,
                    content: news.content,
                    type: news.type || "announcement",
                  });
                  navigate(`/news/${id}`, { replace: true });
                }}
                className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-bold transition"
              >
                Hủy
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Registration Button (only for room-creation type) */}
      {user && isRoomCreation && !hasRegistered && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-6 shadow-lg">
          <button
            onClick={() => setShowRegisterModal(true)}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow transition inline-flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-gamepad"></i> Đăng ký tham gia
          </button>
        </div>
      )}

      {user && isRoomCreation && hasRegistered && (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6">
          <p className="text-green-700 font-semibold text-center inline-flex items-center justify-center gap-2 w-full">
            <i className="fa-solid fa-check"></i> Bạn đã đăng ký tham gia
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
