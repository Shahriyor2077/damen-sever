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

export default router;
