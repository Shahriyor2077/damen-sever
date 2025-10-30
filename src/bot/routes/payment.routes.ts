import { Router } from "express";
import paymentController from "../controllers/payment.controller";
const router = Router();

router.post("/pay-debt", paymentController.payDebt);
router.post("/pay-new-debt", paymentController.payNewDebt);

export default router;
