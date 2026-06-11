"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserTransactionHistories = exports.createTransactionHistory = exports.handleWebhook = void 0;
const responseService_1 = require("../../utils/responseService");
const account_1 = require("../../models/account");
const transaction_1 = require("../../models/transaction");
const paymentService_1 = require("../../utils/paymentService");
const notificationService_1 = require("../../utils/notificationService");
// Webhook handler for Monnify payment events
const handleWebhook = async (req, res) => {
    try {
        const payload = JSON.stringify(req.body);
        const signature = req.headers['monnify-signature'];
        if (!signature) {
            return (0, responseService_1.resSender)(res, 400, 'error', 'Missing webhook signature', null);
        }
        // Verify webhook signature
        if (!paymentService_1.monnifyService.verifyWebhookSignature(payload, signature)) {
            return (0, responseService_1.resSender)(res, 400, 'error', 'Invalid signature', null);
        }
        const { eventType, eventData } = req.body;
        // console.log('Event det: ', { eventType, eventData });
        if (eventType !== 'SUCCESSFUL_TRANSACTION') {
            return (0, responseService_1.resSender)(res, 200, 'success', 'Event ignored', null);
        }
        const accountRef = eventData.product?.reference || eventData.accountReference;
        if (!accountRef) {
            return (0, responseService_1.resSender)(res, 400, 'error', 'Missing account reference in webhook payload', null);
        }
        let transaction = null;
        let verifyError;
        try {
            transaction = await paymentService_1.monnifyService.verifyTransaction(eventData.paymentReference);
        }
        catch (error) {
            verifyError = error;
            console.log('Monnify transaction verification failed, falling back to webhook payload', error);
        }
        if (!transaction) {
            if (eventData.paymentStatus?.toLowerCase() !== 'paid') {
                return (0, responseService_1.resSender)(res, 200, 'success', 'Transaction not successful', null);
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
            };
        }
        if (transaction.paymentStatus?.toLowerCase() !== 'paid') {
            return (0, responseService_1.resSender)(res, 200, 'success', 'Transaction not successful', null);
        }
        // Find user by account reference
        const user = await account_1.Account.findOne({
            'userAccountDetails.accountRef': accountRef,
        });
        if (!user) {
            return (0, responseService_1.resSender)(res, 404, 'error', 'User not found', null);
        }
        // Update wallet balance
        user.walletBalance = Number(user.walletBalance) + Number(transaction.amountPaid);
        await user.save();
        // Create transaction history
        const trxHistory = new transaction_1.TransactionHistory({
            type: transaction_1.TrxType.TRANSFER,
            user: user._id,
            trxReference: transaction.paymentReference,
            amount: transaction.amountPaid,
            trxDate: new Date(transaction.paidOn),
        });
        await trxHistory.save();
        // Add notification
        await (0, notificationService_1.addNotification)(`Payment Received - #${transaction.amountPaid}`, `Your account has been credited with ₦${transaction.amountPaid}`, [user._id]);
        const message = verifyError
            ? 'Webhook processed successfully; payment verified from webhook payload after gateway retry failure.'
            : 'Webhook processed successfully';
        return (0, responseService_1.resSender)(res, 200, 'success', message, null);
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error processing webhook');
    }
};
exports.handleWebhook = handleWebhook;
// Create new transaction history
const createTransactionHistory = async (type, userId, amount, trxDate) => {
    try {
        const trxHistory = new transaction_1.TransactionHistory({
            type,
            userId,
            amount,
            trxDate: trxDate || new Date(),
        });
        await trxHistory.save();
        return trxHistory;
    }
    catch (error) {
        throw error;
    }
};
exports.createTransactionHistory = createTransactionHistory;
// Fetch user transaction histories
const getUserTransactionHistories = async (req, res) => {
    try {
        const userId = req.user?._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const transactions = await transaction_1.TransactionHistory.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('user', 'name email');
        const total = await transaction_1.TransactionHistory.countDocuments({ user: userId });
        return (0, responseService_1.resSender)(res, 200, 'success', 'Transactions fetched', null, {
            transactions,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error fetching transactions');
    }
};
exports.getUserTransactionHistories = getUserTransactionHistories;
