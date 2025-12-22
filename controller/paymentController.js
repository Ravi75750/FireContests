import Razorpay from "razorpay";
import { createHmac } from "crypto";
import Payment from "../models/payment.js";    // FIXED ✔

// ---------------------------------------------
// CREATE ORDER
// ---------------------------------------------
export async function createOrder(req, res) {
  try {
    const { amount, userId } = req.body;

    if (!amount || !userId) {
      return res
        .status(400)
        .json({ message: "Amount and userId are required" });
    }

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: "order_" + Math.random().toString(36).substring(2, 10),
    };

    const order = await instance.orders.create(options);

    // Save initial record
    await Payment.create({
      userId,
      orderId: order.id,
      amount,
      currency: "INR",
      status: "created",
      createdAt: new Date(),
    });

    res.status(200).json(order);
  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({ message: "Order creation failed", error });
  }
}

// ---------------------------------------------
// VERIFY PAYMENT
// ---------------------------------------------
export async function verifyPayment(req, res) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res
        .status(400)
        .json({ message: "Payment details missing" });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = createHmac(
      "sha256",
      process.env.RAZORPAY_KEY_SECRET
    )
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid signature" });
    }

    const payment = await Payment.findOne({ orderId: razorpay_order_id });

    if (!payment) {
      return res
        .status(404)
        .json({ message: "Payment record not found" });
    }

    payment.paymentId = razorpay_payment_id;
    payment.signature = razorpay_signature;
    payment.status = "success";
    payment.updatedAt = new Date();

    await payment.save();

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({ message: "Verification failed", error });
  }
}

// ---------------------------------------------
// GET USER PAYMENT HISTORY
// ---------------------------------------------
export async function getUserPayments(req, res) {
  try {
    const { userId } = req.params;

    const payments = await Payment.find({ userId }).sort({
      createdAt: -1,
    });

    res.status(200).json(payments);
  } catch (error) {
    console.error("Fetch history error:", error);
    res.status(500).json({ message: "Failed to fetch payments", error });
  }
}
