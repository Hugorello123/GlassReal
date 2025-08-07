import express from "express";
import db from "../db.mjs";
import { sendTelegram } from "./telegram.mjs";

const router = express.Router();

router.post("/onboarding", async (req, res) => {
  const { telegram } = req.body;
  const email = req.headers["x-user-email"]; // Temp method for now

  if (!email || !telegram) {
    return res.status(400).json({ error: "Missing email or telegram" });
  }
  try {
    await db.query(
      "UPDATE users SET telegram = $1 WHERE email = $2",
      [telegram, email]
    );

    await sendTelegram(`✅ User completed onboarding:\n<b>${email}</b>\nTelegram: @${telegram}`);

    res.json({ success: true });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ error: "Database error" });
  }


  export default router;
