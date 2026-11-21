import { Router } from "express";
import { pool } from "../db/pool";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, requireRole("ADMIN"), async (req, res) => {
  const role = req.query.role === "ADVISOR" ? "ADVISOR" : "STUDENT";

  const { rows } = await pool.query(
    `SELECT id, full_name, email, role, created_at
     FROM users
     WHERE role = $1
     ORDER BY created_at DESC`,
    [role]
  );

  res.json(rows);
});

export default router;

// token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiQURWSVNPUiIsImlhdCI6MTc5NDg2ODk4OCwiZXhwIjoxNzk0ODcyNTg4LCJzdWIiOiIxIn0.lA...