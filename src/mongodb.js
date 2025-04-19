const mongoose = require('mongoose');

mongoose.connect("mongodb://localhost:27017/LoginSignUP")
  .then(() => {
    console.log("MongoDB Connected Successfully!");
  })
  .catch(() => {
    console.log("Failed to Connect!");
  });

const LogInSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true // optional, but prevents duplicate emails
  },
  password: {
    type: String,
    required: true
  }
});

const collection = mongoose.model("LogInCollection", LogInSchema);

module.exports = collection;
