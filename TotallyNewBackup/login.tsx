// src/pages/login.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [telegram, setTelegram] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: any) => {
    e.preventDefault();

    // Later: check this Telegram ID against backend
    localStorage.setItem("userTelegram", telegram);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-6">
      <h1 className="text-3xl font-bold mb-6">Welcome Back</h1>

      <form onSubmit={handleLogin} className="w-full max-w-md space-y-4">
        <input
          type="text"
          placeholder="Enter Telegram Username"
          value={telegram}
          onChange={(e) => setTelegram(e.target.value)}
          required
          className="w-full p-3 rounded-md bg-white/10 text-white placeholder-gray-400"
        />

        <button
          type="submit"
          className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-md font-semibold"
        >
          Login to Dashboard
        </button>
      </form>
    </div>
  );
};

export default Login;
