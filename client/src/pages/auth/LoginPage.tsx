import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/login`, { username, password });
      login(res.data.token, res.data.user);
      navigate("/");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-xl shadow-2xl border-2 border-gray-200">
      <h1 className="text-3xl font-bold text-red-600 mb-6 text-center">
        Đăng nhập
      </h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block mb-1 text-gray-700 font-medium">
            Tên đăng nhập
          </label>
          <input
            className="w-full p-3 bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Tên đăng nhập"
            required
          />
        </div>
        <div>
          <label className="block mb-1 text-gray-700 font-medium">
            Mật khẩu
          </label>
          <input
            type="password"
            className="w-full p-3 bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mật khẩu"
            required
          />
        </div>
        <button
          disabled={loading}
          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold disabled:opacity-50 transition shadow-lg hover:shadow-xl"
        >
          {loading ? "Đang xử lý..." : "Đăng nhập"}
        </button>
      </form>
      <div className="mt-4 flex items-center justify-between text-sm">
        <Link
          to="/forgot-password"
          className="text-red-600 hover:text-red-700 font-medium"
        >
          Quên mật khẩu?
        </Link>
        <div className="text-gray-600">
          Chưa có tài khoản?{" "}
          <Link
            to="/register"
            className="text-red-600 hover:text-red-700 font-medium"
          >
            Đăng ký
          </Link>
        </div>
      </div>
    </div>
  );
}
