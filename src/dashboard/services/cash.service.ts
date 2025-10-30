import BaseError from "../../utils/base.error";

import Contract, { ContractStatus } from "../../schemas/contract.schema";
import { Debtor } from "../../schemas/debtor.schema";
import Payment from "../../schemas/payment.schema";

class CashService {
  async getAll() {
    try {
      const debtors = await Debtor.aggregate([
        {
          $lookup: {
            from: "contracts",
            localField: "contractId",
            foreignField: "_id",
            as: "contract",
          },
        },
        { $unwind: "$contract" },
        {
          $lookup: {
            from: "customers",
            localField: "contract.customer",
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
            from: "notes",
            localField: "payment.notes",
            foreignField: "_id",
            as: "note",
          },
        },
        {
          $unwind: {
            path: "$note",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            fullName: {
              $concat: [
                {
                  $dateToString: {
                    format: "%d", // faqat KUN (30)
                    date: "$contract.startDate",
                  },
                },
                " ",
                { $ifNull: ["$customer.firstName", ""] },
                " ",
                { $ifNull: ["$customer.lastName", ""] },
              ],
            },
            manager: {
              $concat: [
                { $ifNull: ["$manager.firstName", ""] },
                " ",
                { $ifNull: ["$manager.lastName", ""] },
              ],
            },
            paidAmount: {
              $ifNull: ["$payment.amount", 0],
            },
            currencyDetails: {
              $ifNull: ["$currencyDetails", null],
            },
            noteText: {
              $ifNull: ["$note.text", ""],
            },
            overdueDays: {
              $cond: {
                if: {
                  $and: [
                    { $gt: ["$contract.nextPaymentDate", null] },
                    { $lt: ["$contract.nextPaymentDate", new Date()] },
                  ],
                },
                then: {
                  $dateDiff: {
                    startDate: "$contract.nextPaymentDate",
                    endDate: "$$NOW",
                    unit: "day",
                  },
                },
                else: 0,
              },
            },
          },
        },
        {
          $addFields: {
            status: {
              $switch: {
                branches: [
                  {
                    case: {
                      $gte: ["$paidAmount", "$debtAmount"],
                    },
                    then: "To'liq to'landi",
                  },
                  {
                    case: {
                      $and: [
                        { $gt: ["$paidAmount", 0] },
                        { $lt: ["$paidAmount", "$debtAmount"] },
                      ],
                    },
                    then: "Qisman to'landi",
                  },
                ],
                default: "Kutulmoqda",
              },
            },
          },
        },
        {
          $project: {
            _id: 1,
            customerId: "$customer._id",
            fullName: 1,
            phoneNumber: "$customer.phoneNumber",
            manager: "$manager",
            debtAmount: 1,
            paidAmount: 1,
            status: 1,
            overdueDays: 1,
            notes: "$noteText",
            method: "$payment.method",
            currencyDetails: 1,
            currencyCourse: 1,
            startDate: "$contract.startDate",
          },
        },
        {
          $sort: {
            overdueDays: -1,
          },
        },
      ]);

      return debtors;
    } catch (error) {
      console.error("Error fetching debtors report:", error);
      throw BaseError.InternalServerError(String(error));
    }
  }

  async confirmations(cashIds: string[]) {
    for (const id of cashIds) {
      const debtor = await Debtor.findById(id)
        .populate("contractId")
        .populate("createBy");

      if (!debtor || !debtor.contractId || !debtor.payment) continue;

      const newPayment = new Payment({
        amount: debtor.payment.amount,
        date: debtor.payment.date,
        isPaid: true,
        customerId: debtor.contractId.customer,
        managerId: debtor.createBy,
        notes: debtor?.payment?.notes,
      });

      const saved = await newPayment.save();

      await Contract.findByIdAndUpdate(debtor.contractId._id, {
        $push: { payments: saved._id },
      });

      const updatedContract = await Contract.findById(
        debtor.contractId._id
      ).populate("payments");

      console.log("updatedContract", updatedContract);

      if (updatedContract) {
        let totalPaid = updatedContract.payments.reduce(
          (acc: number, p: any) => acc + p.amount,
          0
        );

        if (
          totalPaid + updatedContract.initialPayment >=
          updatedContract.totalPrice
        ) {
          updatedContract.status = ContractStatus.COMPLETED;
          await updatedContract.save();
        }
      }
      await Debtor.findByIdAndDelete(id);
    }

    return { success: true, message: "To‘lovlar va shartnomalar yangilandi." };
  }
}

export default new CashService();
