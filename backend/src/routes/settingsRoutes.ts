import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";
import { get, update } from "../controllers/settingsController";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(get));
router.put("/", asyncHandler(update));

export default router;
