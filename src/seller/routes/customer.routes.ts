import { Router } from "express";
import customerController from "../controllers/customer.controller";

const router = Router();

router.post(
  "",
  // checkPermission(Permission.CREATE_EMPLOYEE),
  customerController.create
);

export default router;
