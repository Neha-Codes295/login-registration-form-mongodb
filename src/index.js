// const express = require("express");
// const app = express();
// const path = require("path");
// const hbs = require("hbs");
// const collection = require("./mongodb");

// const templatePath = path.join(__dirname, "../templates");

// app.use(express.json());
// app.set("view engine", "hbs");
// app.set("views", templatePath);
// app.use(express.urlencoded({ extended: false }));

// app.get("/", (req, res) => {
//   res.render("login");
// });
// app.get("/signup", (req, res) => {
//   res.render("signup");
// });

// app.post("/signup", async (req, res) => {
//   const { email, password } = req.body;

//   if (password.length < 7) {
//     return res.render("signup", {
//       error: "Password must be at least 7 characters long.",
//     });
//   }

//   const data = {
//     email,
//     password,
//   };

//   await collection.insertMany([data]);

//   res.render("home");
// });

// app.all("/login", async (req, res) => {
//   if (req.method === "GET") {
//     res.render("login");
//   } else if (req.method === "POST") {
//     try {
//       const check = await collection.findOne({ email: req.body.email });

//       if (check.password === req.body.password) {
//         res.render("home");
//       } else {
//         res.send("Wrong Password!");
//       }
//     } catch {
//       res.send("Wrong Details!");
//     }
//   }
// });

// app.get("/logout", (req, res) => {
//   res.redirect("/login");
// });

// app.listen(3000, () => {
//   console.log("Port Connected at the following website http://localhost:3000/");
// });

const express = require("express");
const app = express();
const path = require("path");
const hbs = require("hbs");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const collection = require("./mongodb");

const templatePath = path.join(__dirname, "../templates");
app.use(express.json());
app.set("view engine", "hbs");
app.set("views", templatePath);
app.use(express.urlencoded({ extended: false }));

// Memory store for verification tokens
const tokens = {};

// Email transporter
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "22141@iiitu.ac.in", // Replace with your Gmail
    pass: "tpgyroqgeeavczld",    // Use App Password, not your actual password
  },
});

// ----------- ROUTES ------------

app.get("/", (req, res) => res.render("login"));
app.get("/signup", (req, res) => res.render("signup"));

app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  if (password.length < 7) {
    return res.render("signup", { error: "Password must be at least 7 characters." });
  }

  const token = uuidv4();
  tokens[token] = { type: "create", data: { email, password } };

  const verifyLink = `http://localhost:3000/verify/${token}`;
  await transporter.sendMail({
    from: '"AuthApp" <your-email@gmail.com>',
    to: email,
    subject: "Verify Your Account",
    html: `Click to verify account creation: <a href="${verifyLink}">${verifyLink}</a>`,
  });

  res.send("Verification email sent. Please check your inbox.");
});

app.get("/verify/:token", async (req, res) => {
  const token = req.params.token;
  const entry = tokens[token];

  if (!entry) {
    return res.send("Invalid or expired verification link.");
  }

  try {
    let message = "";

    if (entry.type === "create") {
      await collection.create(entry.data);
      message = "Account created successfully!";
    } else if (entry.type === "update") {
      await collection.updateOne({ email: entry.data.email }, { $set: entry.data.updates });
      message = "Password updated successfully!";
    } else if (entry.type === "delete") {
      await collection.deleteOne({ email: entry.data.email });
      message = "Account deleted successfully!";
    }

    delete tokens[token];
    res.render("home", { message });

  } catch (err) {
    console.error("Error during verification:", err);
    res.send("Something went wrong. Check server logs.");
  }
});



app.post("/login", async (req, res) => {
  const check = await collection.findOne({ email: req.body.email });
  if (!check) return res.send("User not found.");

  if (check.password === req.body.password) {
    res.render("home");
  } else {
    res.send("Wrong password!");
  }
});

// --------- UPDATE FLOW ----------
app.post("/update", async (req, res) => {
  const { email, newPassword } = req.body;
  const token = uuidv4();
  tokens[token] = { type: "update", data: { email, updates: { password: newPassword } } };

  const verifyLink = `http://localhost:3000/verify/${token}`;
  await transporter.sendMail({
    to: email,
    subject: "Verify Update",
    html: `Click to verify password update: <a href="${verifyLink}">${verifyLink}</a>`,
  });

  res.send("Update verification email sent.");
});

// --------- DELETE FLOW ----------
app.post("/delete", async (req, res) => {
  const { email } = req.body;
  const token = uuidv4();
  tokens[token] = { type: "delete", data: { email } };

  const verifyLink = `http://localhost:3000/verify/${token}`;
  await transporter.sendMail({
    to: email,
    subject: "Verify Account Deletion",
    html: `Click to confirm account deletion: <a href="${verifyLink}">${verifyLink}</a>`,
  });

  res.send("Deletion verification email sent.");
});

app.get("/logout", (req, res) => res.redirect("/login"));

app.listen(3000, () => {
  console.log("Running at http://localhost:3000/");
});
