import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import api from "../../services/api";
import { isLoggedIn, setToken } from "../../services/auth";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (isLoggedIn()) {
    return <Navigate to="/manage" replace />;
  }

  const submitHandler = async (event) => {
    event.preventDefault();

    if (!identifier.trim() || !password) {
      toast.error("نام کاربری و کلمه عبور را وارد کنید.");
      return;
    }

    try {
      setLoading(true);

      const { data } = await api.post("/auth/local", {
        identifier: identifier.trim(),
        password,
      });

      setToken(data.jwt);
      toast.success("خوش آمدید.");
      navigate("/manage", { replace: true });
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 401) {
        toast.error("نام کاربری یا کلمه عبور اشتباه است.");
      } else if (error.response) {
        toast.error("خطایی در سرور رخ داده است.");
      } else {
        toast.error("اتصال به سرور برقرار نشد.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#17150f] w-full h-screen flex items-center justify-center">
      <form
        onSubmit={submitHandler}
        className="w-[80%] max-w-md h-100 bg-[#f8f1ea] flex flex-col gap-8 items-center justify-center rounded-2xl px-6"
      >
        <h1 className="text-xl font-bold text-[#7E543A]">ورود مدیریت</h1>

        <input
          className="w-[90%] h-12 border bg-amber-100 text-center text-gray-700 rounded-3xl outline-none focus:border-[#7E543A]"
          placeholder="نام کاربری یا ایمیل"
          type="text"
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          disabled={loading}
        />

        <input
          className="w-[90%] h-12 border bg-amber-100 text-center text-gray-700 rounded-3xl outline-none focus:border-[#7E543A]"
          placeholder="کلمه عبور"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-[#7E543A] text-white w-28 h-11 rounded-2xl cursor-pointer hover:bg-[#926244] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "..." : "ورود"}
        </button>
      </form>

      <Toaster />
    </div>
  );
};

export default AdminLogin;
