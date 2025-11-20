import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";

export default function Header() {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-red-600 text-white shadow-lg">
      {/* Expanded width container (from max-w-6xl to max-w-7xl) */}
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          to="/"
          className="font-bold text-2xl tracking-wide hover:text-red-100 transition"
        >
          🎮 BX Clan
        </Link>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-red-700 transition"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 flex-nowrap">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `hover:opacity-90 transition px-2 py-1 rounded-md whitespace-nowrap ${
                isActive ? "bg-red-700/80 shadow-inner" : ""
              }`
            }
            end
          >
            <i className="fa-solid fa-house"></i> Trang chủ
          </NavLink>
          <NavLink
            to="/members"
            className={({ isActive }) =>
              `hover:opacity-90 transition px-2 py-1 rounded-md whitespace-nowrap ${
                isActive ? "bg-red-700/80 shadow-inner" : ""
              }`
            }
          >
            <i className="fa-solid fa-users"></i> Thành viên
          </NavLink>
          <NavLink
            to="/customs"
            className={({ isActive }) =>
              `hover:opacity-90 transition px-2 py-1 rounded-md whitespace-nowrap ${
                isActive ? "bg-red-700/80 shadow-inner" : ""
              }`
            }
          >
            <i className="fa-solid fa-gamepad"></i> Custom Game
          </NavLink>
          <NavLink
            to="/news"
            className={({ isActive }) =>
              `hover:opacity-90 transition px-2 py-1 rounded-md whitespace-nowrap ${
                isActive ? "bg-red-700/80 shadow-inner" : ""
              }`
            }
          >
            <i className="fa-solid fa-gamepad"></i> Tin tức
          </NavLink>
          {user ? (
            <>
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `hover:opacity-90 transition px-2 py-1 rounded-md whitespace-nowrap ${
                    isActive ? "bg-red-700/80 shadow-inner" : ""
                  }`
                }
              >
                <i className="fa-solid fa-user"></i> Cá nhân
              </NavLink>
              {(user.role === "leader" ||
                user.role === "organizer" ||
                user.role === "moderator") && (
                <NavLink
                  to="/messages"
                  className={({ isActive }) =>
                    `hover:opacity-90 transition px-2 py-1 rounded-md whitespace-nowrap ${
                      isActive ? "bg-red-700/80 shadow-inner" : ""
                    }`
                  }
                >
                  <i className="fa-solid fa-comment"></i> Tin nhắn
                </NavLink>
              )}
              {(user.role === "leader" || user.role === "organizer") && (
                <Link
                  to="/admin"
                  className="px-4 py-2 bg-red-700 hover:bg-red-800 rounded-lg font-medium transition shadow-md"
                >
                  Quản lý
                </Link>
              )}
              <button
                onClick={logout}
                className="px-4 py-2 bg-white text-red-600 hover:bg-gray-100 rounded-lg font-medium transition shadow-md"
              >
                <i className="fa-solid fa-right-from-bracket"></i> Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-5 py-2 bg-white text-red-600 hover:bg-gray-100 rounded-lg font-medium transition shadow-md"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="px-5 py-2 bg-black text-white hover:bg-gray-800 rounded-lg font-medium transition shadow-md"
              >
                Đăng ký
              </Link>
            </>
          )}
        </nav>
      </div>

      {/* Mobile Nav */}
      {isMenuOpen && (
        <nav className="md:hidden bg-red-700 px-4 py-4 space-y-3">
          <Link
            to="/"
            onClick={() => setIsMenuOpen(false)}
            className="block py-2 hover:bg-red-800 rounded px-3 transition"
          >
            Trang chủ
          </Link>
          <Link
            to="/members"
            onClick={() => setIsMenuOpen(false)}
            className="block py-2 hover:bg-red-800 rounded px-3 transition"
          >
            Thành viên
          </Link>
          <Link
            to="/customs"
            onClick={() => setIsMenuOpen(false)}
            className="block py-2 hover:bg-red-800 rounded px-3 transition"
          >
            Custom Game
          </Link>
          <Link
            to="/news"
            onClick={() => setIsMenuOpen(false)}
            className="block py-2 hover:bg-red-800 rounded px-3 transition"
          >
            Tin tức
          </Link>
          {user ? (
            <>
              <Link
                to="/profile"
                onClick={() => setIsMenuOpen(false)}
                className="block py-2 hover:bg-red-800 rounded px-3 transition"
              >
                Cá nhân
              </Link>
              {(user.role === "leader" ||
                user.role === "organizer" ||
                user.role === "moderator") && (
                <Link
                  to="/messages"
                  onClick={() => setIsMenuOpen(false)}
                  className="block py-2 hover:bg-red-800 rounded px-3 transition"
                >
                  Tin nhắn
                </Link>
              )}
              {(user.role === "leader" || user.role === "organizer") && (
                <Link
                  to="/admin"
                  onClick={() => setIsMenuOpen(false)}
                  className="block py-2 bg-red-800 hover:bg-red-900 rounded px-3 transition font-medium"
                >
                  Quản lý
                </Link>
              )}
              <button
                onClick={() => {
                  logout();
                  setIsMenuOpen(false);
                }}
                className="w-full text-left py-2 bg-white text-red-600 hover:bg-gray-100 rounded px-3 font-medium transition"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                onClick={() => setIsMenuOpen(false)}
                className="block py-2 bg-white text-red-600 hover:bg-gray-100 rounded px-3 font-medium transition text-center"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                onClick={() => setIsMenuOpen(false)}
                className="block py-2 bg-black text-white hover:bg-gray-800 rounded px-3 font-medium transition text-center"
              >
                Đăng ký
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
