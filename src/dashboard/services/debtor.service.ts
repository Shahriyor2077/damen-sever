import BaseError from "../../utils/base.error";

import Contract, { ContractStatus } from "../../schemas/contract.schema";
import IJwtUser from "../../types/user";
import { Debtor } from "../../schemas/debtor.schema";

class DebtorService {
  async getDebtors() {
    try {
      const debtors = await Contract.aggregate([
        {
          $match: {
            isActive: true,
            isDeleted: false,
            status: ContractStatus.ACTIVE,
          },
        },
        {
          $lookup: {
            from: "customers",
            localField: "customer",
            foreignField: "_id",
            as: "customer",
          },
        },
        { $unwind: "$customer" },
        {
          $lookup: {
            from: "employees",
            localField: "customer.manager",
            foreignField: "_id",
            as: "manager",
          },
        },
        {
          $unwind: {
            path: "$manager",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "payments",
            localField: "payments",
            foreignField: "_id",
            as: "paymentDetails",
          },
        },
        {
          $addFields: {
            totalPaid: {
              $add: [
                {
                  $sum: {
                    $map: {
                      input: {
                        $filter: {
                          input: "$paymentDetails",
                          as: "p",
                          cond: { $eq: ["$$p.isPaid", true] },
                        },
                      },
                      as: "pp",
                      in: "$$pp.amount",
                    },
                  },
                },
                "$initialPayment",
              ],
            },
          },
        },
        {
          $addFields: {
            remainingDebt: {
              $subtract: ["$totalPrice", "$totalPaid"],
            },
          },
        },
        {
          $group: {
            _id: "$customer._id",
            firstName: { $first: "$customer.firstName" },
            lastName: { $first: "$customer.lastName" },
            phoneNumber: { $first: "$customer.phoneNumber" },
            managerFirstName: { $first: "$manager.firstName" },
            managerLastName: { $first: "$manager.lastName" },
            activeContractsCount: { $sum: 1 },
            totalPrice: { $sum: "$totalPrice" },
            totalPaid: { $sum: "$totalPaid" },
            remainingDebt: { $sum: "$remainingDebt" },
            nextPaymentDate: { $min: "$nextPaymentDate" },
          },
        },
        {
          $project: {
            _id: 1,
            fullName: {
              $concat: ["$firstName", " ", "$lastName"],
            },
            phoneNumber: 1,
            manager: {
              $concat: [
                { $ifNull: ["$managerFirstName", ""] },
                " ",
                { $ifNull: ["$managerLastName", ""] },
              ],
            },
            totalPrice: 1,
            totalPaid: 1,
            remainingDebt: 1,
            nextPaymentDate: 1,
            activeContractsCount: 1,
          },
        },
        { $sort: { totalDebt: -1 } },
      ]);
      return debtors;
    } catch (error) {
      console.error("Error fetching debtors report:", error);
      throw BaseError.InternalServerError(String(error));
    }
  }

