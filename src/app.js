const express = require("express");
const app = express();

const morgan = require("morgan");
const path = require("path")

app.use(express.json())
app.use(morgan("dev"));


module.exports = app