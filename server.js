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
const stripe = require("stripe")(
  "sk_test_51NJERXGIVwgI2CO5MEddVGtSrjawIPP2YnWE9nEU4lCuHoOFRtjubigWhIA3PYDmKwEDKbL1kvEOd4dvcPuh3qhE00GALjvtVq"
);
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
            currency: `USD`,
            product_data: {
              name: "Custom Services",
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],

      success_url: `http://localhost:4000/success`,
      cancel_url: `http://localhost:4000/cancel`,
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
const port = process.env.PORT || 4000;
app.listen(port, () => {
	console.log(`Server is running: http://localhost:${port}`);
});
