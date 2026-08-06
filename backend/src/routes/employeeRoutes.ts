import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";
import { create, get, list, remove, update } from "../controllers/employeeController";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(list));
router.get("/:id", asyncHandler(get));
router.post("/", asyncHandler(create));
router.put("/:id", asyncHandler(update));
router.delete("/:id", asyncHandler(remove));

export default router;
