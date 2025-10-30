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
      const user = req.user;
      const contractData = plainToInstance(CreateContractDto, req.body || {});
      const errors = await validate(contractData);
      if (errors.length > 0) {
        const formattedErrors = handleValidationErrors(errors);
        return next(
          BaseError.BadRequest("Shartnoma ma'lumotlari xato.", formattedErrors)
        );
      }
      const data = await contractService.create(contractData, user);
      res.status(201).json(data);
    } catch (error) {
      console.log("t", error);

      return next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;

      const contractData = plainToInstance(UpdateContractDto, req.body || {});
      const errors = await validate(contractData);
      if (errors.length > 0) {
        const formattedErrors = handleValidationErrors(errors);
        return next(
          BaseError.BadRequest("Shartnoma malumotlari xato.", formattedErrors)
        );
      }
      const data = await contractService.update(contractData, user);
      res.status(200).json(data);
    } catch (error) {
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
}

export default new ContractController();
