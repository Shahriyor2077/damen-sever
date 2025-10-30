import BaseError from "../../utils/base.error";
import Contract, { ContractStatus } from "../../schemas/contract.schema";
import {
  CreateContractDto,
  SellerCreateContractDto,
  UpdateContractDto,
} from "../../validators/contract";
import IJwtUser from "../../types/user";
import Employee from "../../schemas/employee.schema";
import Notes from "../../schemas/notes.schema";
import { Types } from "mongoose";
import Customer from "../../schemas/customer.schema";
import Payment from "../../schemas/payment.schema";

class ContractService {
  async getAll() {
    return await Contract.aggregate([
      {
        $match: {
          isDeleted: false,
          isActive: true,
          status: ContractStatus.ACTIVE,
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
          // customerName: {
          //   $cond: [
          //     { $gt: [{ $size: "$customer" }, 0] },
          //     {
          //       $concat: [
          //         { $arrayElemAt: ["$customer.firstName", 0] },
          //         " ",
          //         {
          //           $ifNull: [{ $arrayElemAt: ["$customer.lastName", 0] }, ""],
          //         },
          //       ],
          //     },
          //     null,
          //   ],
          // },
          customerName: {
            $cond: [
              { $gt: [{ $size: "$customer" }, 0] },
              {
                $concat: [
                  // ✅ Sana formatlash (kun.oy.yil)
                  {
                    $dateToString: {
                      format: "%d",
                      date: "$startDate", // yoki "$startDate" agar kerak bo‘lsa
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
  }

  async getAllNewContract() {
    return await Contract.aggregate([
      {
        $match: {
          isDeleted: false,
          isActive: false,
          status: ContractStatus.ACTIVE,
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
                percent: 1,
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
  }

  async getAllCompleted() {
    const t = await Contract.aggregate([
      {
        $match: {
          isDeleted: false,
          isActive: true,
          status: ContractStatus.COMPLETED,
        },
      },
      // {
      //   $lookup: {
      //     from: "customers",
      //     localField: "customer",
      //     foreignField: "_id",
      //     as: "customer",
      //     pipeline: [
      //       {
      //         $project: {
      //           _id: 1,
      //           firstName: 1,
      //           lastName: 1,
      //         },
      //       },
      //     ],
      //   },
      // },
      // { $unwind: "$customer" },
      // {
      //   $lookup: {
      //     from: "notes",
      //     localField: "notes",
      //     foreignField: "_id",
      //     as: "notes",
      //     pipeline: [{ $project: { text: 1 } }],
      //   },
      // },
      // {
      //   $addFields: {
      //     customerName: {
      //       $concat: [
      //         "$customer.firstName",
      //         " ",
      //         { $ifNull: ["$customer.lastName", ""] },
      //       ],
      //     },
      //     notes: { $ifNull: [{ $arrayElemAt: ["$notes.text", 0] }, null] },
      //   },
      // },
      // {
      //   $sort: {
      //     createdAt: -1,
      //   },
      // },
    ]);
    console.log("ll", t);

    return t;
  }

  async getContractById(contractId: string) {
    const constrat = await Contract.aggregate([
      {
        $match: {
          isDeleted: false,
          _id: new Types.ObjectId(contractId),
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
            { $unwind: "$manager" },
            {
              $project: {
                firstName: 1,
                lastName: 1,
                percent: 1,
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
    ]);
    return constrat[0];
  }

  async create(data: CreateContractDto, user: IJwtUser) {
    const {
      customer,
      productName,
      originalPrice,
      price,
      initialPayment,
      percentage,
      period,
      monthlyPayment,
      initialPaymentDueDate,
      notes,
      totalPrice,
      box,
      mbox,
      receipt,
      iCloud,
      startDate,
      payments = [],
    } = data;
    const createBy = await Employee.findById(user.sub);
    if (!createBy) {
      throw BaseError.ForbiddenError("Mavjud bo'lmagan xodim");
    }
    // const startDate = new Date();
    const newNotes = new Notes({ text: notes, customer, createBy });
    await newNotes.save();

    const contractStartDate = startDate ? new Date(startDate) : new Date();

    const contract = new Contract({
      customer,
      productName,
      originalPrice,
      price,
      initialPayment,
      percentage,
      period,
      monthlyPayment,
      initialPaymentDueDate,
      notes: newNotes,
      totalPrice,
      startDate,
      nextPaymentDate: initialPaymentDueDate,
      isActive: true,
      createBy,
      info: {
        box,
        mbox,
        receipt,
        iCloud,
      },
    });
    const savedPayments = [];

    for (const payment of payments) {
      // Izoh mavjud bo‘lsa alohida notes hujjati yaratamiz
      // let paymentNote = undefined;
      // if (payment.note && payment.note.trim() !== "") {
      const paymentNote = new Notes({
        text: payment.note || payment.amount,
        customer,
        createBy,
      });
      await paymentNote.save();
      // }

      if (!payment.amount || payment.amount <= 0) {
        // Miqdor yo'q bo'lsa saqlamaslik yoki xatolik
        continue;
      }

      const newPayment = new Payment({
        amount: payment.amount,
        date: new Date(payment.date),
        isPaid: true,
        customerId: customer,
        managerId: createBy._id,
        notes: paymentNote?._id, // bo‘lishi mumkin yoki undefined
      });

      await newPayment.save();
      savedPayments.push(newPayment._id);
    }

    // If contract.payments expects ObjectId[], assign as is:
    // contract.payments = savedPayments;

    // If contract.payments expects IPayment[], populate the payments:
    contract.payments = await Payment.find({ _id: { $in: savedPayments } });

    await contract.save();

    return { message: "Shartnoma yaratildi." };
  }

  async update(data: UpdateContractDto, user: IJwtUser) {
    const {
      id,
      productName,
      originalPrice,
      price,
      initialPayment,
      percentage,
      period,
      monthlyPayment,
      initialPaymentDueDate,
      notes,
      totalPrice,
      box,
      mbox,
      receipt,
      iCloud,
    } = data;

    const existingContract = await Contract.findOne({
      _id: id,
      isDeleted: false,
    }).populate("notes");

    if (!existingContract) {
      throw BaseError.NotFoundError("Shartnoma topilmadi yoki o'chirilgan");
    }

    const contractNotes = existingContract.notes;

    if (notes !== contractNotes.text) {
      contractNotes.text = notes || "";
      await contractNotes.save();
    }

    const customer = await Contract.findOneAndUpdate(
      { _id: data.id, isDeleted: false },
      {
        productName,
        originalPrice,
        price,
        initialPayment,
        percentage,
        period,
        monthlyPayment,
        totalPrice,
        initialPaymentDueDate,
        nextPaymentDate: initialPaymentDueDate,
        isActive: true,
        info: {
          box,
          mbox,
          receipt,
          iCloud,
        },
      }
    ).exec();

    if (!customer) {
      throw BaseError.NotFoundError("Shartnoma topilmadi.");
    }

    console.log("cutoemr", customer);

    return { message: "Shartnoma ma'lumotlari yangilandi." };
  }

  async sellerCreate(data: CreateContractDto, user: IJwtUser) {
    const {
      customer,
      productName,
      originalPrice,
      price,
      initialPayment,
      percentage,
      period,
      monthlyPayment,
      initialPaymentDueDate,
      notes,
      totalPrice,
      box,
      mbox,
      receipt,
      iCloud,
      startDate,
    } = data;
    const createBy = await Employee.findById(user.sub);
    if (!createBy) {
      throw BaseError.ForbiddenError();
    }
    const newNotes = new Notes({ text: notes, customer, createBy });
    await newNotes.save();
    const contract = new Contract({
      customer,
      productName,
      originalPrice,
      price,
      initialPayment,
      percentage,
      period,
      monthlyPayment,
      initialPaymentDueDate,
      notes: newNotes,
      totalPrice,
      startDate,
      nextPaymentDate: initialPaymentDueDate,
      isActive: false,
      createBy,
      info: {
        box,
        mbox,
        receipt,
        iCloud,
      },
    });
    await contract.save();
    return { message: "Shartnoma yaratildi." };
  }
}

export default new ContractService();
