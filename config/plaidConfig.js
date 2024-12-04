// const plaid = require("plaid");
const dotenv = require("dotenv");
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);
dotenv.config();

const plaidClient = new plaid.PlaidApi(
  new plaid.Configuration({
    basePath: plaid.PlaidEnvironments[process.env.PLAID_ENV],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
        "PLAID-SECRET": process.env.PLAID_SECRET,
        'Plaid-Version': '2020-09-14' 
      },
    },
  })
);

module.exports = plaidClient;
