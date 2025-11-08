import BaseError from "../../utils/base.error";
import Payment, { PaymentStatus } from "../../schemas/payment.schema";
import paymentService from "./payment.service";
import IJwtUser from "../../types/user";

class CashService {
  /**
   * Tasdiqlanmagan to'lovlarni olish
   * Requirements: 8.1
   */
  async getPendingPayments() {
    try {
      console.log("🔍 === FETCHING PENDING PAYMENTS ===");

      // Debug: Barcha to'lovlarni sanash
      const totalPayments = await Payment.countDocuments();
      const pendingCount = await Payment.countDocuments({
        isPaid: false,
        status: PaymentStatus.PENDING,
      });
      const paidCount = await Payment.countDocuments({ isPaid: true });

      console.log("📊 Payment Statistics:", {
        total: totalPayments,
        pending: pendingCount,
        paid: paidCount,
      });

      const payments = await Payment.find({
        isPaid: false,
        status: PaymentStatus.PENDING,
      })
        .populate("customerId", "firstName lastName phoneNumber")
        .populate("managerId", "firstName lastName")
        .populate("notes", "text")
        .sort({ date: -1 });

      console.log("✅ Found pending payments:", payments.length);

      if (payments.length > 0) {
        console.log("📋 Sample payment:", {
          id: payments[0]._id,
          customer: payments[0].customerId,
          manager: payments[0].managerId,
          amount: payments[0].amount,
          status: payments[0].status,
        });
      }

      return payments;
    } catch (error) {
      console.error("❌ Error fetching pending payments:", error);
      throw BaseError.InternalServerError(String(error));
    }
  }

  /**
   * To'lovlarni tasdiqlash
   * Requirements: 8.2, 8.3, 8.4
   */
  async confirmPayments(paymentIds: string[], user: IJwtUser) {
    try {
      console.log("✅ === CONFIRMING PAYMENTS (CASH) ===");
      console.log("Payment IDs:", paymentIds);

      const results = [];

      for (const paymentId of paymentIds) {
        try {
          const result = await paymentService.confirmPayment(paymentId, user);
          results.push(result);
        } catch (error) {
          console.error(`❌ Error confirming payment ${paymentId}:`, error);
          results.push({
            paymentId,
            status: "error",
            message: (error as Error).message,
          });
        }
      }

      console.log("🎉 === PAYMENTS CONFIRMATION COMPLETED ===");

      return {
        success: true,
        message: "To'lovlar tasdiqlandi",
        results,
      };
    } catch (error) {
      console.error("❌ Error confirming payments:", error);
      throw error;
    }
  }

  /**
   * To'lovni rad etish
   * Requirements: 8.5
   */
  async rejectPayment(paymentId: string, reason: string, user: IJwtUser) {
    try {
      return await paymentService.rejectPayment(paymentId, reason, user);
    } catch (error) {
      console.error("❌ Error rejecting payment:", error);
      throw error;
    }
  }

  /**
   * DEPRECATED: Eski getAll() metodi
   * Yangi getPendingPayments() metodidan foydalaning
   */
  async getAll() {
    console.warn(
      "⚠️ DEPRECATED: getAll() is deprecated. Use getPendingPayments() instead."
    );
    return await this.getPendingPayments();
  }

  /**
   * DEPRECATED: Eski confirmations() metodi
   * Yangi confirmPayments() metodidan foydalaning
   */
  async confirmations(cashIds: string[], user?: IJwtUser) {
    console.warn(
      "⚠️ DEPRECATED: confirmations() is deprecated. Use confirmPayments() instead."
    );

    if (!user) {
      throw BaseError.BadRequest("User is required");
    }

    return await this.confirmPayments(cashIds, user);
  }
}

export default new CashService();
