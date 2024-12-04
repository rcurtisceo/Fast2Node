require("dotenv").config();

const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const engines = require("consolidate");
app.use(cors({ origin: "*" }));
app.engine("ejs", engines.ejs);
app.set("views", "./views");
app.set("view engine", "ejs");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);
const plaidRoutes = require("./routes/plaidRoutes");
app.use(express.json());
app.get("/", (req, res) => {
  res.render("index");
});
app.get("/price_set/:price", async (req, res) => {
  const { price } = req.params;
  console.log(price);
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
	  currency: `${process.env.currency}`,
            product_data: {
              name: "Custom Services",
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
		success_url: `${process.env.api_url}/success`,
		cancel_url: `${process.env.api_url}/cancel`,
    });
    res.redirect(session.url);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get("/cancel", (req, res) => {
	res.json({ msg: "Cancel" });
});
app.get("/success", (req, res) => {
	
	res.json({ msg: "success" });
});
app.use("/api/plaid", plaidRoutes);
const port = process.env.PORT || 4000;
app.listen(port, () => {
	console.log(`Server is running: http://localhost:${port}`);
});
