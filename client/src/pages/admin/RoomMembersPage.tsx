import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { http } from "../../utils/http";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import ConfirmModal from "../../components/ConfirmModal";

interface Registration {
  _id: string;
  user: {
    _id: string;
    username: string;
    ingameName: string;
    avatarUrl?: string;
  };
  ingameName: string;
  lane: string;
  rank: string;
  status: string;
}

interface Member {
  _id: string;
  username: string;
  ingameName: string;
  avatarUrl?: string;
  lane?: string;
  rank?: string;
}

export default function RoomMembersPage() {
  const { newsId, roomId } = useParams<{ newsId: string; roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Registration | null>(null);
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [newsInfo, setNewsInfo] = useState<any>(null);

  const canManage =
    user &&
    (user.role === "leader" ||
      user.role === "organizer" ||
      user.role === "moderator");

  useEffect(() => {
    if (!canManage) {
      toast.error("Bạn không có quyền truy cập");
      navigate("/admin");
      return;
    }
    loadData();
  }, [newsId, roomId]);

  const loadData = async () => {
    try {
      // Load news info
      const newsRes = await http.get(`/news/${newsId}`);
      setNewsInfo(newsRes.data);

      // Load all registrations for this news
      const regRes = await http.get(
        `/registrations/news/${newsId}/registrations`
      );
      setRegistrations(regRes.data);

      // Load all rooms to find this specific room
      const roomsRes = await http.get(`/registrations/news/${newsId}/rooms`);
      const room = roomsRes.data.find((r: any) => r._id === roomId);
      setRoomInfo(room);

      // Load all members for adding
      const membersRes = await http.get("/members");
      setAllMembers(membersRes.data);
    } catch (err) {
      toast.error("Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const removeRegistration = async () => {
    if (!confirmDelete) return;
    try {
      await http.delete(`/registrations/${confirmDelete._id}`);
      setRegistrations((prev) =>
        prev.filter((r) => r._id !== confirmDelete._id)
      );
      toast.success("Đã xóa thành viên khỏi phòng");
      setConfirmDelete(null);
      loadData(); // Reload to update room info
    } catch (err) {
      toast.error("Lỗi xóa thành viên");
    }
  };

  const addMemberToRoom = async (member: Member) => {
    try {
      await http.post(`/registrations/news/${newsId}/register`, {
        ingameName: member.ingameName || member.username,
        lane: member.lane || "Chưa xác định",
        rank: member.rank || "Chưa xác định",
        roomId: roomId,
      });
      toast.success("Đã thêm thành viên vào phòng");
      setShowAddModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi thêm thành viên");
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-600">Đang tải...</div>;
  }

  // Filter registrations for this room
  const roomRegistrations = registrations.filter(
    (r: any) => r.room?._id === roomId
  );

  // Filter available members (not in this room)
  const registeredUserIds = new Set(roomRegistrations.map((r) => r.user._id));
  const availableMembers = allMembers.filter(
    (m) => !registeredUserIds.has(m._id)
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => navigate("/admin/rooms")}
            className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium"
          >
            ← Quay lại
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-teal-600">
            Quản lý thành viên phòng
          </h1>
        </div>
        {newsInfo && (
          <div className="bg-teal-50 border-2 border-teal-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Tin tức:</p>
            <p className="font-semibold text-gray-900">{newsInfo.title}</p>
          </div>
        )}
        {roomInfo && (
          <div className="mt-3 bg-white border-2 border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-gray-900">
                  Phòng {roomInfo.roomNumber}
                </p>
                <p className="text-sm text-gray-600">
                  {roomInfo.players?.length || 0}/{roomInfo.maxPlayers} người
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold ${
                  roomInfo.status === "full"
                    ? "bg-red-100 text-red-600"
                    : "bg-green-100 text-green-600"
                }`}
              >
                {roomInfo.status === "full" ? "Đầy" : "Còn chỗ"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {canManage && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold shadow-md flex items-center gap-2"
            disabled={roomInfo?.status === "full"}
          >
            <i className="fa-solid fa-plus"></i> Thêm thành viên
          </button>
        </div>
      )}

      {/* Members List */}
      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-md">
        <div className="p-4 border-b-2 border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Danh sách đã đăng ký ({roomRegistrations.length})
          </h2>
        </div>
        <div className="divide-y divide-gray-200">
          {roomRegistrations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Chưa có thành viên nào trong phòng
            </div>
          ) : (
            roomRegistrations.map((reg) => (
              <div
                key={reg._id}
                className="p-4 hover:bg-gray-50 transition flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={reg.user.avatarUrl || "https://placehold.co/48x48"}
                    alt={reg.user.username}
                    className="w-12 h-12 rounded-full border-2 border-teal-500"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">
                      {reg.user.username}
                    </p>
                    <p className="text-sm text-gray-600">{reg.ingameName}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {reg.lane}
                      </span>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                        {reg.rank}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          reg.status === "approved"
                            ? "bg-green-100 text-green-700"
                            : reg.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {reg.status === "approved"
                          ? "Đã duyệt"
                          : reg.status === "pending"
                          ? "Chờ duyệt"
                          : "Từ chối"}
                      </span>
                    </div>
                  </div>
                </div>
                {canManage && (
                  <button
                    onClick={() => setConfirmDelete(reg)}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold inline-flex items-center gap-1"
                  >
                    <i className="fa-solid fa-trash"></i> Xóa
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                Thêm thành viên vào phòng
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm"
              >
                Đóng
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              {availableMembers.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Không còn thành viên nào để thêm
                </p>
              ) : (
                <div className="space-y-2">
                  {availableMembers.map((member) => (
                    <div
                      key={member._id}
                      className="flex items-center justify-between p-3 border-2 border-gray-200 rounded-lg hover:border-teal-500 transition"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={member.avatarUrl || "https://placehold.co/40x40"}
                          alt={member.username}
                          className="w-10 h-10 rounded-full border-2 border-gray-300"
                        />
                        <div>
                          <p className="font-semibold text-gray-900">
                            {member.username}
                          </p>
                          <p className="text-sm text-gray-600">
                            {member.ingameName}
                          </p>
                          {member.lane && (
                            <span className="text-xs text-gray-500">
                              {member.lane} • {member.rank}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => addMemberToRoom(member)}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold"
                      >
                        Thêm
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        open={!!confirmDelete}
        title="Xóa thành viên khỏi phòng"
        message={`Bạn có chắc chắn muốn xóa ${confirmDelete?.user.username} khỏi phòng này?`}
        confirmText="Xóa"
        cancelText="Hủy"
        onConfirm={removeRegistration}
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}
