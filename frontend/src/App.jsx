
import { useEffect, useState } from "react";
import {
  Library, LayoutDashboard, BookOpen, Users, ArrowLeftRight,
  Search, Plus, Pencil, Trash2, LogOut, Menu, X,
  BookCheck, Clock, RotateCcw, GraduationCap
} from "lucide-react";
import api from "./api";
import "./App.css";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(
    Boolean(localStorage.getItem("booknestToken"))
  );
  const [admin, setAdmin] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("booknestAdmin")) || null;
    } catch {
      return null;
    }
  });

  const [page, setPage] = useState("Dashboard");
  const [books, setBooks] = useState([]);
  const [students, setStudents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [issue, setIssue] = useState({ bookId: "", studentId: "" });
  const [email, setEmail] = useState("admin@booknest.com");
  const [password, setPassword] = useState("BookNest123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const logout = () => {
    localStorage.removeItem("booknestToken");
    localStorage.removeItem("booknestAdmin");
    setLoggedIn(false);
    setAdmin(null);
    setBooks([]);
    setStudents([]);
    setTransactions([]);
    setStats({});
  };

  async function loadData() {
    try {
      const [bookRes, studentRes, transactionRes, dashboardRes] =
        await Promise.all([
          api.get("/books"),
          api.get("/students"),
          api.get("/transactions"),
          api.get("/dashboard")
        ]);

      setBooks(bookRes.data);
      setStudents(studentRes.data);
      setTransactions(transactionRes.data);
      setStats(dashboardRes.data);
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        return;
      }
      alert(err.response?.data?.message || "Could not load library data.");
    }
  }

  useEffect(() => {
    if (loggedIn) loadData();
  }, [loggedIn]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", { email, password });

      localStorage.setItem("booknestToken", response.data.token);
      localStorage.setItem("booknestAdmin", JSON.stringify(response.data.admin));

      setAdmin(response.data.admin);
      setLoggedIn(true);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const openForm = (item = null) => {
    setEditId(item?._id || null);
    setForm(item ? { ...item } : {});
    setShowForm(true);
  };

  const saveForm = async (e) => {
    e.preventDefault();

    try {
      if (page === "Books") {
        const data = {
          title: form.title,
          author: form.author,
          category: form.category,
          quantity: Number(form.quantity)
        };

        if (editId) {
          await api.put(`/books/${editId}`, data);
        } else {
          await api.post("/books", data);
        }
      } else {
        const data = {
          name: form.name,
          studentId: form.studentId,
          department: form.department,
          email: form.email
        };

        if (editId) {
          await api.put(`/students/${editId}`, data);
        } else {
          await api.post("/students", data);
        }
      }

      setShowForm(false);
      setForm({});
      setEditId(null);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || "Could not save details.");
    }
  };

  const deleteItem = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) {
      return;
    }

    try {
      if (page === "Books") {
        await api.delete(`/books/${id}`);
      } else {
        await api.delete(`/students/${id}`);
      }
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || "Could not delete record.");
    }
  };

  const issueBook = async (e) => {
    e.preventDefault();

    try {
      await api.post("/transactions/issue", {
        bookId: issue.bookId,
        studentId: issue.studentId
      });

      setIssue({ bookId: "", studentId: "" });
      await loadData();
      alert("Book issued successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Could not issue book.");
    }
  };

  const returnBook = async (id) => {
    try {
      await api.put(`/transactions/return/${id}`);
      await loadData();
      alert("Book returned successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Could not return book.");
    }
  };

  const nav = [
    ["Dashboard", LayoutDashboard],
    ["Books", BookOpen],
    ["Students", Users],
    ["Transactions", ArrowLeftRight]
  ];

  const filteredBooks = books.filter((b) =>
    `${b.title} ${b.author} ${b.category}`
      .toLowerCase().includes(search.toLowerCase())
  );

  const filteredStudents = students.filter((s) =>
    `${s.name} ${s.studentId} ${s.department}`
      .toLowerCase().includes(search.toLowerCase())
  );

  const filteredTransactions = transactions.filter((t) =>
    `${t.book?.title || ""} ${t.student?.name || ""} ${t.student?.studentId || ""}`
      .toLowerCase().includes(search.toLowerCase())
  );

  const active = transactions.filter((t) => t.status === "Issued");
  const returned = transactions.filter((t) => t.status === "Returned");

  if (!loggedIn) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="brand-logo"><Library size={30} /></div>
          <h1>BookNest</h1>
          <p className="muted">Your Smart Library Management System</p>

          <form onSubmit={handleLogin}>
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && <p style={{ color: "red", fontSize: 13 }}>{error}</p>}

            <button className="primary full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In to BookNest"}
            </button>
          </form>

          <p className="login-note">
            Demo admin: admin@booknest.com
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "show" : ""}`}>
        <div className="brand">
          <div className="brand-logo"><Library size={25} /></div>
          <div>
            <h2>BookNest</h2>
            <small>LIBRARY PORTAL</small>
          </div>
          <button className="mobile-close" onClick={() => setMobileMenu(false)}>
            <X />
          </button>
        </div>

        <p className="nav-heading">WORKSPACE</p>

        {nav.map(([name, Icon]) => (
          <button
            key={name}
            className={`nav-link ${page === name ? "selected" : ""}`}
            onClick={() => {
              setPage(name);
              setSearch("");
              setMobileMenu(false);
            }}
          >
            <Icon size={19} /> {name}
          </button>
        ))}

        <div className="sidebar-bottom">
          <div className="admin-mini">
            <div className="avatar">A</div>
            <div>
              <strong>{admin?.name || "Library Admin"}</strong>
              <small>Administrator</small>
            </div>
          </div>
          <button className="logout" onClick={logout}>
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileMenu(true)}>
            <Menu />
          </button>
          <div>
            <h2>{page}</h2>
            <p>Welcome back! Manage your library with ease.</p>
          </div>
          <div className="top-profile">
            <div className="avatar">A</div>
            <span>Admin</span>
          </div>
        </header>

        <section className="page-content">
          {page === "Dashboard" && (
            <>
              <div className="welcome-banner">
                <div>
                  <span>BOOKNEST OVERVIEW</span>
                  <h1>Your library, at a glance.</h1>
                  <p>Manage books, students and library activity in one place.</p>
                </div>
                <div className="banner-icon"><Library size={66} /></div>
              </div>

              <div className="stats-grid">
                <Stat icon={BookOpen} label="Book Titles" value={stats.bookTitles ?? 0} color="blue" />
                <Stat icon={BookCheck} label="Total Copies" value={stats.totalCopies ?? 0} color="purple" />
                <Stat icon={GraduationCap} label="Students" value={stats.students ?? 0} color="green" />
                <Stat icon={Clock} label="Books Issued" value={stats.issued ?? 0} color="orange" />
              </div>

              <div className="panel">
                <div className="panel-title">
                  <div><h3>Recent Transactions</h3><p>Latest library activity</p></div>
                  <button className="text-button" onClick={() => setPage("Transactions")}>
                    View all →
                  </button>
                </div>

                {transactions.length === 0 ? (
                  <Empty text="No transactions yet. Issue your first book!" />
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>Book</th><th>Student</th><th>Issue Date</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {transactions.slice(0, 5).map((t) => (
                          <tr key={t._id}>
                            <td>{t.book?.title || "Book unavailable"}</td>
                            <td>{t.student?.name || "Student unavailable"}</td>
                            <td>{formatDate(t.issueDate)}</td>
                            <td>
                              <span className={`status ${t.status === "Returned" ? "returned" : "issued"}`}>
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {(page === "Books" || page === "Students") && (
            <>
              <div className="section-heading">
                <div>
                  <h1>{page === "Books" ? "Books Collection" : "Student Directory"}</h1>
                  <p>
                    {page === "Books"
                      ? "Add and organize your library books."
                      : "Manage registered student information."}
                  </p>
                </div>
                <button className="primary" onClick={() => openForm()}>
                  <Plus size={18} /> Add {page === "Books" ? "Book" : "Student"}
                </button>
              </div>

              <div className="search-box">
                <Search size={18} />
                <input
                  placeholder={`Search ${page.toLowerCase()}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {page === "Books" ? (
                <>
                  <div className="book-grid">
                    {filteredBooks.map((b) => (
                      <div className="book-card" key={b._id}>
                        <div className="book-cover"><BookOpen size={34} /></div>
                        <span className="category">{b.category}</span>
                        <h3>{b.title}</h3>
                        <p>by {b.author}</p>
                        <div className="book-footer">
                          <span>{b.available} / {b.quantity} available</span>
                          <div>
                            <button className="icon-button" onClick={() => openForm(b)}>
                              <Pencil size={16} />
                            </button>
                            <button className="icon-button danger" onClick={() => deleteItem(b._id)}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {filteredBooks.length === 0 && <Empty text="No books found." />}
                </>
              ) : (
                <div className="panel table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Student</th><th>Student ID</th><th>Department</th><th>Email</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((s) => (
                        <tr key={s._id}>
                          <td><strong>{s.name}</strong></td>
                          <td>{s.studentId}</td>
                          <td>{s.department}</td>
                          <td>{s.email}</td>
                          <td>
                            <button className="icon-button" onClick={() => openForm(s)}>
                              <Pencil size={16} />
                            </button>
                            <button className="icon-button danger" onClick={() => deleteItem(s._id)}>
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredStudents.length === 0 && <Empty text="No students found." />}
                </div>
              )}
            </>
          )}

          {page === "Transactions" && (
            <>
              <div className="section-heading">
                <div><h1>Book Transactions</h1><p>Issue books and manage returns.</p></div>
              </div>

              <div className="stats-grid compact">
                <Stat icon={ArrowLeftRight} label="Total Transactions" value={transactions.length} color="blue" />
                <Stat icon={Clock} label="Currently Issued" value={active.length} color="orange" />
                <Stat icon={RotateCcw} label="Returned" value={returned.length} color="green" />
              </div>

              <div className="panel issue-panel">
                <div className="panel-title">
                  <div><h3>Issue a Book</h3><p>Select a book and student</p></div>
                </div>
                <form className="issue-form" onSubmit={issueBook}>
                  <select
                    required
                    value={issue.bookId}
                    onChange={(e) => setIssue({ ...issue, bookId: e.target.value })}
                  >
                    <option value="">Select Book</option>
                    {books.filter((b) => b.available > 0).map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.title} ({b.available} available)
                      </option>
                    ))}
                  </select>

                  <select
                    required
                    value={issue.studentId}
                    onChange={(e) => setIssue({ ...issue, studentId: e.target.value })}
                  >
                    <option value="">Select Student</option>
                    {students.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} – {s.studentId}
                      </option>
                    ))}
                  </select>

                  <button className="primary"><Plus size={17} /> Issue Book</button>
                </form>
              </div>

              <div className="panel">
                <div className="panel-title">
                  <div><h3>Transaction History</h3><p>All issued and returned books</p></div>
                  <div className="search-box small-search">
                    <Search size={16} />
                    <input
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Book</th><th>Student</th><th>Issue Date</th><th>Due Date</th><th>Status / Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((t) => (
                        <tr key={t._id}>
                          <td>{t.book?.title || "Book unavailable"}</td>
                          <td>{t.student?.name || "Student unavailable"}</td>
                          <td>{formatDate(t.issueDate)}</td>
                          <td>{formatDate(t.dueDate)}</td>
                          <td>
                            {t.status === "Returned" ? (
                              <span className="status returned">Returned</span>
                            ) : (
                              <button className="return-button" onClick={() => returnBook(t._id)}>
                                Return Book
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredTransactions.length === 0 && <Empty text="No transactions found." />}
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={saveForm}>
            <div className="modal-heading">
              <h2>{editId ? "Edit" : "Add"} {page === "Books" ? "Book" : "Student"}</h2>
              <button type="button" className="icon-button" onClick={() => setShowForm(false)}>
                <X />
              </button>
            </div>

            {page === "Books" ? (
              <>
                <Field label="Book Title" value={form.title || ""} change={(v) => setForm({ ...form, title: v })} />
                <Field label="Author" value={form.author || ""} change={(v) => setForm({ ...form, author: v })} />
                <Field label="Category" value={form.category || ""} change={(v) => setForm({ ...form, category: v })} />
                <Field label="Quantity" type="number" value={form.quantity ?? ""} change={(v) => setForm({ ...form, quantity: v })} />
              </>
            ) : (
              <>
                <Field label="Student Name" value={form.name || ""} change={(v) => setForm({ ...form, name: v })} />
                <Field label="Student ID" value={form.studentId || ""} change={(v) => setForm({ ...form, studentId: v })} />
                <Field label="Department" value={form.department || ""} change={(v) => setForm({ ...form, department: v })} />
                <Field label="Email" type="email" value={form.email || ""} change={(v) => setForm({ ...form, email: v })} />
              </>
            )}

            <button className="primary full">Save Details</button>
          </form>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}><Icon size={22} /></div>
      <div><p>{label}</p><h2>{value}</h2></div>
    </div>
  );
}

function Field({ label, value, change, type = "text" }) {
  return (
    <label className="form-field">
      {label}
      <input
        required
        type={type}
        min={type === "number" ? "1" : undefined}
        value={value}
        onChange={(e) => change(e.target.value)}
      />
    </label>
  );
}

function Empty({ text }) {
  return (
    <div className="empty-state">
      <BookOpen size={30} />
      <p>{text}</p>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}
