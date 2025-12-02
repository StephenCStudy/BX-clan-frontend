import { useEffect, useRef, useState } from "react";
import { http } from "../utils/http";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { getRankColors, getLaneColors } from "../utils/rankLaneColors";
import { getRoleDisplay } from "../utils/roleTranslation";
import ConfirmModal from "../components/ConfirmModal";

interface Member {
  _id: string;
  username: string;
  ingameName: string;
  role: string;
  rank?: string;
  lane?: string;
  avatarUrl?: string;
  joinDate: string;
}

export default function MembersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Member | null>(null);
  const [confirmKick, setConfirmKick] = useState<Member | null>(null);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const PAGE_SIZE = 7;

  useEffect(() => {
    http
      .get("/members")
      .then((res) => setMembers(res.data))
      .catch(() => toast.error("Lỗi tải danh sách"))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="text-center py-10 text-gray-600 animate-fade-in">
        <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-red-600 rounded-full animate-rotate gpu-accelerated mb-4"></div>
        <p className="animate-pulse">Đang tải...</p>
      </div>
    );

  const canManage =
    user &&
    (user.role === "leader" ||
      user.role === "organizer" ||
      user.role === "moderator");

  const viewMember = (m: Member) => setSelected(m);

  const kickMember = async () => {
    if (!confirmKick) return;
    try {
      await http.delete(`/members/${confirmKick._id}`);
      setMembers((prev) => prev.filter((x) => x._id !== confirmKick._id));
      toast.success("Đã kick thành viên");
      setConfirmKick(null);
    } catch (e) {
      toast.error("Không kick được thành viên này");
    }
  };

  const exportMembers = () => {
    try {
      const rows = members.map((m) => ({
        Username: m.username,
        IngameName: m.ingameName,
        Role: m.role,
        Rank: m.rank || "",
        Lane: m.lane || "",
        JoinDate: new Date(m.joinDate).toISOString().slice(0, 10),
      }));
      const sheet = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, sheet, "Members");
      XLSX.writeFile(
        wb,
        `members_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      toast.success("Đã xuất Excel");
    } catch (e) {
      toast.error("Xuất Excel thất bại");
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (!json.length) {
        toast.error("File rỗng hoặc không hợp lệ");
        return;
      }
      // Normalize keys
      const payload = json.map((r) => ({
        username: r.Username || r.username,
        ingameName: r.IngameName || r.ingameName || "",
        role: r.Role || r.role || "member",
      }));
      // Try bulk endpoint first
      try {
        await http.post("/members/bulk", { members: payload });
      } catch {
        // Fallback: per-row create
        for (const row of payload) {
          try {
            await http.post("/members", row);
          } catch {}
        }
      }
      const res = await http.get("/members");
      setMembers(res.data);
      toast.success(`Đã nhập ${payload.length} dòng`);
    } catch (err) {
      toast.error("Nhập dữ liệu thất bại");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const roleBadge = (role: string) => (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium border ${
        role === "leader"
          ? "bg-yellow-100 text-yellow-800 border-yellow-300"
          : role === "organizer"
          ? "bg-purple-100 text-purple-800 border-purple-300"
          : role === "moderator"
          ? "bg-blue-100 text-blue-800 border-blue-300"
          : "bg-gray-100 text-gray-800 border-gray-300"
      }`}
    >
      {getRoleDisplay(role)}
    </span>
  );

  // Derived: filtered + sorted + paginated
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = members.filter((m) => {
    const matchName = normalizedQuery
      ? (m.ingameName || "").toLowerCase().includes(normalizedQuery) ||
        (m.username || "").toLowerCase().includes(normalizedQuery)
      : true;
    const matchRole = roleFilter === "all" ? true : m.role === roleFilter;
    return matchName && matchRole;
  });

  // Sort by priority: admin roles → current user → other members
  const sorted = [...filtered].sort((a, b) => {
    const roleOrder = { leader: 1, organizer: 2, moderator: 3, member: 4 };
    const aRole = roleOrder[a.role as keyof typeof roleOrder] || 5;
    const bRole = roleOrder[b.role as keyof typeof roleOrder] || 5;

    // If same role, prioritize current user
    if (aRole === bRole) {
      if (a._id === user?.id) return -1;
      if (b._id === user?.id) return 1;
      return 0;
    }

    return aRole - bRole;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = sorted.slice(start, start + PAGE_SIZE);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-4 md:px-6 md:py-6 lg:px-8 animate-fade-in gpu-accelerated">
      <div className="flex flex-row items-center justify-between gap-2 mb-6 animate-fade-in-down">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-red-600 flex items-center gap-2">
          <span className="animate-pulse">
            <i className="fa-solid fa-users"></i>
          </span>
          Thành viên Clan ({members.length})
        </h1>
        {(user?.role === "leader" || user?.role === "organizer") && (
          <div className="flex flex-row gap-2">
            <button
              onClick={exportMembers}
              className="px-2 md:px-3 py-1 md:py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs md:text-sm font-semibold shadow transition-smooth hover-lift gpu-accelerated"
              title="Xuất Excel"
            >
              <i className="fa-solid fa-download"></i>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2 md:px-3 py-1 md:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs md:text-sm font-semibold shadow transition-smooth hover-lift gpu-accelerated"
              title="Nhập dữ liệu từ Excel"
            >
              <i className="fa-solid fa-upload"></i>
            </button>
            <Link
              to="/admin"
              className="px-2 md:px-3 py-1 md:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs md:text-sm font-semibold shadow transition-smooth hover-lift gpu-accelerated"
            >
              QL
            </Link>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>
        )}
      </div>

      {/* Toolbar: search + role filter */}
      <div className="mb-4 flex flex-row gap-2 items-center justify-between animate-fade-in-up">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchParams({ page: "1" });
              }}
              placeholder="Tìm theo tên..."
              className="w-full p-2 md:p-3 text-sm bg-white rounded-lg border-2 border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-smooth gpu-accelerated"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              ⌕
            </span>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setSearchParams({ page: "1" });
            }}
            className="px-3 py-2 bg-white rounded-lg border-2 border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-smooth gpu-accelerated"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="leader">Trưởng Clan</option>
            <option value="organizer">Ban Tổ Chức</option>
            <option value="moderator">Quản Trị Viên</option>
            <option value="member">Thành Viên</option>
          </select>
        </div>
        <div className="text-xs md:text-sm text-gray-600 hidden sm:block">
          {sorted.length} kết quả • Trang {currentPage}/{totalPages}
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl border-2 border-gray-200 shadow-sm animate-scale-in gpu-accelerated">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 md:px-3 py-2 md:py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Thành viên
              </th>
              <th className="hidden md:table-cell px-2 md:px-3 py-2 md:py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Tên trong game
              </th>
              <th className="hidden lg:table-cell px-2 md:px-3 py-2 md:py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                HẠNG
              </th>
              <th className="hidden lg:table-cell px-2 md:px-3 py-2 md:py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                VỊ TRÍ
              </th>
              <th className="hidden sm:table-cell px-2 md:px-3 py-2 md:py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Vai trò
              </th>
              <th className="hidden xl:table-cell px-2 md:px-3 py-2 md:py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Tham gia
              </th>
              {canManage && (
                <th className="px-2 md:px-3 py-2 md:py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Hành động
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageItems.map((m) => (
              <tr
                key={m._id}
                className="hover:bg-gray-50 transition-smooth hover-lift stagger-item gpu-accelerated"
              >
                <td className="px-2 md:px-3 py-2 md:py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <img
                      src={m.avatarUrl || "https://placehold.co/64x64"}
                      alt={m.username}
                      className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover border-2 border-red-600 hover-grow transition-smooth gpu-accelerated"
                    />
                    <div>
                      <div className="font-semibold text-gray-900 text-xs md:text-sm">
                        {m.username}
                      </div>
                      <div className="text-xs text-gray-500 md:hidden">
                        {m.ingameName}
                      </div>
                      <div className="hidden md:block text-xs text-gray-500">
                        ID: {m._id.slice(-6)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="hidden md:table-cell px-2 md:px-3 py-2 md:py-3 text-xs md:text-sm text-gray-800">
                  {m.ingameName}
                </td>
                <td className="hidden lg:table-cell px-2 md:px-3 py-2 md:py-3 text-gray-700">
                  <span className="text-xs md:text-sm">{m.rank || "—"}</span>
                </td>
                <td className="hidden lg:table-cell px-2 md:px-3 py-2 md:py-3 text-gray-700">
                  <span className="text-xs">{m.lane || "—"}</span>
                </td>
                <td className="hidden sm:table-cell px-2 md:px-3 py-2 md:py-3">
                  {roleBadge(m.role)}
                </td>
                <td className="hidden xl:table-cell px-2 md:px-3 py-2 md:py-3 text-xs md:text-sm text-gray-700">
                  {new Date(m.joinDate).toLocaleDateString("vi-VN")}
                </td>
                {canManage && (
                  <td className="px-2 md:px-3 py-2 md:py-3">
                    <div className="flex items-center justify-end gap-1 sm:gap-2">
                      <button
                        onClick={() => viewMember(m)}
                        className="px-2 md:px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs md:text-sm font-medium transition-smooth hover-lift gpu-accelerated"
                        title="Xem chi tiết"
                      >
                        <i className="fa-regular fa-eye"></i> Xem
                      </button>
                      <button
                        onClick={() => setConfirmKick(m)}
                        className="px-2 md:px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs md:text-sm font-semibold transition-smooth hover-shrink gpu-accelerated"
                        title="Kick khỏi clan"
                      >
                        <i className="fa-solid fa-ban"></i> Kick
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-center gap-2 animate-fade-in-up">
        <button
          disabled={currentPage <= 1}
          onClick={() =>
            setSearchParams({ page: String(Math.max(1, currentPage - 1)) })
          }
          className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium ${
            currentPage <= 1
              ? "border-gray-200 text-gray-400 cursor-not-allowed"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          Trước
        </button>
        <span className="text-sm text-gray-700">
          {currentPage}/{totalPages}
        </span>
        <button
          disabled={currentPage >= totalPages}
          onClick={() =>
            setSearchParams({
              page: String(Math.min(totalPages, currentPage + 1)),
            })
          }
          className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium ${
            currentPage >= totalPages
              ? "border-gray-200 text-gray-400 cursor-not-allowed"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          Sau
        </button>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border-2 border-gray-200">
            <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                Thông tin thành viên
              </h2>
              <button
                onClick={() => setSelected(null)}
                className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
              >
                Đóng
              </button>
            </div>
            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={selected.avatarUrl || "https://placehold.co/96x96"}
                  alt={selected.username}
                  className="w-16 h-16 rounded-full object-cover border-2 border-red-600"
                />
                <div>
                  <div className="text-lg font-semibold">
                    {selected.username}
                  </div>
                  <div className="text-sm text-gray-600">
                    {selected.ingameName}
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-700 space-y-2">
                <div className="flex items-center gap-2">
                  Vai trò: {roleBadge(selected.role)}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className={`rounded-lg p-3 border-2 ${
                      selected.rank
                        ? `${getRankColors(selected.rank).bg} ${
                            getRankColors(selected.rank).border
                          }`
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div
                      className={`text-xs font-semibold mb-1 ${
                        selected.rank
                          ? getRankColors(selected.rank).text
                          : "text-gray-600"
                      }`}
                    >
                      HẠNG
                    </div>
                    <div
                      className={`text-sm font-bold ${
                        selected.rank
                          ? getRankColors(selected.rank).text
                          : "text-gray-700"
                      }`}
                    >
                      {selected.rank || "Chưa cập nhật"}
                    </div>
                  </div>
                  <div
                    className={`rounded-lg p-3 border-2 ${
                      selected.lane
                        ? `${getLaneColors(selected.lane).bg} ${
                            getLaneColors(selected.lane).border
                          }`
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div
                      className={`text-xs font-semibold mb-1 ${
                        selected.lane
                          ? getLaneColors(selected.lane).text
                          : "text-gray-600"
                      }`}
                    >
                      VỊ TRÍ
                    </div>
                    <div
                      className={`text-sm font-bold ${
                        selected.lane
                          ? getLaneColors(selected.lane).text
                          : "text-gray-700"
                      }`}
                    >
                      {selected.lane || "Chưa cập nhật"}
                    </div>
                  </div>
                </div>
                <p>
                  Tham gia:{" "}
                  {new Date(selected.joinDate).toLocaleDateString("vi-VN")}
                </p>
                <p className="text-gray-500">ID: {selected._id}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmKick}
        title="Xác nhận kick thành viên"
        message={`Bạn có chắc chắn muốn kick ${confirmKick?.username} khỏi clan? Thành viên này sẽ bị xóa khỏi dữ liệu.`}
        confirmText="Kick"
        cancelText="Hủy"
        onConfirm={kickMember}
        onClose={() => setConfirmKick(null)}
      />
    </div>
  );
}
