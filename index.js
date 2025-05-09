const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const flash = require("connect-flash");
const path = require("path");
const MongoStore = require("connect-mongo");
require("dotenv").config();

const authRoutes = require("./src/routes/authRoutes");

const app = express();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

// Middleware
app.use(express.urlencoded({ extended: true }));

// Session setup using MongoDB store
app.use(
  session({
    secret: process.env.SESSION_SECRET, // Store the session secret in environment variables
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI, // Store sessions in MongoDB
    }),
  })
);

app.use(flash()); // Use flash messages

app.use((req, res, next) => {
  res.locals.alert = req.flash("alert");
  next();
});

// Set EJS view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src", "views"));

// Routes
app.use("/", authRoutes);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
