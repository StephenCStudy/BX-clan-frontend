import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: "",
    ingameName: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error("Mật khẩu không khớp!");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Mật khẩu phải ít nhất 6 ký tự!");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/register`, {
        username: form.username,
        ingameName: form.ingameName,
        password: form.password,
      });
      login(res.data.token, res.data.user);
      navigate("/");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-xl shadow-2xl border-2 border-gray-200">
      <h1 className="text-3xl font-bold text-red-600 mb-6 text-center">
        Đăng ký
      </h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block mb-1 text-gray-700 font-medium">
            Tên đăng nhập
          </label>
          <input
            className="w-full p-3 bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="Tên đăng nhập"
            required
          />
        </div>
        <div>
          <label className="block mb-1 text-gray-700 font-medium">
            Tên trong game
          </label>
          <input
            className="w-full p-3 bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
            value={form.ingameName}
            onChange={(e) => setForm({ ...form, ingameName: e.target.value })}
            placeholder="Tên hiển thị trong Wild Rift"
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
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Ít nhất 6 ký tự"
            required
          />
        </div>
        <div>
          <label className="block mb-1 text-gray-700 font-medium">
            Xác nhận mật khẩu
          </label>
          <input
            type="password"
            className="w-full p-3 bg-gray-50 rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
            value={form.confirmPassword}
            onChange={(e) =>
              setForm({ ...form, confirmPassword: e.target.value })
            }
            placeholder="Nhập lại mật khẩu"
            required
          />
        </div>
        <button
          disabled={loading}
          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold disabled:opacity-50 transition shadow-lg hover:shadow-xl"
        >
          {loading ? "Đang xử lý..." : "Đăng ký"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600">
        Đã có tài khoản?{" "}
        <Link
          to="/login"
          className="text-red-600 hover:text-red-700 font-medium"
        >
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
