import React, { useEffect, useState } from "react";
import { http } from "../utils/http";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

interface Room {
  _id: string;
  roomNumber: number;
  players: any[];
  maxPlayers: number;
  status: string;
}

interface RegisterModalProps {
  open: boolean;
  onClose: () => void;
  newsId: string;
  onSuccess?: () => void;
}

export default function RegisterModal({
  open,
  onClose,
  newsId,
  onSuccess,
}: RegisterModalProps) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    ingameName: "",
    lane: "",
    rank: "",
    roomId: "",
  });
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);

  const rankOptions = [
    { key: "Đồng", label: "Đồng" },
    { key: "Bạc", label: "Bạc" },
    { key: "Vàng", label: "Vàng" },
    { key: "Bạch Kim", label: "Bạch Kim" },
    { key: "Lục Bảo", label: "Lục Bảo" },
    { key: "Kim Cương", label: "Kim Cương" },
    { key: "Cao Thủ", label: "Cao Thủ" },
    { key: "Đại Cao Thủ", label: "Đại Cao Thủ" },
    { key: "Thách Đấu", label: "Thách Đấu" },
    { key: "Tối Cao", label: "Tối Cao" },
  ];

  const laneOptions = [
    { key: "Baron", label: "Baron" },
    { key: "Rừng", label: "Rừng" },
    { key: "Giữa", label: "Giữa" },
    { key: "Rồng", label: "Rồng" },
    { key: "Hỗ Trợ", label: "Hỗ Trợ" },
  ];

  useEffect(() => {
    if (open && user) {
      setForm({
        ingameName: user.ingameName || "",
        lane: (user as any).lane || "",
        rank: (user as any).rank || "",
        roomId: "",
      });
      loadRooms();
    }
  }, [open, user]);

  const loadRooms = async () => {
    try {
      const res = await http.get(`/registrations/news/${newsId}/rooms`);
      setRooms(res.data.filter((r: Room) => r.status !== "full"));
    } catch (err) {
      console.error("Failed to load rooms", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ingameName || !form.lane || !form.rank) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }
    setLoading(true);
    try {
      await http.post(`/registrations/news/${newsId}/register`, form);
      toast.success("Đăng ký thành công!");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border-2 border-gray-200 overflow-hidden">
        <div className="bg-linear-to-r from-red-600 via-red-700 to-orange-600 p-5">
          <h3 className="text-2xl font-bold text-white">Đăng ký tham gia</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Tên trong game
            </label>
            <input
              className="w-full p-3 bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 text-gray-900"
              value={form.ingameName}
              onChange={(e) => setForm({ ...form, ingameName: e.target.value })}
              placeholder="VD: PlayerName#123"
              required
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Vị trí
            </label>
            <select
              className="w-full p-3 bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 text-gray-900"
              value={form.lane}
              onChange={(e) => setForm({ ...form, lane: e.target.value })}
              required
            >
              <option value="">-- Chọn vị trí --</option>
              {laneOptions.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Hạng
            </label>
            <select
              className="w-full p-3 bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 text-gray-900"
              value={form.rank}
              onChange={(e) => setForm({ ...form, rank: e.target.value })}
              required
            >
              <option value="">-- Chọn hạng --</option>
              {rankOptions.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Phòng (tùy chọn)
            </label>
            <select
              className="w-full p-3 bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 text-gray-900"
              value={form.roomId}
              onChange={(e) => setForm({ ...form, roomId: e.target.value })}
            >
              <option value="">-- Để admin xếp tự động --</option>
              {rooms.map((r) => (
                <option key={r._id} value={r._id}>
                  Phòng {r.roomNumber} ({r.players.length}/{r.maxPlayers})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-lg border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-linear-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold shadow-lg disabled:opacity-50"
            >
              {loading ? "Đang xử lý..." : "Đăng ký"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
