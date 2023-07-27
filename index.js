const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const jwt = require("jsonwebtoken");


app.get("/", (req, res) => {
    res.send("Sports academy server is running");
});

app.listen(port, () => {
    console.log(`The server is running on port ${port}`);
});
