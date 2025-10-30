import { Router } from "express";
import paymentController from "../controllers/payment.controller";
import { checkPermission } from "../../middlewares/CheckPermission.middleware";
import { Permission } from "../../enums/permission.enum";
const router = Router();

router.put(
  "",
  checkPermission(Permission.UPDATE_CASH),
  paymentController.update
);

export default router;
