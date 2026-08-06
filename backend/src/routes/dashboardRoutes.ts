import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";
import { summary } from "../controllers/dashboardController";

const router = Router();
router.use(requireAuth);

router.get("/summary", asyncHandler(summary));

export default router;
