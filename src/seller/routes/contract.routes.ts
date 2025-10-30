import { Router } from "express";
import contractController from "../controllers/contract.controller";

const router = Router();

router.post("", contractController.create);
router.post("/post", contractController.post);

export default router;
