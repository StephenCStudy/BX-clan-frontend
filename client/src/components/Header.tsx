import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useRef, useEffect } from "react";

export default function Header() {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Dropdown menu items
  const dropdownItems = [
    { path: "/customs", label: "Custom Game", icon: "fa-gamepad" },
    { path: "/news", label: "Tin tức", icon: "fa-newspaper" },
    ...(user &&
    (user.role === "leader" ||
      user.role === "organizer" ||
      user.role === "moderator")
      ? [{ path: "/messages", label: "Tin nhắn", icon: "fa-comment" }]
      : []),
  ];

  // Check if current path is in dropdown
  const isDropdownActive = dropdownItems.some((item) =>
    location.pathname.startsWith(item.path)
  );
  const currentDropdownItem = dropdownItems.find((item) =>
    location.pathname.startsWith(item.path)
  );

  return (
    <header className="bg-linear-to-r from-red-600 via-red-500 to-red-600 text-white shadow-xl sticky top-0 z-50 border-b border-red-700">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3 flex items-center justify-between gap-4">
        <Link
          to="/"
          className="font-bold text-xl lg:text-2xl tracking-wide hover:text-red-100 transition-fast flex items-center gap-2 shrink-0"
        >
          <img
            src="/LOGO.png"
            alt="BX Clan Logo"
            className="w-9 h-9 lg:w-10 lg:h-10 rounded-full object-cover border-2 border-white/30 shadow-md"
          />
          <span className="bg-linear-to-r from-white to-red-100 bg-clip-text text-transparent font-extrabold">
            BX Clan
          </span>
        </Link>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-all duration-200 border border-white/20"
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
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2 flex-nowrap">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `hover:bg-white/10 transition-all duration-200 px-3 py-2 rounded-lg whitespace-nowrap text-sm font-medium ${
                isActive ? "bg-white/20 shadow-inner" : ""
              }`
            }
            end
          >
            <i className="fa-solid fa-house mr-1.5"></i>Trang chủ
          </NavLink>
          <NavLink
            to="/members"
            className={({ isActive }) =>
              `hover:bg-white/10 transition-all duration-200 px-3 py-2 rounded-lg whitespace-nowrap text-sm font-medium ${
                isActive ? "bg-white/20 shadow-inner" : ""
              }`
            }
          >
            <i className="fa-solid fa-users mr-1.5"></i>Thành viên
          </NavLink>

          {/* Dropdown Menu for Custom, News, Messages */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`hover:bg-white/10 transition-all duration-200 px-3 py-2 rounded-lg whitespace-nowrap text-sm font-medium flex items-center gap-1.5 ${
                isDropdownActive ? "bg-white/20 shadow-inner" : ""
              }`}
            >
              <i
                className={`fa-solid ${
                  currentDropdownItem?.icon || "fa-ellipsis"
                }`}
              ></i>
              <span>{currentDropdownItem?.label || "Khác"}</span>
              <i
                className={`fa-solid fa-chevron-down text-xs transition-transform duration-200 ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              ></i>
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-40 z-50">
                {dropdownItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 transition-colors flex items-center gap-2 ${
                      location.pathname.startsWith(item.path)
                        ? "bg-red-100 text-red-700 font-semibold"
                        : "text-gray-700"
                    }`}
                  >
                    <i className={`fa-solid ${item.icon} w-4 text-center`}></i>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {user ? (
            <>
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `hover:bg-white/10 transition-all duration-200 px-3 py-2 rounded-lg whitespace-nowrap text-sm font-medium ${
                    isActive ? "bg-white/20 shadow-inner" : ""
                  }`
                }
              >
                <i className="fa-solid fa-user mr-1.5"></i>Cá nhân
              </NavLink>
              {(user.role === "leader" || user.role === "organizer") && (
                <Link
                  to="/admin"
                  className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-all duration-200 shadow-md text-sm whitespace-nowrap border border-white/20"
                >
                  <i className="fa-solid fa-shield-halved mr-1.5"></i>Quản lý
                </Link>
              )}
              <button
                onClick={logout}
                className="px-3 py-2 bg-white text-red-600 hover:bg-red-50 rounded-lg font-medium transition-all duration-200 shadow-md text-sm whitespace-nowrap"
              >
                <i className="fa-solid fa-right-from-bracket mr-1.5"></i>Thoát
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 bg-white text-red-600 hover:bg-red-50 rounded-lg font-medium transition-all duration-200 shadow-md text-sm whitespace-nowrap"
              >
                <i className="fa-solid fa-right-to-bracket mr-1.5"></i>Đăng nhập
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-lg font-medium transition-all duration-200 shadow-md text-sm whitespace-nowrap"
              >
                <i className="fa-solid fa-user-plus mr-1.5"></i>Đăng ký
              </Link>
            </>
          )}
        </nav>
      </div>

      {/* Mobile Nav */}
      {isMenuOpen && (
        <nav className="lg:hidden bg-linear-to-b from-red-700 to-red-800 px-4 py-4 space-y-2 border-t border-red-600/50">
          <Link
            to="/"
            onClick={() => setIsMenuOpen(false)}
            className="block py-2.5 hover:bg-white/10 rounded-lg px-4 transition-all duration-200 font-medium"
          >
            <i className="fa-solid fa-house mr-3 w-5 text-center"></i>Trang chủ
          </Link>
          <Link
            to="/members"
            onClick={() => setIsMenuOpen(false)}
            className="block py-2.5 hover:bg-white/10 rounded-lg px-4 transition-all duration-200 font-medium"
          >
            <i className="fa-solid fa-users mr-3 w-5 text-center"></i>Thành viên
          </Link>

          {/* Dropdown items in mobile */}
          <div className="border-t border-white/20 pt-2 mt-2">
            <p className="text-xs text-white/60 px-4 mb-2 uppercase tracking-wider">
              Hoạt động
            </p>
            {dropdownItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={`block py-2.5 hover:bg-white/10 rounded-lg px-4 transition-all duration-200 font-medium ${
                  location.pathname.startsWith(item.path) ? "bg-white/20" : ""
                }`}
              >
                <i className={`fa-solid ${item.icon} mr-3 w-5 text-center`}></i>
                {item.label}
              </Link>
            ))}
          </div>

          {user ? (
            <>
              <div className="border-t border-white/20 pt-2 mt-2">
                <Link
                  to="/profile"
                  onClick={() => setIsMenuOpen(false)}
                  className="block py-2.5 hover:bg-white/10 rounded-lg px-4 transition-all duration-200 font-medium"
                >
                  <i className="fa-solid fa-user mr-3 w-5 text-center"></i>Cá
                  nhân
                </Link>
                {(user.role === "leader" || user.role === "organizer") && (
                  <Link
                    to="/admin"
                    onClick={() => setIsMenuOpen(false)}
                    className="block py-2.5 bg-white/20 hover:bg-white/30 rounded-lg px-4 transition-all duration-200 font-semibold border border-white/20"
                  >
                    <i className="fa-solid fa-shield-halved mr-3 w-5 text-center"></i>
                    Quản lý
                  </Link>
                )}
              </div>
              <div className="pt-2 border-t border-white/20 mt-2">
                <button
                  onClick={() => {
                    logout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left py-2.5 bg-white text-red-600 hover:bg-red-50 rounded-lg px-4 font-semibold transition-all duration-200 shadow-md"
                >
                  <i className="fa-solid fa-right-from-bracket mr-3 w-5 text-center"></i>
                  Đăng xuất
                </button>
              </div>
            </>
          ) : (
            <div className="pt-2 border-t border-white/20 mt-2 space-y-2">
              <Link
                to="/login"
                onClick={() => setIsMenuOpen(false)}
                className="block py-2.5 bg-white text-red-600 hover:bg-red-50 rounded-lg px-4 font-semibold transition-all duration-200 text-center shadow-md"
              >
                <i className="fa-solid fa-right-to-bracket mr-2"></i>Đăng nhập
              </Link>
              <Link
                to="/register"
                onClick={() => setIsMenuOpen(false)}
                className="block py-2.5 bg-gray-900 text-white hover:bg-gray-800 rounded-lg px-4 font-semibold transition-all duration-200 text-center shadow-md"
              >
                <i className="fa-solid fa-user-plus mr-2"></i>Đăng ký
              </Link>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
