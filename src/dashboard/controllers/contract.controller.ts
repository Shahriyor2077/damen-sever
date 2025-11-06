import { Request, Response, NextFunction } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { handleValidationErrors } from "../../validators/format";
import BaseError from "../../utils/base.error";
import contractService from "../services/contract.service";
import {
  CreateContractDto,
  SellerCreateContractDto,
  UpdateContractDto,
} from "../../validators/contract";

class ContractController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await contractService.getAll();
      res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  }

  async getNewAll(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("getNewAll called");
      const data = await contractService.getAllNewContract();
      res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  }

  async getAllCompleted(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await contractService.getAllCompleted();
      res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  }

  async getContractById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const data = await contractService.getContractById(id);
      res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("🎯 CONTRACT CONTROLLER CREATE CALLED");
      console.log("📦 Request body:", JSON.stringify(req.body, null, 2));
      console.log("👤 User:", req.user);

      const user = req.user;
      const contractData = plainToInstance(CreateContractDto, req.body || {});
      const errors = await validate(contractData);

      if (errors.length > 0) {
        console.log("❌ Validation errors:", errors);
        const formattedErrors = handleValidationErrors(errors);
        return next(
          BaseError.BadRequest("Shartnoma ma'lumotlari xato.", formattedErrors)
        );
      }

      console.log("✅ Validation passed, calling service...");
      const data = await contractService.create(contractData, user);
      console.log("✅ Service returned:", data);
      res.status(201).json(data);
    } catch (error) {
      console.log("❌ Controller error:", error);
      return next(error);
    }
  }

  /**
   * Shartnomani yangilash
   * Requirements: 10.1, 10.2, 10.3, 10.4
   *
   * Bu metod shartnoma ma'lumotlarini yangilaydi va barcha ta'sirlarni qaytaradi:
   * - Request body validatsiya
   * - Service chaqirish
   * - Success response formatlash
   * - Error handling va logging
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("🔄 === CONTRACT CONTROLLER UPDATE CALLED ===");
      console.log("📦 Request body:", JSON.stringify(req.body, null, 2));
      console.log("👤 User:", req.user?.sub);

      // 1. User ma'lumotlarini olish
      const user = req.user;
      if (!user) {
        console.log("❌ User not authenticated");
        return next(
          BaseError.UnauthorizedError(
            "Foydalanuvchi autentifikatsiya qilinmagan"
          )
        );
      }

      // 2. Request body validatsiya (Requirement 10.1)
      console.log("🔍 Validating request body...");
      const contractData = plainToInstance(UpdateContractDto, req.body || {});
      const errors = await validate(contractData);

      if (errors.length > 0) {
        console.log("❌ Validation errors:", errors);
        const formattedErrors = handleValidationErrors(errors);
        return next(
          BaseError.BadRequest("Shartnoma ma'lumotlari xato.", formattedErrors)
        );
      }
      console.log("✅ Validation passed");

      // 3. Service chaqirish (Requirement 10.2)
      console.log("📞 Calling contractService.update()...");
      const result = await contractService.update(contractData, user);
      console.log("✅ Service call successful");

      // 4. Success response formatlash (Requirement 10.3)
      console.log("📤 Formatting response...");
      const response = {
        success: true,
        message: result.message,
        data: {
          changes: result.changes,
          impactSummary: {
            underpaidCount: result.impactSummary.underpaidCount,
            overpaidCount: result.impactSummary.overpaidCount,
            totalShortage: result.impactSummary.totalShortage,
            totalExcess: result.impactSummary.totalExcess,
            additionalPaymentsCreated:
              result.impactSummary.additionalPaymentsCreated,
          },
          affectedPaymentsCount: result.affectedPayments,
        },
        timestamp: new Date().toISOString(),
      };

      console.log("🎉 === CONTRACT CONTROLLER UPDATE COMPLETED ===");
      console.log("📊 Response summary:", {
        changesCount: result.changes.length,
        affectedPayments: result.affectedPayments,
        underpaidCount: result.impactSummary.underpaidCount,
        overpaidCount: result.impactSummary.overpaidCount,
      });

      res.status(200).json(response);
    } catch (error) {
      // 5. Error handling va logging (Requirement 10.4)
      console.error("❌ === CONTRACT CONTROLLER UPDATE FAILED ===");
      console.error("Error details:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return next(error);
    }
  }

  async sellerCreate(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      const contractData = plainToInstance(CreateContractDto, req.body || {});
      const errors = await validate(contractData);
      if (errors.length > 0) {
        const formattedErrors = handleValidationErrors(errors);
        return next(
          BaseError.BadRequest("Shartnoma ma'lumotlari xato.", formattedErrors)
        );
      }
      const data = await contractService.sellerCreate(contractData, user);
      res.status(201).json(data);
    } catch (error) {
      console.log("er", error);

      return next(error);
    }
  }

  async approveContract(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user;
      const data = await contractService.approveContract(id, user);
      res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Ta'sir tahlili - shartnoma tahrirlashdan oldin
   * Requirements: 1.2, 1.3, 1.4, 1.5
   */
  async analyzeImpact(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("🔍 === ANALYZE IMPACT CALLED ===");
      const { id } = req.params;
      const { monthlyPayment, initialPayment, totalPrice } = req.body;

      console.log("📋 Contract ID:", id);
      console.log("📊 New values:", {
        monthlyPayment,
        initialPayment,
        totalPrice,
      });

      // Validatsiya
      if (!monthlyPayment || monthlyPayment < 0) {
        throw BaseError.BadRequest("Oylik to'lov noto'g'ri");
      }

      if (initialPayment !== undefined && initialPayment < 0) {
        throw BaseError.BadRequest("Boshlang'ich to'lov noto'g'ri");
      }

      if (totalPrice !== undefined && totalPrice <= initialPayment) {
        throw BaseError.BadRequest(
          "Umumiy narx boshlang'ich to'lovdan katta bo'lishi kerak"
        );
      }

      // Service chaqirish
      const result = await contractService.analyzeContractEditImpact(id, {
        monthlyPayment,
        initialPayment,
        totalPrice,
      });

      console.log("✅ Impact analysis completed");
      res.status(200).json(result);
    } catch (error) {
      console.error("❌ === ANALYZE IMPACT FAILED ===");
      console.error("Error:", error);
      return next(error);
    }
  }
}

export default new ContractController();
