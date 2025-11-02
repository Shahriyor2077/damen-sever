import Contract, { ContractStatus } from "../../schemas/contract.schema";
import Customer from "../../schemas/customer.schema";
import BaseError from "../../utils/base.error";
import { CreateContractDtoForSeller } from "../validators/contract";
import { Balance } from "../../schemas/balance.schema";
import Employee from "../../schemas/employee.schema";
import { Types } from "mongoose";

class ContractService {
  // Balansni yangilash funksiyasi
  async updateBalance(
    managerId: any,
    changes: {
      dollar?: number;
      sum?: number;
    }
  ) {
    const balance = await Balance.findOne({ managerId });

    if (!balance) {
      return await Balance.create({
        managerId,
        dollar: changes.dollar || 0,
        sum: changes.sum || 0,
      });
    }

    balance.dollar += changes.dollar || 0;
    balance.sum += changes.sum || 0;

    return await balance.save();
  }

  // Faol shartnomalarni ko'rish
  async getActiveContracts(userId: string) {
    console.log("🔍 Getting active contracts for user:", userId);
    const result = await Contract.aggregate([
      {
        $match: {
          isDeleted: false,
          isActive: true,
          status: ContractStatus.ACTIVE,
          createBy: new Types.ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: "notes",
          localField: "notes",
          foreignField: "_id",
          as: "notes",
          pipeline: [{ $project: { text: 1 } }],
        },
      },
      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "customer",
          pipeline: [
            {
              $project: {
                firstName: 1,
                lastName: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          notes: { $ifNull: [{ $arrayElemAt: ["$notes.text", 0] }, null] },
          customer: {
            $cond: [
              { $gt: [{ $size: "$customer" }, 0] },
              { $toString: { $arrayElemAt: ["$customer._id", 0] } },
              null,
            ],
          },
          customerName: {
            $cond: [
              { $gt: [{ $size: "$customer" }, 0] },
              {
                $concat: [
                  {
                    $dateToString: {
                      format: "%d",
                      date: "$startDate",
                    },
                  },
                  " ",
                  { $arrayElemAt: ["$customer.firstName", 0] },
                  " ",
                  {
                    $ifNull: [{ $arrayElemAt: ["$customer.lastName", 0] }, ""],
                  },
                ],
              },
              null,
            ],
          },
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);
    console.log("✅ Found active contracts:", result.length);
    return result;
  }

  // Yangi shartnomalarni ko'rish
  async getNewContracts(userId: string) {
    console.log("🔍 Getting new contracts for user:", userId);
    const result = await Contract.aggregate([
      {
        $match: {
          isDeleted: false,
          isActive: false,
          status: ContractStatus.ACTIVE,
          createBy: new Types.ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "customer",
          pipeline: [
            {
              $lookup: {
                from: "employees",
                localField: "manager",
                foreignField: "_id",
                as: "manager",
              },
            },
            { $unwind: { path: "$manager", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                firstName: 1,
                lastName: 1,
                passportSeries: 1,
                phoneNumber: 1,
                birthDate: 1,
                telegramName: 1,
                isActive: 1,
                address: 1,
                _id: 1,
                isDeleted: 1,
                "manager.firstName": 1,
                "manager.lastName": 1,
                "manager._id": 1,
              },
            },
          ],
        },
      },
      { $unwind: "$customer" },
      {
        $lookup: {
          from: "notes",
          localField: "notes",
          foreignField: "_id",
          as: "notes",
          pipeline: [{ $project: { text: 1 } }],
        },
      },
      {
        $addFields: {
          customerName: {
            $concat: [
              "$customer.firstName",
              " ",
              { $ifNull: ["$customer.lastName", ""] },
            ],
          },
          notes: { $ifNull: [{ $arrayElemAt: ["$notes.text", 0] }, null] },
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);
    console.log("✅ Found new contracts:", result.length);
    return result;
  }

  // Yopilgan shartnomalarni ko'rish
  async getCompletedContracts(userId: string) {
    return await Contract.aggregate([
      {
        $match: {
          isDeleted: false,
          isActive: true,
          status: ContractStatus.COMPLETED,
          createBy: new Types.ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: "notes",
          localField: "notes",
          foreignField: "_id",
          as: "notes",
          pipeline: [{ $project: { text: 1 } }],
        },
      },
      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "customer",
          pipeline: [
            {
              $project: {
                firstName: 1,
                lastName: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          notes: { $ifNull: [{ $arrayElemAt: ["$notes.text", 0] }, null] },
          customer: {
            $cond: [
              { $gt: [{ $size: "$customer" }, 0] },
              { $toString: { $arrayElemAt: ["$customer._id", 0] } },
              null,
            ],
          },
          customerName: {
            $cond: [
              { $gt: [{ $size: "$customer" }, 0] },
              {
                $concat: [
                  { $arrayElemAt: ["$customer.firstName", 0] },
                  " ",
                  {
                    $ifNull: [{ $arrayElemAt: ["$customer.lastName", 0] }, ""],
                  },
                ],
              },
              null,
            ],
          },
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);
  }

  // Shartnoma detailini ko'rish
  async getContractById(contractId: string, userId: string) {
    const contract = await Contract.aggregate([
      {
        $match: {
          isDeleted: false,
          _id: new Types.ObjectId(contractId),
          createBy: new Types.ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "customer",
          pipeline: [
            {
              $lookup: {
                from: "employees",
                localField: "manager",
                foreignField: "_id",
                as: "manager",
              },
            },
            { $unwind: { path: "$manager", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                firstName: 1,
                lastName: 1,
                passportSeries: 1,
                phoneNumber: 1,
                birthDate: 1,
                telegramName: 1,
                isActive: 1,
                address: 1,
                _id: 1,
                isDeleted: 1,
                "manager.firstName": 1,
                "manager.lastName": 1,
                "manager._id": 1,
              },
            },
          ],
        },
      },
      { $unwind: "$customer" },
      {
        $lookup: {
          from: "notes",
          localField: "notes",
          foreignField: "_id",
          as: "notes",
          pipeline: [{ $project: { text: 1 } }],
        },
      },
      {
        $addFields: {
          notes: { $ifNull: [{ $arrayElemAt: ["$notes.text", 0] }, null] },
        },
      },
      {
        $lookup: {
          from: "payments",
          localField: "payments",
          foreignField: "_id",
          as: "payments",
          pipeline: [
            {
              $lookup: {
                from: "notes",
                localField: "notes",
                foreignField: "_id",
                as: "notes",
                pipeline: [{ $project: { text: 1 } }],
              },
            },
            {
              $addFields: {
                notes: {
                  $ifNull: [{ $arrayElemAt: ["$notes.text", 0] }, ""],
                },
              },
            },
          ],
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
                        input: "$payments",
                        as: "p",
                        cond: { $eq: ["$p.isPaid", true] },
                      },
                    },
                    as: "pp",
                    in: "$pp.amount",
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
    ]);

    if (!contract || contract.length === 0) {
      throw BaseError.NotFoundError(
        "Shartnoma topilmadi yoki sizga tegishli emas"
      );
    }

    return contract[0];
  }

  // Shartnomani tahrirlash
  async updateContract(contractId: string, data: any, userId: string) {
    const contract = await Contract.findOne({
      _id: contractId,
      createBy: userId,
      isDeleted: false,
    }).populate("notes");

    if (!contract) {
      throw BaseError.NotFoundError(
        "Shartnoma topilmadi yoki sizga tegishli emas"
      );
    }

    // Notes yangilash
    if (data.notes && contract.notes) {
      contract.notes.text = data.notes;
      await contract.notes.save();
    }

    // Shartnoma ma'lumotlarini yangilash
    const updatedContract = await Contract.findOneAndUpdate(
      { _id: contractId, createBy: userId, isDeleted: false },
      {
        productName: data.productName,
        originalPrice: data.originalPrice,
        price: data.price,
        initialPayment: data.initialPayment,
        percentage: data.percentage,
        period: data.period,
        monthlyPayment: data.monthlyPayment,
        totalPrice: data.totalPrice,
        initialPaymentDueDate: data.initialPaymentDueDate,
        nextPaymentDate: data.initialPaymentDueDate,
        info: {
          box: data.box || false,
          mbox: data.mbox || false,
          receipt: data.receipt || false,
          iCloud: data.iCloud || false,
        },
      },
      { new: true }
    );

    if (!updatedContract) {
      throw BaseError.NotFoundError("Shartnoma yangilanmadi");
    }

    return {
      message: "Shartnoma muvaffaqiyatli yangilandi",
      contract: updatedContract,
    };
  }

  async create(data: CreateContractDtoForSeller, userId?: string) {
    try {
      console.log(
        "🚀 SELLER === CONTRACT CREATION STARTED (PENDING APPROVAL) ==="
      );
      console.log("📋 Seller input:", {
        customer: data.customer,
        productName: data.productName,
        initialPayment: data.initialPayment,
      });

      const customer = await Customer.findById(data.customer);
      if (!customer) {
        throw BaseError.NotFoundError(`Bunday mijoz topilmadi!`);
      }

      const Employee = await import("../../schemas/employee.schema");
      const Notes = await import("../../schemas/notes.schema");

      const createBy = await Employee.default.findById(userId);
      if (!createBy) {
        throw BaseError.ForbiddenError("Mavjud bo'lmagan xodim");
      }
      console.log("👤 Seller found:", createBy._id);

      // Notes yaratish
      const newNotes = new Notes.default({
        text: data.notes || "Shartnoma yaratildi (Tasdiq kutilmoqda)",
        customer: data.customer,
        createBy: createBy._id,
      });
      await newNotes.save();
      console.log("📝 Notes created:", newNotes._id);

      // Shartnoma yaratish - isActive: false (tasdiq kutilmoqda)
      const contractStartDate = data.startDate
        ? new Date(data.startDate)
        : new Date();
      const contract = new Contract({
        customer: data.customer,
        productName: data.productName,
        originalPrice: data.originalPrice,
        price: data.price,
        initialPayment: data.initialPayment,
        percentage: data.percentage,
        period: data.period,
        monthlyPayment: data.monthlyPayment,
        initialPaymentDueDate: new Date(
          data.initialPaymentDueDate || new Date()
        ),
        notes: newNotes._id,
        totalPrice: data.totalPrice,
        startDate: contractStartDate,
        nextPaymentDate: new Date(data.initialPaymentDueDate || new Date()),
        isActive: false, // ⚠️ Tasdiq kutilmoqda
        createBy: createBy._id,
        info: {
          box: data.box || false,
          mbox: data.mbox || false,
          receipt: data.receipt || false,
          iCloud: data.iCloud || false,
        },
        payments: [],
        isDeclare: false,
        status: ContractStatus.ACTIVE,
      });

      await contract.save();
      console.log("📋 Contract created (PENDING APPROVAL):", contract._id);
      console.log("⏳ Waiting for Admin/Moderator/Manager approval...");
      console.log(
        "🎉 SELLER === CONTRACT CREATION COMPLETED (NO CASCADE YET) ==="
      );

      return {
        message:
          "Shartnoma yaratildi va tasdiq kutilmoqda. Admin/Moderator/Manager tomonidan tasdiqlanishi kerak.",
        contractId: contract._id,
        isActive: false,
        needsApproval: true,
      };
    } catch (error) {
      console.error("❌ SELLER === CONTRACT CREATION FAILED ===");
      console.error("Error:", error);
      throw error;
    }
  }

  async post(data: any) {
    const contract = new Contract({ ...data });
    await contract.save();
    return { message: "Shartnoma qo'shildi." };
  }
}

export default new ContractService();
