const { firebase, db } = require('../firebaseConfig');
const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);
// const plaidClient = require("../config/plaidConfig");
const dotenv = require("dotenv");
const { auth } = require("firebase-admin");
dotenv.config();

const createAndOnboardConnectedAccount = async (req, res) => {
  try {
    const { email, userId } = req.body;

    const userRef = db.collection('bankdetail').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      await userRef.set({ connectedAccounts: [] });
    }

    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    await userRef.update({
      connectedAccounts: firebase.firestore.FieldValue.arrayUnion({
        connectedAccountId: account.id,
        email: email,
      }),
    });

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.api_url}/reauth`,
      return_url: `${process.env.api_url}/return`,
      type: 'account_onboarding',
    });

    res.json({ accountId: account.id, onboardingUrl: accountLink.url });
  } catch (error) {
    console.error("Error creating or adding connected account:", error);
    res.status(500).json({ error: error.message });
  }
};


const getConnectedAccountsForUser = async (req, res) => {
  const { userId } = req.body;

  try {
    const userRef = db.collection('bankdetail').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const connectedAccounts = userDoc.data().connectedAccounts || [];

    let allBankDetails = [];

    for (const account of connectedAccounts) {
      try {
        const connectedAccountId = account.connectedAccountId;

        const accountDetails = await stripe.accounts.retrieve(connectedAccountId);

        const accountTitle = accountDetails.business_profile?.name || accountDetails.individual?.first_name + " " + accountDetails.individual?.last_name || "N/A";

        const bankAccounts = accountDetails.external_accounts.data.filter(
          (acc) => acc.object === "bank_account"
        );

        if (bankAccounts.length > 0) {
          const bankAccount = bankAccounts[0];
          const bankDetail = {
            accountTitle: accountTitle,
            accountId: accountDetails.id,
            bankAccountNumber: bankAccount.last4,
            routingNumber: bankAccount.routing_number,
            bankName: bankAccount.bank_name,
          };
          allBankDetails.push(bankDetail);
        }
      } catch (accountError) {
        console.error(`Error fetching details for account ${account.connectedAccountId}:`, accountError);
      }
    }

    res.json({ bankDetails: allBankDetails });
  } catch (error) {
    console.error("Error fetching bank details for user:", error);
    res.status(500).json({ error: error.message });
  }
};


const getConnectedAccountDetails = async (req, res) => {
  const { connectedAccountId } = req.body;

  try {
    const accountDetails = await stripe.accounts.retrieve(connectedAccountId);

    const bankAccounts = accountDetails.external_accounts.data.filter(
      (acc) => acc.object === "bank_account"
    );

    let bankDetail = {};
    if (bankAccounts.length > 0) {
      const bankAccount = bankAccounts[0];
      bankDetail = {
        bankAccountNumber: bankAccount.last4,
        routingNumber: bankAccount.routing_number,
        bankName: bankAccount.bank_name,
      };
    }

    res.json({
      accountId: accountDetails.id,
      email: accountDetails.email,
      businessType: accountDetails.business_type,
      country: accountDetails.country,
      created: accountDetails.created,
      capabilities: accountDetails.capabilities,
      bankDetail: bankDetail,
      detailsSubmitted: accountDetails.details_submitted,
      payoutsEnabled: accountDetails.payouts_enabled,
    });
  } catch (error) {
    console.error("Error fetching connected account details:", error);
    res.status(500).json({ error: error.message });
  }
};


const deleteConnectedAccount = async (req, res) => {
  const { userId, connectedAccountId } = req.body;

  try {
    const userRef = db.collection('bankdetail').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    let connectedAccounts = userDoc.data().connectedAccounts || [];

    connectedAccounts = connectedAccounts.filter(
      (account) => account.connectedAccountId !== connectedAccountId
    );

    await userRef.update({ connectedAccounts });

    res.json({ message: "Connected account deleted successfully" });
  } catch (error) {
    console.error("Error deleting connected account:", error);
    res.status(500).json({ error: error.message });
  }
};


const makePayoutToConnectedAccount = async (req, res) => {
  const { userId, connectedAccountId, amount } = req.body;

  try {
    const userRef = db.collection('bankdetail').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const connectedAccounts = userDoc.data().connectedAccounts || [];

    const isConnectedAccountValid = connectedAccounts.some(
      (account) => account.connectedAccountId === connectedAccountId
    );

    if (!isConnectedAccountValid) {
      return res.status(400).json({ error: "Invalid connected account ID" });
    }

    const transfer = await stripe.transfers.create({
      amount: amount,
      currency: 'usd',
      destination: connectedAccountId,
      description: 'Payout to user\'s bank account',
    });

    res.json({ message: 'Payout successful', transfer });
  } catch (error) {
    console.error("Error making payout:", error);
    res.status(500).json({ error: error.message });
  }
};


const checkMainAccountBalance = async (req, res) => {
  try {
    const balance = await stripe.balance.retrieve();
    res.json({ balance });
  } catch (error) {
    console.error("Error retrieving balance:", error);
    res.status(500).json({ error: "Failed to retrieve balance" });
  }
};


const checkConnectedAccountBalance = async (req, res) => {
  const { connectedAccountId } = req.body;

  try {
    const balance = await stripe.balance.retrieve({
      stripeAccount: connectedAccountId,
    });

    const availableBalance = balance.available.find(b => b.currency === 'usd') || {};
    const pendingBalance = balance.pending.find(b => b.currency === 'usd') || {};

    const availableAmount = (availableBalance.amount || 0) / 100;
    const pendingAmount = (pendingBalance.amount || 0) / 100;

    res.json({
      availableBalance: availableAmount.toFixed(2),
      pendingBalance: pendingAmount.toFixed(2),
    });
  } catch (error) {
    console.error("Error checking transferable balance:", error);
    res.status(500).json({ error: error.message });
  }
};


const makePayoutToConnectedBankAccount = async (req, res) => {
  const { connectedAccountId, amount } = req.body;

  if (!connectedAccountId || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid connectedAccountId or amount' });
  }

  try {
    const amountInCents = Math.round(amount * 100);

    const payout = await stripe.payouts.create(
      {
        amount: amountInCents,
        currency: 'usd',
      },
      { stripeAccount: connectedAccountId }
    );

    res.json({ message: 'Payout to bank account successful', payout });
  } catch (error) {
    console.error("Error making payout to bank account:", error);
    res.status(500).json({ error: error.message });
  }
};



const getPayoutHistoryForConnectedAccount = async (req, res) => {
  const { connectedAccountId } = req.body;

  try {
    const payouts = await stripe.payouts.list(
      { limit: 100 },
      { stripeAccount: connectedAccountId }
    );

    const payoutHistory = payouts.data.map((payout) => {
      const formatDateTime = (timestamp) => {
        return new Date(timestamp * 1000).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      };

      return {
        amount: (payout.amount / 100).toFixed(2),
        created: formatDateTime(payout.created),
        status: payout.status,
        arrivalDate: payout.arrival_date
          ? formatDateTime(payout.arrival_date)
          : 'N/A',
      };
    });

    res.json({ payoutHistory });
  } catch (error) {
    console.error("Error fetching payout history:", error);
    res.status(500).json({ error: error.message });
  }
};


const checkAccountCapabilities = async (req, res) => {
  const { connectedAccountId } = req.body;

  try {
    const account = await stripe.accounts.retrieve(connectedAccountId);

    res.json({
      accountId: account.id,
      businessType: account.business_type,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      requirements: account.requirements,
      restrictions: account.restrictions,
    });
  } catch (error) {
    console.error("Error retrieving connected account details:", error);
    res.status(500).json({ error: error.message });
  }
};



const createPaymentIntentForConnectedAccount = async (req, res) => {
  const { amount, currency, connectedAccountId } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency || 'usd',
      payment_method_types: ['card'],
      transfer_data: {
        destination: connectedAccountId,
      },
    });

    res.json({ paymentIntent });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({ error: error.message });
  }
};


const createTestPayment = async (req, res) => {
  const { amount } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      payment_method_types: ['card'],
    });

    res.json({ message: "Payment Intent created to add funds", paymentIntent });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({ error: error.message });
  }
};


const completePaymentIntent = async (req, res) => {
  const { paymentIntentId } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: 'pm_card_visa',
    });

    res.json({ message: "Payment completed successfully", paymentIntent });
  } catch (error) {
    console.error("Error completing payment intent:", error);
    res.status(500).json({ error: error.message });
  }
};


const sendmoneytoconnectedaccount = async (req, res) => {
  const { connectedAccountId, amount } = req.body;
  try {
    const charge = await stripe.charges.create({
      amount: parseInt(amount, 10),
      currency: 'usd',
      source: 'tok_visa',
      transfer_data: {
        destination: connectedAccountId,
      },
    });

    res.json({ message: 'Test charge created successfully', charge });
  } catch (error) {
    console.error("Error creating test charge:", error);
    res.status(500).json({ error: error.message });
  }
};




const makePayoutToConnectedAccountAndBank = async (req, res) => {
  const { userId, connectedAccountId, amount } = req.body;

  if (!connectedAccountId || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid connectedAccountId or amount' });
  }

  try {
    const userRef = db.collection('bankdetail').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const connectedAccounts = userDoc.data().connectedAccounts || [];

    const isConnectedAccountValid = connectedAccounts.some(
      (account) => account.connectedAccountId === connectedAccountId
    );

    if (!isConnectedAccountValid) {
      return res.status(400).json({ error: "Invalid connected account ID" });
    }

    const amountInCents = Math.round(amount * 100);

    const transfer = await stripe.transfers.create({
      amount: amountInCents,
      currency: 'usd',
      destination: connectedAccountId,
      description: 'Transfer to connected Stripe account',
    });

    const payout = await stripe.payouts.create(
      {
        amount: amountInCents,
        currency: 'usd',
      },
      { stripeAccount: connectedAccountId }
    );

    const transferAmountInDollars = (transfer.amount / 100).toFixed(2);
    const payoutAmountInDollars = (payout.amount / 100).toFixed(2);

    res.json({
      message: 'Payout successful to both connected account and bank account',
      transfer: {
        ...transfer,
        amount: transferAmountInDollars,
      },
      payout: {
        ...payout,
        amount: payoutAmountInDollars,
      },
    });
  } catch (error) {
    console.error("Error making payout and transfer:", error);
    res.status(500).json({ error: error.message });
  }
};


module.exports = {
  createAndOnboardConnectedAccount,
  createPaymentIntentForConnectedAccount,
  makePayoutToConnectedAccount,
  checkMainAccountBalance,
  checkAccountCapabilities,
  deleteConnectedAccount,
  createTestPayment,
  completePaymentIntent,
  makePayoutToConnectedAccountAndBank,
  getConnectedAccountsForUser,
  getConnectedAccountDetails,
  checkConnectedAccountBalance,
  makePayoutToConnectedBankAccount,
  sendmoneytoconnectedaccount,
  getPayoutHistoryForConnectedAccount
};
