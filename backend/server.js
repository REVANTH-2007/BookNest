
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// DATABASE MODELS

const User = mongoose.model("User", new mongoose.Schema({
  email: { type: String, unique: true },
  password: String
}));

const Book = mongoose.model("Book", new mongoose.Schema({
  title: { type: String, required: true },
  author: String,
  category: String,
  quantity: { type: Number, default: 1 },
  available: { type: Number, default: 1 }
}, { timestamps: true }));

const Student = mongoose.model("Student", new mongoose.Schema({
  name: { type: String, required: true },
  studentId: { type: String, unique: true },
  department: String,
  email: String
}, { timestamps: true }));

const Transaction = mongoose.model("Transaction", new mongoose.Schema({
  book: { type: mongoose.Schema.Types.ObjectId, ref: "Book" },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  issueDate: { type: Date, default: Date.now },
  dueDate: Date,
  returnDate: Date,
  status: { type: String, default: "Issued" }
}, { timestamps: true }));

// CREATE DEFAULT ADMIN

async function createAdmin() {
  const email = "admin@booknest.com";
  const password = await bcrypt.hash("BookNest123", 10);

  await User.updateOne(
    { email },
    { $set: { password } },
    { upsert: true }
  );

  console.log("BookNest admin account ready");
}

// AUTHENTICATION MIDDLEWARE

function protect(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Login required" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "booknest_secret_2026"
    );

    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

// LOGIN API


app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim().toLowerCase();

    const password = String(req.body.password || "");

    if (!email.includes("@")) {
      return res.status(400).json({
        message: "Enter a valid email address"
      });
    }

    if (!password.trim()) {
      return res.status(400).json({
        message: "Enter password"
      });
    }

    let user = await User.findOne({ email });

    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 10);

      user = await User.create({
        email,
        password: hashedPassword
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "booknest_secret_2026",
      { expiresIn: "1d" }
    );

    res.json({
      token,
      admin: {
        email: user.email,
        name: "Library Admin"
      }
    });

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});


// BOOK APIs

app.get("/api/books", protect, async (req, res) => {
  res.json(await Book.find().sort({ createdAt: -1 }));
});

app.post("/api/books", protect, async (req, res) => {
  try {
    const book = await Book.create({
      ...req.body,
      quantity: Number(req.body.quantity),
      available: Number(req.body.quantity)
    });

    res.status(201).json(book);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put("/api/books/:id", protect, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    const issued = book.quantity - book.available;
    const quantity = Number(req.body.quantity);

    if (quantity < issued) {
      return res.status(400).json({
        message: "Quantity is below issued copies"
      });
    }

    Object.assign(book, req.body);
    book.quantity = quantity;
    book.available = quantity - issued;

    await book.save();

    res.json(book);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete("/api/books/:id", protect, async (req, res) => {
  try {
    const active = await Transaction.findOne({
      book: req.params.id,
      status: "Issued"
    });

    if (active) {
      return res.status(400).json({
        message: "Book has an active issue"
      });
    }

    await Book.findByIdAndDelete(req.params.id);

    res.json({ message: "Book deleted" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// STUDENT APIs

app.get("/api/students", protect, async (req, res) => {
  res.json(await Student.find().sort({ createdAt: -1 }));
});

app.post("/api/students", protect, async (req, res) => {
  try {
    const student = await Student.create(req.body);
    res.status(201).json(student);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put("/api/students/:id", protect, async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!student) {
      return res.status(404).json({
        message: "Student not found"
      });
    }

    res.json(student);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete("/api/students/:id", protect, async (req, res) => {
  try {
    const active = await Transaction.findOne({
      student: req.params.id,
      status: "Issued"
    });

    if (active) {
      return res.status(400).json({
        message: "Student has an active issue"
      });
    }

    await Student.findByIdAndDelete(req.params.id);

    res.json({ message: "Student deleted" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ISSUE BOOK

app.post("/api/transactions/issue", protect, async (req, res) => {
  try {
    const { bookId, studentId } = req.body;

    const book = await Book.findById(bookId);
    const student = await Student.findById(studentId);

    if (!book || !student) {
      return res.status(404).json({
        message: "Book or student not found"
      });
    }

    if (book.available < 1) {
      return res.status(400).json({
        message: "Book is not available"
      });
    }

    book.available -= 1;
    await book.save();

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    const transaction = await Transaction.create({
      book: book._id,
      student: student._id,
      dueDate
    });

    res.status(201).json(transaction);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// RETURN BOOK

app.put("/api/transactions/return/:id", protect, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found"
      });
    }

    if (transaction.status === "Returned") {
      return res.status(400).json({
        message: "Book already returned"
      });
    }

    transaction.status = "Returned";
    transaction.returnDate = new Date();

    await transaction.save();

    await Book.findByIdAndUpdate(transaction.book, {
      $inc: { available: 1 }
    });

    res.json({ message: "Book returned successfully" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// TRANSACTION HISTORY

app.get("/api/transactions", protect, async (req, res) => {
  const transactions = await Transaction.find()
    .populate("book", "title")
    .populate("student", "name studentId")
    .sort({ createdAt: -1 });

  res.json(transactions);
});

// DASHBOARD STATISTICS

app.get("/api/dashboard", protect, async (req, res) => {
  const books = await Book.find();
  const students = await Student.countDocuments();

  const issued = await Transaction.countDocuments({
    status: "Issued"
  });

  const totalCopies = books.reduce(
    (sum, book) => sum + book.quantity, 0
  );

  const availableCopies = books.reduce(
    (sum, book) => sum + book.available, 0
  );

  res.json({
    bookTitles: books.length,
    totalCopies,
    availableCopies,
    students,
    issued
  });
});

// HOME API

app.get("/", (req, res) => {
  res.send("BookNest API is running");
});

// START SERVER

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected successfully");

    await createAdmin();

    app.listen(process.env.PORT || 5000, () => {
      console.log(
        `BookNest server running on port ${process.env.PORT || 5000}`
      );
    });
  })
  .catch(err => {
    console.log("Database connection error:", err.message);
  });
