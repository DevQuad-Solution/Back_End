import { Request } from '../../utils/customRequest';
import { Response } from 'express';
import { errorHandler, resSender } from '../../utils/responseService';
import { Account } from '../../models/account';
import { TransactionHistory, TrxType } from '../../models/transaction';
import { monnifyService, MonnifyTransactionResponse } from '../../utils/paymentService';
import { addNotification } from '../../utils/notificationService';
import { Types } from 'mongoose';

// Webhook handler for Monnify payment events
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const payload = JSON.stringify(req.body);
    const signature = req.headers['monnify-signature'] as string | undefined;

    if (!signature) {
      return resSender(res, 400, 'error', 'Missing webhook signature', null);
    }

    // Verify webhook signature
    if (!monnifyService.verifyWebhookSignature(payload, signature)) {
      return resSender(res, 400, 'error', 'Invalid signature', null);
    }

    const { eventType, eventData } = req.body;
    // console.log('Event det: ', { eventType, eventData });

    if (eventType !== 'SUCCESSFUL_TRANSACTION') {
      return resSender(res, 200, 'success', 'Event ignored', null);
    }

    const accountRef = eventData.product?.reference || eventData.accountReference;
    if (!accountRef) {
      return resSender(res, 400, 'error', 'Missing account reference in webhook payload', null);
    }

    let transaction: MonnifyTransactionResponse | null = null;
    let verifyError: unknown;

    try {
      transaction = await monnifyService.verifyTransaction(eventData.paymentReference);
    } catch (error: unknown) {
      verifyError = error;
      console.log(
        'Monnify transaction verification failed, falling back to webhook payload',
        error,
      );
    }

    if (!transaction) {
      if (eventData.paymentStatus?.toLowerCase() !== 'paid') {
        return resSender(res, 200, 'success', 'Transaction not successful', null);
      }

      transaction = {
        transactionReference: eventData.transactionReference,
        paymentReference: eventData.paymentReference,
        amountPaid: eventData.amountPaid,
        paidOn: eventData.paidOn,
        paymentStatus: eventData.paymentStatus,
        paymentDescription: eventData.paymentDescription,
        customerName: eventData.customer?.name,
        customerEmail: eventData.customer?.email,
        contractCode: eventData.contractCode,
        bankName: eventData.destinationAccountInformation?.bankName,
        accountNumber: eventData.destinationAccountInformation?.accountNumber,
        currencyCode: eventData.currency,
        paymentMethod: eventData.paymentMethod,
      } as MonnifyTransactionResponse;
    }

    if (transaction.paymentStatus?.toLowerCase() !== 'paid') {
      return resSender(res, 200, 'success', 'Transaction not successful', null);
    }

    // Find user by account reference
    const user = await Account.findOne({
      'userAccountDetails.accountRef': accountRef,
    });

    if (!user) {
      return resSender(res, 404, 'error', 'User not found', null);
    }

    // Update wallet balance
    user.walletBalance = Number(user.walletBalance) + Number(transaction.amountPaid);
    await user.save();

    // Create transaction history
    const trxHistory = new TransactionHistory({
      type: TrxType.TRANSFER,
      userId: user._id,
      trxReference: transaction.paymentReference,
      amount: transaction.amountPaid,
      trxDate: new Date(transaction.paidOn),
    });
    await trxHistory.save();

    // Add notification
    await addNotification(
      `Payment Received - #${transaction.amountPaid}`,
      `Your account has been credited with ₦${transaction.amountPaid}`,
      [user._id],
    );

    const message = verifyError
      ? 'Webhook processed successfully; payment verified from webhook payload after gateway retry failure.'
      : 'Webhook processed successfully';

    return resSender(res, 200, 'success', message, null);
  } catch (error: any) {
    return errorHandler(error, res, 'Error processing webhook');
  }
};

// Create new transaction history
export const createTransactionHistory = async (
  type: TrxType,
  userId: Types.ObjectId,
  amount: number,
  trxDate?: Date,
) => {
  try {
    const trxHistory = new TransactionHistory({
      type,
      userId,
      amount,
      trxDate: trxDate || new Date(),
    });
    await trxHistory.save();
    return trxHistory;
  } catch (error: any) {
    throw error;
  }
};

// Fetch user transaction histories
export const getUserTransactionHistories = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const transactions = await TransactionHistory.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email');

    const total = await TransactionHistory.countDocuments({ userId });

    return resSender(res, 200, 'success', 'Transactions fetched', null, {
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return errorHandler(error, res, 'Error fetching transactions');
  }
};
