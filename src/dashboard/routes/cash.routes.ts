import { Router } from "express";
import { Permission } from "../../enums/permission.enum";
import { checkPermission } from "../../middlewares/CheckPermission.middleware";
import cashController from "../controllers/cash.controller";

const router = Router();

router.get(
  "/get-all",
  // checkPermission(Permission.VIEW_DEBTOR),
  cashController.getAll
);
router.put(
  "/confirmation",
  // checkPermission(Permission.VIEW_DEBTOR),
  cashController.confirmations
);

// Yangi route'lar
router.get(
  "/pending",
  // checkPermission(Permission.VIEW_CASH),
  cashController.getPendingPayments
);

router.post(
  "/confirm-payments",
  // checkPermission(Permission.UPDATE_CASH),
  cashController.confirmPayments
);

router.post(
  "/reject-payment",
  // checkPermission(Permission.UPDATE_CASH),
  cashController.rejectPayment
);

export default router;
