// src/pages/onboarding.tsx
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const Onboarding = () => {
  const [telegram, setTelegram] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: any) => {
    e.preventDefault();

    // Optional: send telegram to backend here
    localStorage.setItem("userTelegram", telegram);

    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-6">
      <h1 className="text-3xl font-bold mb-6">Let's Get You Set Up</h1>

const handleSubmit = async (e: any) => {
  e.preventDefault();

  try {
    await fetch("/api/onboarding", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ telegram }),
    });

    localStorage.setItem("userTelegram", telegram);
    navigate("/dashboard");
  } catch (err) {
    console.error("Failed to send Telegram info:", err);
  }
};


export default Onboarding;
