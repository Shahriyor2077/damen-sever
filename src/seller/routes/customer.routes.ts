import { Router } from "express";
import { uploadCustomerFiles } from "../../middlewares/upload.middleware";
import AuthMiddleware from "../../middlewares/auth.middleware";
import customerController from "../controllers/customer.controller";

const router = Router();

router.get("/get-new-all", AuthMiddleware, customerController.getAllNew);

router.post("", AuthMiddleware, uploadCustomerFiles, customerController.create);

export default router;
