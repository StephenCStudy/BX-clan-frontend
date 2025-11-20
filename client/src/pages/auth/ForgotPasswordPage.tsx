import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

export default function ForgotPasswordPage() {
  const [ingameName, setIngameName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    username: string;
    ingameName: string;
    password: string;
  } | null>(null);
  const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await axios.post(`${API}/auth/forgot-password`, {
        ingameName: ingameName.trim(),
      });
      setResult({
        username: res.data.username,
        ingameName: res.data.ingameName,
        password: res.data.password,
      });
      toast.success("Đã tạo mật khẩu mới thành công!");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Không tìm thấy tên trong game"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-xl shadow-2xl border-2 border-gray-200">
      <h1 className="text-3xl font-bold text-red-600 mb-6 text-center">
        Quên mật khẩu
      </h1>

      {!result ? (
        <>
          <p className="text-gray-600 mb-6 text-center">
            Nhập tên trong game để khôi phục tài khoản. Hệ thống sẽ tạo mật khẩu
            mới cho bạn.
          </p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block mb-1 text-gray-700 font-medium">
                Tên trong game
              </label>
              <input
                className="w-full p-3 bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                value={ingameName}
                onChange={(e) => setIngameName(e.target.value)}
                placeholder="VD: bx-member#0000"
                required
              />
            </div>
            <button
              disabled={loading}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold disabled:opacity-50 transition shadow-lg hover:shadow-xl"
            >
              {loading ? "Đang xử lý..." : "Khôi phục tài khoản"}
            </button>
          </form>
        </>
      ) : (
        <div className="space-y-6">
          <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
            <h2 className="text-xl font-bold text-green-700 mb-4 flex items-center gap-2">
              <span>✅</span> Khôi phục thành công!
            </h2>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-4 border border-green-300">
                <div className="text-sm text-gray-600 mb-1">
                  Tên trong game:
                </div>
                <div className="text-lg font-bold text-green-700">
                  {result.ingameName}
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-green-300">
                <div className="text-sm text-gray-600 mb-1">Tên đăng nhập:</div>
                <div className="text-2xl font-bold text-gray-900">
                  {result.username}
                </div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-400">
                <div className="text-sm text-yellow-700 mb-1 font-semibold">
                  🔑 Mật khẩu mới của bạn:
                </div>
                <div className="text-2xl font-bold text-red-600 font-mono bg-white p-3 rounded border border-yellow-300">
                  {result.password}
                </div>
              </div>
              <div className="text-sm text-red-600 bg-red-50 p-4 rounded-lg border-2 border-red-200">
                <strong>⚠️ LƯU Ý QUAN TRỌNG:</strong>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Hãy lưu lại mật khẩu này ngay!</li>
                  <li>Mật khẩu chỉ hiển thị một lần duy nhất</li>
                  <li>Bạn có thể đổi mật khẩu sau khi đăng nhập</li>
                </ul>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setResult(null);
              setIngameName("");
            }}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition"
          >
            Tìm tài khoản khác
          </button>
        </div>
      )}

      <div className="mt-6 text-center">
        <Link
          to="/login"
          className="text-red-600 hover:text-red-700 font-medium"
        >
          ← Quay lại đăng nhập
        </Link>
      </div>
    </div>
  );
}
