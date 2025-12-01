export default function Footer() {
  return (
    <footer className="bg-linear-to-br from-gray-900 via-[#1a1a1a] to-black text-gray-300 mt-12 border-t-4 border-red-600">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* About Section */}
          <div>
            <h3 className="text-xl font-bold text-white! mb-4 flex items-center gap-2">
              <span>🎮</span>
              <span>BX Clan</span>
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Clan Wild Rift hàng đầu Việt Nam. Chuyên nghiệp, đoàn kết, và luôn
              hướng đến chiến thắng.
            </p>
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} BX Clan. All rights reserved.
            </p>
          </div>

          {/* Contact Section */}
          <div>
            <h3 className="text-lg font-bold text-white! mb-4 flex items-center gap-2">
              <i className="fa-solid fa-address-book inline-block"></i>
              Liên hệ & Hỗ trợ
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="mailto:support@bxclan.com"
                  className="flex items-center gap-2 hover:text-red-400 transition-fast"
                >
                  <span>
                    <i className="fa-solid fa-envelope"></i>
                  </span>
                  <span>support@bxclan.com</span>
                </a>
              </li>
              <li>
                <a
                  href="https://facebook.com/bxclan"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-red-400 transition-fast"
                >
                  <span>
                    <i className="fa-brands fa-facebook"></i>
                  </span>
                  <span>Facebook</span>
                </a>
              </li>
              <li>
                <a
                  href="https://discord.gg/AkuphZ4K"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-red-400 transition-fast"
                >
                  <span>
                    <i className="fa-brands fa-discord"></i>
                  </span>
                  <span>Discord</span>
                </a>
              </li>
              <li>
                <a
                  href="https://tiktok.com/@bxclan"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-red-400 transition-fast"
                >
                  <span>
                    <i className="fa-brands fa-tiktok"></i>
                  </span>
                  <span>TikTok</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Developer & Deploy Section - Same Row */}
          <div>
            <div className="grid grid-cols-2 gap-4">
              {/* Developer Info */}
              <div>
                <h3 className="text-sm font-bold text-white! mb-2 flex items-center gap-2">
                  <i className="fa-solid fa-code inline-block text-xs"></i>
                  Nhà phát triển
                </h3>
                <div className="space-y-1 text-xs">
                  <p className="flex items-center gap-1">
                    <i className="fa-solid fa-user text-[10px]"></i>
                    <span className="text-white! font-bold">StephenDuc</span>
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Full-stack Developer
                  </p>
                  <div className="flex gap-2 mt-2">
                    <a
                      href="https://github.com/StephenCStudy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 transition-fast text-[10px] font-semibold"
                    >
                      <i className="fa-brands fa-github"></i> GitHub
                    </a>
                    <a
                      href="https://www.facebook.com/stephen.uc.2025/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 transition-fast text-[10px] font-semibold"
                    >
                      <i className="fa-brands fa-facebook"></i> FB
                    </a>
                  </div>
                </div>
              </div>

              {/* Deploy Info */}
              <div>
                <h3 className="text-sm font-bold text-white! mb-2 flex items-center gap-2">
                  <i className="fa-solid fa-server inline-block text-xs"></i>
                  Deploy
                </h3>
                <div className="space-y-1 text-xs">
                  <p className="flex items-center gap-1">
                    <i className="fa-solid fa-user text-[10px]"></i>
                    <span className="text-white! font-bold">Trọng Mẫn</span>
                  </p>
                  <p className="text-[10px] text-gray-500">
                    CEO - DevOps Engineer
                  </p>
                  <div className="flex gap-2 mt-2">
                    <a
                      href="https://github.com/viesoftware/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 transition-fast text-[10px] font-semibold"
                    >
                      <i className="fa-brands fa-github"></i> GitHub
                    </a>
                    <a
                      href="https://www.facebook.com/man.pro.ok#"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 transition-fast text-[10px] font-semibold"
                    >
                      <i className="fa-brands fa-facebook"></i> FB
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
            <p>
              Made with <span className="text-red-500">❤️</span> for the Wild
              Rift community - website version 1.2.0
            </p>
            <div className="flex gap-4">
              <a
                href="https://www.riotgames.com/vi/terms-of-service?"
                className="hover:text-red-400 transition-fast"
              >
                Privacy Policy
              </a>
              <a
                href="https://www.riotgames.com/vi/legal/privacy-notice"
                className="hover:text-red-400 transition-fast"
              >
                Terms of Service
              </a>
              <a
                href="https://github.com/StephenCStudy/BX-clan"
                className="hover:text-red-400 transition-fast"
              >
                Source Code
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
