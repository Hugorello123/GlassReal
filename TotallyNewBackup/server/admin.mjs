// server/admin.mjs
import express from "express";
import db from "../db.mjs"; // adjust path if needed

const router = express.Router();

router.get("/admin/users", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM users ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
