import { Link, useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-linear-to-br from-[#0b0b0d] via-[#111118] to-[#1a0a0a] flex items-center justify-center px-4 py-16">
      <div className="max-w-2xl w-full text-center">
        {/* 404 Animation - Wild Rift Theme */}
        <div className="relative mb-12">
          <div className="text-[200px] font-bold text-transparent bg-clip-text bg-linear-to-r from-red-600 via-red-500 to-red-700 leading-none select-none animate-pulse">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-40 h-40 bg-red-600 rounded-full opacity-10 animate-ping"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-8xl animate-bounce">🎮</span>
          </div>
        </div>

        {/* Error Message */}
        <div className="mb-12 space-y-4">
          <h1 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">
            Không tìm thấy trang
          </h1>
          <p className="text-lg text-gray-400 max-w-md mx-auto">
            Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển. Hãy quay
            về trang chủ để tiếp tục khám phá Clan!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center gap-2 px-8 py-3 border-2 border-red-600 text-red-500 rounded-lg font-semibold hover:bg-red-600 hover:text-white transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-600/50"
          >
            <span className="text-xl transition-transform duration-300 group-hover:-translate-x-1">
              ←
            </span>
            Quay lại
          </button>

          <Link
            to="/"
            className="group flex items-center gap-2 px-8 py-3 bg-linear-to-r from-red-700 to-red-600 text-white rounded-lg font-semibold hover:from-red-600 hover:to-red-500 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-600/50"
          >
            <span className="text-xl transition-transform duration-300 group-hover:scale-110">
              🏠
            </span>
            Về trang chủ
          </Link>
        </div>

        {/* Decorative Elements */}
        <div className="mt-12 grid grid-cols-3 gap-4 max-w-md mx-auto">
          <div
            className="h-1.5 bg-linear-to-r from-red-700 to-red-600 rounded-full animate-pulse"
            style={{ animationDelay: "0s" }}
          ></div>
          <div
            className="h-1.5 bg-linear-to-r from-red-600 to-red-500 rounded-full animate-pulse"
            style={{ animationDelay: "0.3s" }}
          ></div>
          <div
            className="h-1.5 bg-linear-to-r from-red-700 to-red-600 rounded-full animate-pulse"
            style={{ animationDelay: "0.6s" }}
          ></div>
        </div>

        {/* Popular Links */}
        <div className="mt-12 p-6 bg-[#1a1a22] rounded-xl border border-red-900/20 shadow-xl">
          <h3 className="text-xl font-bold text-red-500 mb-6">
            🔥 Các trang phổ biến
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Link
              to="/members"
              className="text-left px-4 py-3 rounded-lg bg-[#111118] hover:bg-red-900/30 hover:text-red-400 text-gray-300 transition-all duration-300 hover:scale-105 hover:shadow-md"
            >
              👥 Thành viên
            </Link>
            <Link
              to="/customs"
              className="text-left px-4 py-3 rounded-lg bg-[#111118] hover:bg-red-900/30 hover:text-red-400 text-gray-300 transition-all duration-300 hover:scale-105 hover:shadow-md"
            >
              🎮 Custom Game
            </Link>
            <Link
              to="/news"
              className="text-left px-4 py-3 rounded-lg bg-[#111118] hover:bg-red-900/30 hover:text-red-400 text-gray-300 transition-all duration-300 hover:scale-105 hover:shadow-md"
            >
              📰 Tin tức
            </Link>
            <Link
              to="/chat"
              className="text-left px-4 py-3 rounded-lg bg-[#111118] hover:bg-red-900/30 hover:text-red-400 text-gray-300 transition-all duration-300 hover:scale-105 hover:shadow-md"
            >
              💬 Chat
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
