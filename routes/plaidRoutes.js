const express = require("express");
const router = express.Router();
const { createAndOnboardConnectedAccount, createPaymentIntentForConnectedAccount, makePayoutToConnectedAccount, checkMainAccountBalance, checkAccountCapabilities, deleteConnectedAccount, createTestPayment, completePaymentIntent, checkConnectedAccountBalance, getConnectedAccountsForUser, getConnectedAccountDetails, makePayoutToConnectedBankAccount, sendmoneytoconnectedaccount, getPayoutHistoryForConnectedAccount, makePayoutToConnectedAccountAndBank} = require("../controllers/plaidController.js");

router.post("/create_account", createAndOnboardConnectedAccount);
router.post("/check_balance_main", checkMainAccountBalance);
router.post("/check_account_status", checkAccountCapabilities);
router.post("/payment_intent", createPaymentIntentForConnectedAccount);
router.delete("/delete", deleteConnectedAccount);
router.post("/send_money", createTestPayment);
router.post("/completesend_money", completePaymentIntent);
router.post("/show_connected_accounts", getConnectedAccountsForUser);
router.post("/check_connected_account_balance", checkConnectedAccountBalance);
router.get("/details_connected_account", getConnectedAccountDetails);
router.post("/transfer_to_connected_account", makePayoutToConnectedAccount);
router.post("/transfer_money_to_bank", makePayoutToConnectedBankAccount);
router.post("/send_money_to_connected_account", sendmoneytoconnectedaccount);
router.post("/history", getPayoutHistoryForConnectedAccount);
router.post("/direct_transfer", makePayoutToConnectedAccountAndBank);


module.exports = router;
