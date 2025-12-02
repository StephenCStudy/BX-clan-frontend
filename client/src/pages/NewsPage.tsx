import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { http } from "../utils/http";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";

interface News {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
  createdBy: any;
}

export default function NewsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    content: "",
    type: "announcement",
  });
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || ""
  );
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get("page") || "1")
  );
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadNews();
  }, [currentPage, searchQuery]);

  const loadNews = () => {
    setLoading(true);
    // Update URL params
    const params: any = { page: currentPage.toString() };
    if (searchQuery) params.search = searchQuery;
    setSearchParams(params);

    http
      .get("/news", {
        params: { page: currentPage, limit: 4, search: searchQuery },
      })
      .then((res) => {
        setNews(res.data.items || []);
        setTotalPages(res.data.totalPages || 1);
      })
      .catch(() => toast.error("Lỗi tải tin tức"))
      .finally(() => setLoading(false));
  };

  const createNews = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await http.post("/news", form);
      toast.success("Đăng tin tức thành công");
      setShowForm(false);
      setForm({ title: "", content: "", type: "announcement" });
      loadNews();
    } catch {
      toast.error("Lỗi đăng tin");
    }
  };

  const deleteNews = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Đồng ý xóa bài viết này?")) return;
    try {
      await http.delete(`/news/${id}`);
      toast.success("Đã xóa bài viết");
      loadNews();
    } catch {
      toast.error("Lỗi xóa bài viết");
    }
  };

  if (loading)
    return <div className="text-center py-10 text-gray-600">Đang tải...</div>;

  const canCreate =
    user && (user.role === "leader" || user.role === "organizer");
  const canDelete =
    user &&
    (user.role === "leader" ||
      user.role === "organizer" ||
      user.role === "moderator");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6 lg:px-8">
      <div className="flex flex-row items-center justify-between mb-6 gap-2">
        <h1 className="text-2xl md:text-4xl font-bold text-red-600">
          Tin tức Clan
        </h1>
        {canCreate && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-2 md:px-5 py-1 md:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs md:text-sm font-medium shadow-md transition"
          >
            {showForm ? "Hủy" : "+ Đăng"}
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Tìm kiếm theo tiêu đề..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full p-3 text-sm bg-white rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
        />
      </div>

      {showForm && (
        <form
          onSubmit={createNews}
          className="bg-white rounded-xl border-2 border-gray-200 p-4 md:p-6 mb-6 shadow-lg"
        >
          <h2 className="text-xl md:text-2xl font-semibold text-red-600 mb-4">
            Tin tức mới
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block mb-1 text-sm md:text-base text-gray-700 font-medium">
                Loại bài đăng
              </label>
              <select
                className="w-full p-2 md:p-3 text-sm bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="announcement">Thông báo</option>
                <option value="room-creation">Tạo phòng</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {form.type === "announcement"
                  ? "Bài viết thông báo thông thường, không có đăng ký"
                  : "Bài viết cho phép người chơi đăng ký tham gia custom"}
              </p>
            </div>
            <div>
              <label className="block mb-1 text-sm md:text-base text-gray-700 font-medium">
                Tiêu đề
              </label>
              <input
                className="w-full p-2 md:p-3 text-sm bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block mb-1 text-sm md:text-base text-gray-700 font-medium">
                Nội dung
              </label>
              <textarea
                className="w-full p-2 md:p-3 text-sm bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={6}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 md:py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm md:text-base font-bold shadow-lg transition"
            >
              Đăng tin
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {news.map((n) => (
          <div
            key={n._id}
            className="relative bg-white rounded-xl border-2 border-gray-200 hover:border-red-500 hover:shadow-lg transition"
          >
            <Link to={`/news/${n._id}`} className="block p-4 md:p-5">
              <h3 className="font-semibold text-base md:text-xl mb-2 text-gray-900">
                {n.title}
              </h3>
              <p className="text-gray-600 text-xs md:text-sm line-clamp-2 mb-3">
                {n.content}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(n.createdAt).toLocaleString("vi-VN")}
              </p>
            </Link>
            {canDelete && (
              <button
                onClick={(e) => deleteNews(n._id, e)}
                className="absolute top-3 right-3 p-2 bg-red-100 hover:bg-red-600 text-red-600 hover:text-white rounded-lg transition"
                title="Xóa bài viết"
              >
                <i className="fa-regular fa-trash-can"></i>
              </button>
            )}
            {/* <button className="absolute top-3 right-12 p-2 bg-red-100 hover:bg-blue-600 text-blue-600 hover:text-white rounded-lg transition">
              <i className="fa-solid fa-pen-to-square"></i>
            </button> */}
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
    </div>
  );
}
