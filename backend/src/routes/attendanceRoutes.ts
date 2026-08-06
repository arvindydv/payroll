import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";
import { bulkUpsert, getMonthGrid } from "../controllers/attendanceController";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(getMonthGrid));
router.post("/bulk", asyncHandler(bulkUpsert));

export default router;
