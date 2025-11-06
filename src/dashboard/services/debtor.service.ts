import BaseError from "../../utils/base.error";
import Contract, { ContractStatus } from "../../schemas/contract.schema";
import IJwtUser from "../../types/user";
import { Debtor } from "../../schemas/debtor.schema";
import Payment from "../../schemas/payment.schema";

class DebtorService {
  /**
   * Qarzdorlarni ko'rish
   * Requirements: 7.2
   */
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

  /**
   * Muddati o'tgan shartnomalarni olish
   * Requirements: 3.1
   */
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

  /**
   * Qarzdorlarni e'lon qilish (manual)
   * Requirements: 3.1
   */
  async declareDebtors(user: IJwtUser, contractIds: string[]) {
    try {
      console.log("📢 === DECLARING DEBTORS (MANUAL) ===");

      const contracts = await Contract.find({
        _id: { $in: contractIds },
      });

      if (contracts.length === 0) {
        throw BaseError.BadRequest(
          "E'lon qilish uchun mos qarzdorliklar topilmadi"
        );
      }

      let createdCount = 0;

      for (const contract of contracts) {
        contract.isDeclare = true;
        await contract.save();

        // Debtor yaratishdan oldin mavjudligini tekshirish
        const existingDebtor = await Debtor.findOne({
          contractId: contract._id,
        });

        if (!existingDebtor) {
          const today = new Date();
          const overdueDays = Math.floor(
            (today.getTime() - contract.nextPaymentDate.getTime()) /
              (1000 * 60 * 60 * 24)
          );

          await Debtor.create({
            contractId: contract._id,
            debtAmount: contract.monthlyPayment,
            dueDate: contract.nextPaymentDate,
            overdueDays: Math.max(0, overdueDays),
            createBy: user.sub,
          });

          createdCount++;
        }
      }

      console.log(`✅ Created ${createdCount} debtors`);

      return { message: "Qarzdorlar e'lon qilindi.", created: createdCount };
    } catch (error) {
      console.error("❌ Error declaring debtors:", error);
      throw error;
    }
  }

  /**
   * Avtomatik qarzdorlar yaratish (har kecha 00:00)
   * Requirements: 3.1, 3.5
   */
  async createOverdueDebtors() {
    try {
      console.log("🤖 === AUTOMATIC DEBTOR CREATION ===");
      const today = new Date();

      // Muddati o'tgan shartnomalarni topish
      const overdueContracts = await Contract.find({
        isActive: true,
        isDeleted: false,
        isDeclare: false,
        status: ContractStatus.ACTIVE,
        nextPaymentDate: { $lte: today },
      });

      console.log(`📋 Found ${overdueContracts.length} overdue contracts`);

      let createdCount = 0;

      for (const contract of overdueContracts) {
        // Ushbu shartnoma uchun mavjud Debtor'ni tekshirish
        const existingDebtor = await Debtor.findOne({
          contractId: contract._id,
        });

        if (!existingDebtor) {
          const overdueDays = Math.floor(
            (today.getTime() - contract.nextPaymentDate.getTime()) /
              (1000 * 60 * 60 * 24)
          );

          await Debtor.create({
            contractId: contract._id,
            debtAmount: contract.monthlyPayment,
            dueDate: contract.nextPaymentDate,
            overdueDays: Math.max(0, overdueDays),
            createBy: contract.createBy,
          });

          createdCount++;
          console.log(`✅ Debtor created for contract: ${contract._id}`);
        }
      }

      console.log(
        `🎉 Created ${createdCount} new debtors for overdue contracts`
      );
      return { created: createdCount };
    } catch (error) {
      console.error("❌ Error creating overdue debtors:", error);
      throw BaseError.InternalServerError("Qarzdorlar yaratishda xatolik");
    }
  }
}

export default new DebtorService();