  async getContract(startDate: string, endDate: string) {
    try {
      const today = new Date();
      let dateFilter: any = {};

      if (startDate && endDate) {
        dateFilter = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      } else {
        dateFilter = { $lte: today };
      }

      return await Contract.aggregate([
        {
          $match: {
            isDeleted: false,
            isActive: true,
            isDeclare: false,
            status: ContractStatus.ACTIVE,
            nextPaymentDate: dateFilter,
          },
        },
        {
          $lookup: {
            from: "customers",
            localField: "customer",
            foreignField: "_id",
            as: "customer",
          },
        },
        { $unwind: "$customer" },
        {
          $lookup: {
            from: "employees",
            localField: "customer.manager",
            foreignField: "_id",
            as: "manager",
          },
        },
        {
          $unwind: {
            path: "$manager",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "payments",
            localField: "payments",
            foreignField: "_id",
            as: "paymentDetails",
          },
        },
        {
          $addFields: {
            totalPaid: {
              $add: [
                {
                  $sum: {
                    $map: {
                      input: {
                        $filter: {
                          input: "$paymentDetails",
                          as: "p",
                          cond: { $eq: ["$$p.isPaid", true] },
                        },
                      },
                      as: "pp",
                      in: "$$pp.amount",
                    },
                  },
                },
                "$initialPayment",
              ],
            },
          },
        },
        {
          $addFields: {
            remainingDebt: {
              $subtract: ["$totalPrice", "$totalPaid"],
            },
          },
        },
        {
          $addFields: {
            delayDays: {
              $cond: [
                { $lt: ["$nextPaymentDate", today] },
                {
                  $dateDiff: {
                    startDate: "$nextPaymentDate",
                    endDate: today,
                    unit: "day",
                  },
                },
                0,
              ],
            },
          },
        },
        {
          $project: {
            // _id: 1,
            _id: "$customer._id",
            fullName: {
              $concat: ["$customer.firstName", " ", "$customer.lastName"],
            },
            phoneNumber: "$customer.phoneNumber",
            manager: {
              $concat: [
                { $ifNull: ["$manager.firstName", ""] },
                " ",
                { $ifNull: ["$manager.lastName", ""] },
              ],
            },
            totalPrice: 1,
            totalPaid: 1,
            remainingDebt: 1,
            nextPaymentDate: 1,
            productName: "$productName",
            startDate: 1,
            delayDays: 1,
            initialPayment: 1,
          },
        },
        { $sort: { "dates.nextPaymentDate": 1 } },
      ]);
    } catch (error) {
      console.error("Error fetching contracts by payment date:", error);
      throw BaseError.InternalServerError(
        "Shartnomalarni olishda xatolik yuz berdi"
      );
    }
  }

  async declareDebtors(user: IJwtUser, contractIds: string[]) {
    const contracts = await Contract.find({
      _id: { $in: contractIds },
    });

    if (contracts.length === 0) {
      throw BaseError.BadRequest(
        "E'lon qilish uchun mos qarzdorliklar topilmadi"
      );
    }

    for (const contract of contracts) {
      contract.isDeclare = true;

      // Debtor yaratishdan oldin mavjudligini tekshirish
      const existingDebtor = await Debtor.findOne({
        contractId: contract._id,
        "payment.isPaid": { $ne: true },
      });

      if (!existingDebtor) {
        await Debtor.create({
          contractId: contract._id,
          debtAmount: contract.monthlyPayment,
          createBy: user.sub,
          currencyDetails: {
            dollar: 0,
            sum: 0,
          },
          currencyCourse: 12500, // Default currency course
        });
      }

      await contract.save();
    }

    return { message: "Qarzdorlar e'lon qilindi." };
  }

  // Avtomatik debtor yaratish funksiyasi
  async createOverdueDebtors() {
    try {
      const today = new Date();

      // Muddati o'tgan shartnomalarni topish
      const overdueContracts = await Contract.find({
        isActive: true,
        isDeleted: false,
        isDeclare: false,
        status: ContractStatus.ACTIVE,
        nextPaymentDate: { $lte: today },
      });

      let createdCount = 0;

      for (const contract of overdueContracts) {
        // Ushbu shartnoma uchun to'lanmagan debtor mavjudligini tekshirish
        const existingDebtor = await Debtor.findOne({
          contractId: contract._id,
          "payment.isPaid": { $ne: true },
        });

        if (!existingDebtor) {
          await Debtor.create({
            contractId: contract._id,
            debtAmount: contract.monthlyPayment,
            createBy: contract.createBy,
            currencyDetails: {
              dollar: 0,
              sum: 0,
            },
            currencyCourse: 12500,
          });
          createdCount++;
        }
      }

      console.log(`Created ${createdCount} new debtors for overdue contracts`);
      return { created: createdCount };
    } catch (error) {
      console.error("Error creating overdue debtors:", error);
      throw BaseError.InternalServerError("Qarzdorlar yaratishda xatolik");
    }
  }
}

export default new DebtorService();
