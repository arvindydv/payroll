import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";
import {
  exportExcel,
  exportPayslipPdf,
  finalize,
  generate,
  list,
  update,
} from "../controllers/payrollController";

const router = Router();
router.use(requireAuth);

router.post("/generate", asyncHandler(generate));
router.get("/", asyncHandler(list));
router.get("/export", asyncHandler(exportExcel));
router.put("/:id", asyncHandler(update));
router.post("/:id/finalize", asyncHandler(finalize));
router.get("/:id/pdf", asyncHandler(exportPayslipPdf));

export default router;
