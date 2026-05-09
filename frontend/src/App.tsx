import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";

type Role = "User" | "Admin" | "Staff";
type ComplaintStatus = "Pending" | "In Progress" | "Resolve Requested" | "Resolved";
type ComplaintPriority = "High" | "Medium" | "Low";

type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
};

type Staff = {
  id: number;
  user_id: number;
  name: string;
  department: string;
};

type Complaint = {
  id: number;
  user_id: number;
  title: string;
  description: string;
  category: string;
  priority: ComplaintPriority;
  building: string;
  floor: string;
  room: string;
  image_url: string | null;
  status: ComplaintStatus;
  assigned_staff_id?: number;
  assigned_staff_name?: string;
  user_name?: string;
  created_at?: string;
};

type DashboardSummary = {
  total_complaints: number;
  status_wise: Array<{ status: ComplaintStatus; count: number }>;
  category_wise: Array<{ category: string; count: number }>;
  staff_performance: Array<{
    staff_id: number;
    staff_name: string;
    total_assigned: number;
    resolved_count: number;
  }>;
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

type AuthResponse = {
  token: string;
  user: User;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

const safeJson = <T,>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const buildClass = (value: string) => value.replace(/\s+/g, "-");

const getAdminStatusOptions = (currentStatus: ComplaintStatus): ComplaintStatus[] => {
  if (currentStatus === "Pending") return ["In Progress"];
  if (currentStatus === "In Progress") return ["Pending", "Resolve Requested"];
  if (currentStatus === "Resolve Requested") return ["In Progress", "Resolved"];
  return ["In Progress"];
};

const getStaffStatusOptions = (currentStatus: ComplaintStatus): ComplaintStatus[] => {
  if (currentStatus === "In Progress") return ["Resolve Requested"];
  return [];
};

function App() {
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [token, setToken] = useState<string>(() => localStorage.getItem("token") || "");
  const [currentUser, setCurrentUser] = useState<User | null>(() => safeJson<User>(localStorage.getItem("user")));
  const [toast, setToast] = useState<{ message: string; kind: "ok" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);

  const [myComplaints, setMyComplaints] = useState<Complaint[]>([]);
  const [allComplaints, setAllComplaints] = useState<Complaint[]>([]);
  const [assignedComplaints, setAssignedComplaints] = useState<Complaint[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);

  const [filters, setFilters] = useState({ status: "", category: "", priority: "" });

  const isAuthenticated = Boolean(token && currentUser);

  const notify = (message: string, kind: "ok" | "error" = "ok") => {
    setToast({ message, kind });
    window.setTimeout(() => setToast(null), 2500);
  };

  const request = async <T,>(path: string, init?: RequestInit, isForm = false): Promise<ApiResponse<T>> => {
    const headers: Record<string, string> = {};
    if (!isForm) {
      headers["Content-Type"] = "application/json";
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...headers,
        ...(init?.headers || {})
      }
    });

    const payload = (await res.json().catch(() => ({}))) as ApiResponse<T>;
    if (!res.ok) {
      throw new Error(payload.message || "Request failed");
    }
    return payload;
  };

  const persistSession = (auth: AuthResponse) => {
    setToken(auth.token);
    setCurrentUser(auth.user);
    localStorage.setItem("token", auth.token);
    localStorage.setItem("user", JSON.stringify(auth.user));
  };

  const clearSession = () => {
    setToken("");
    setCurrentUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setMyComplaints([]);
    setAllComplaints([]);
    setAssignedComplaints([]);
    setDashboard(null);
  };

  const loadUserComplaints = async () => {
    const res = await request<Complaint[]>("/complaints/my");
    setMyComplaints(res.data || []);
  };

  const loadStaffComplaints = async () => {
    const res = await request<Complaint[]>("/complaints/assigned");
    setAssignedComplaints(res.data || []);
  };

  const loadStaffList = async () => {
    const res = await request<Staff[]>("/complaints/staff");
    setStaffList(res.data || []);
  };

  const loadAllComplaints = async (nextFilters = filters) => {
    const params = new URLSearchParams();
    if (nextFilters.status) params.append("status", nextFilters.status);
    if (nextFilters.category) params.append("category", nextFilters.category);
    if (nextFilters.priority) params.append("priority", nextFilters.priority);
    const query = params.toString();

    const res = await request<Complaint[]>(`/complaints/all${query ? `?${query}` : ""}`);
    setAllComplaints(res.data || []);
  };

  const loadDashboard = async () => {
    const res = await request<DashboardSummary>("/dashboard/summary");
    setDashboard(res.data);
  };

  const refreshByRole = async () => {
    if (!currentUser) return;

    if (currentUser.role === "User") {
      await loadUserComplaints();
    }

    if (currentUser.role === "Admin") {
      await Promise.all([loadStaffList(), loadAllComplaints(filters), loadDashboard()]);
    }

    if (currentUser.role === "Staff") {
      await loadStaffComplaints();
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    refreshByRole().catch((error: Error) => {
      notify(error.message, "error");
      clearSession();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, currentUser?.role]);

  const statusMap = useMemo(() => {
    const map: Record<ComplaintStatus, number> = {
      Pending: 0,
      "In Progress": 0,
      "Resolve Requested": 0,
      Resolved: 0
    };

    dashboard?.status_wise?.forEach((item) => {
      map[item.status] = Number(item.count);
    });
    return map;
  }, [dashboard]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    try {
      const res = await request<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: String(form.get("email") || ""),
          password: String(form.get("password") || "")
        })
      });
      persistSession(res.data);
      notify("Login successful");
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const role = String(form.get("role") || "User") as Role;

    setLoading(true);
    try {
      const payload: Record<string, string> = {
        name: String(form.get("name") || ""),
        email: String(form.get("email") || ""),
        password: String(form.get("password") || ""),
        role
      };
      if (role === "Staff") {
        payload.department = String(form.get("department") || "General");
      }

      const res = await request<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      persistSession(res.data);
      notify("Registration successful");
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleComplaintCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    try {
      await request<Complaint>("/complaints/create", { method: "POST", body: form }, true);
      notify("Complaint created");
      event.currentTarget.reset();
      await loadUserComplaints();
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async (complaintId: number, form: HTMLFormElement) => {
    const formData = new FormData(form);
    await request<void>("/feedback/add", {
      method: "POST",
      body: JSON.stringify({
        complaint_id: complaintId,
        rating: Number(formData.get("rating")),
        comment: String(formData.get("comment") || "")
      })
    });
  };

  const assignComplaint = async (complaintId: number, staffId: number) => {
    await request<void>("/complaints/assign", {
      method: "POST",
      body: JSON.stringify({ complaint_id: complaintId, staff_id: staffId })
    });
  };

  const updateStatus = async (complaintId: number, status: ComplaintStatus) => {
    await request<void>("/complaints/update-status", {
      method: "PATCH",
      body: JSON.stringify({ complaint_id: complaintId, status })
    });
  };

  const AuthPanel = () => {
    const [role, setRole] = useState<Role>("User");

    return (
      <section className="card auth-card">
        <div className="auth-switch">
          <button type="button" className={`chip ${authTab === "login" ? "chip-active" : ""}`} onClick={() => setAuthTab("login")}>
            Login
          </button>
          <button type="button" className={`chip ${authTab === "register" ? "chip-active" : ""}`} onClick={() => setAuthTab("register")}>
            Register
          </button>
        </div>

        {authTab === "login" ? (
          <form className="form-grid" onSubmit={handleLogin}>
            <h2>Welcome Back</h2>
            <label>
              Email
              <input name="email" type="email" required />
            </label>
            <label>
              Password
              <input name="password" type="password" required />
            </label>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              Sign In
            </button>
          </form>
        ) : (
          <form className="form-grid" onSubmit={handleRegister}>
            <h2>Create Account</h2>
            <label>
              Name
              <input name="name" required />
            </label>
            <label>
              Email
              <input name="email" type="email" required />
            </label>
            <label>
              Password
              <input name="password" type="password" minLength={6} required />
            </label>
            <label>
              Role
              <select name="role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="User">User</option>
                <option value="Staff">Staff</option>
                <option value="Admin">Admin</option>
              </select>
            </label>
            {role === "Staff" && (
              <label>
                Department
                <input name="department" placeholder="Electrical / Network / General" />
              </label>
            )}
            <button className="btn btn-primary" type="submit" disabled={loading}>
              Create Account
            </button>
          </form>
        )}
      </section>
    );
  };

  return (
    <>
      <div className="bg-orb orb-a"></div>
      <div className="bg-orb orb-b"></div>

      <header className="shell-header">
        <h1>Smart Complaint Management System</h1>
        <p>Fast reporting, smart routing, clear ownership.</p>
      </header>

      <main className="shell-main">
        {!isAuthenticated && <AuthPanel />}

        {isAuthenticated && currentUser && (
          <section>
            <div className="card topbar">
              <div>
                <h2>Hi, {currentUser.name}</h2>
                <p>
                  {currentUser.role} | {currentUser.email}
                </p>
              </div>
              <button className="btn" type="button" onClick={clearSession}>
                Logout
              </button>
            </div>

            {currentUser.role === "User" && (
              <div className="grid two-col">
                <section className="card">
                  <h3>Submit Complaint</h3>
                  <form className="form-grid" onSubmit={handleComplaintCreate}>
                    <label>
                      Title
                      <input name="title" required />
                    </label>
                    <label>
                      Description
                      <textarea name="description" rows={5} required></textarea>
                    </label>
                    <label>
                      Building
                      <select name="building" required>
                        <option value="">Select building</option>
                        <option>A Block</option>
                        <option>B Block</option>
                        <option>C Block</option>
                        <option>Library</option>
                        <option>Lab Complex</option>
                      </select>
                    </label>
                    <label>
                      Floor
                      <select name="floor" required>
                        <option value="">Select floor</option>
                        <option>Ground</option>
                        <option>1</option>
                        <option>2</option>
                        <option>3</option>
                        <option>4</option>
                      </select>
                    </label>
                    <label>
                      Room
                      <select name="room" required>
                        <option value="">Select room</option>
                        <option>101</option>
                        <option>102</option>
                        <option>103</option>
                        <option>201</option>
                        <option>202</option>
                        <option>203</option>
                        <option>301</option>
                        <option>302</option>
                        <option>Lab-1</option>
                        <option>Lab-2</option>
                      </select>
                    </label>
                    <label>
                      Image (Optional)
                      <input name="image" type="file" accept="image/*" />
                    </label>
                    <button className="btn btn-primary" type="submit" disabled={loading}>
                      Create Complaint
                    </button>
                  </form>
                </section>

                <section className="card">
                  <h3>My Complaints</h3>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Title</th>
                          <th>Category</th>
                          <th>Priority</th>
                          <th>Status</th>
                          <th>Feedback</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myComplaints.map((item) => (
                          <tr key={item.id}>
                            <td>{item.id}</td>
                            <td>{item.title}</td>
                            <td>{item.category}</td>
                            <td>
                              <span className={`badge priority-${buildClass(item.priority)}`}>{item.priority}</span>
                            </td>
                            <td>
                              <span className={`badge status-${buildClass(item.status)}`}>{item.status}</span>
                            </td>
                            <td>
                              {item.status !== "Resolved" ? (
                                "-"
                              ) : (
                                <form
                                  className="inline-form"
                                  onSubmit={async (event) => {
                                    event.preventDefault();
                                    setLoading(true);
                                    try {
                                      await submitFeedback(item.id, event.currentTarget);
                                      notify("Feedback submitted");
                                      await loadUserComplaints();
                                    } catch (error) {
                                      notify((error as Error).message, "error");
                                    } finally {
                                      setLoading(false);
                                    }
                                  }}
                                >
                                  <select name="rating" required>
                                    <option value="">Rate</option>
                                    <option>5</option>
                                    <option>4</option>
                                    <option>3</option>
                                    <option>2</option>
                                    <option>1</option>
                                  </select>
                                  <input name="comment" placeholder="Comment" />
                                  <button className="btn" type="submit">
                                    Send
                                  </button>
                                </form>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {myComplaints.length === 0 && <p>No records found.</p>}
                  </div>
                </section>
              </div>
            )}

            {currentUser.role === "Admin" && (
              <div className="grid">
                <section className="card">
                  <h3>Dashboard Summary</h3>
                  <div className="stat-grid">
                    <div className="stat">
                      <h4>Total</h4>
                      <p>{dashboard?.total_complaints || 0}</p>
                    </div>
                    <div className="stat">
                      <h4>Pending</h4>
                      <p>{statusMap.Pending}</p>
                    </div>
                    <div className="stat">
                      <h4>In Progress</h4>
                      <p>{statusMap["In Progress"]}</p>
                    </div>
                    <div className="stat">
                      <h4>Resolve Requested</h4>
                      <p>{statusMap["Resolve Requested"]}</p>
                    </div>
                    <div className="stat">
                      <h4>Resolved</h4>
                      <p>{statusMap.Resolved}</p>
                    </div>
                  </div>
                  <div className="grid two-col">
                    <div className="card">
                      <h3>Category-wise Count</h3>
                      <ul>
                        {dashboard?.category_wise?.map((item) => (
                          <li key={item.category}>
                            {item.category}: <strong>{item.count}</strong>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="card">
                      <h3>Staff Performance</h3>
                      <ul>
                        {dashboard?.staff_performance?.map((item) => (
                          <li key={item.staff_id}>
                            {item.staff_name} | assigned: <strong>{item.total_assigned || 0}</strong> | resolved: <strong>{item.resolved_count || 0}</strong>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>

                <section className="card">
                  <h3>All Complaints</h3>
                  <form
                    className="inline-form"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      await loadAllComplaints(filters);
                    }}
                  >
                    <select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
                      <option value="">All Status</option>
                      <option>Pending</option>
                      <option>In Progress</option>
                      <option>Resolve Requested</option>
                      <option>Resolved</option>
                    </select>
                    <select value={filters.category} onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}>
                      <option value="">All Category</option>
                      <option>Network</option>
                      <option>Plumbing</option>
                      <option>Electrical</option>
                      <option>General</option>
                    </select>
                    <select value={filters.priority} onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value }))}>
                      <option value="">All Priority</option>
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                    <button className="btn" type="submit">
                      Apply
                    </button>
                  </form>

                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Title</th>
                          <th>User</th>
                          <th>Category</th>
                          <th>Priority</th>
                          <th>Status</th>
                          <th>Assign</th>
                          <th>Update</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allComplaints.map((item) => (
                          <tr key={item.id}>
                            <td>{item.id}</td>
                            <td>{item.title}</td>
                            <td>{item.user_name}</td>
                            <td>{item.category}</td>
                            <td>
                              <span className={`badge priority-${buildClass(item.priority)}`}>{item.priority}</span>
                            </td>
                            <td>
                              <span className={`badge status-${buildClass(item.status)}`}>{item.status}</span>
                            </td>
                            <td>
                              <select
                                defaultValue={item.assigned_staff_id || ""}
                                onChange={async (event) => {
                                  const value = Number(event.target.value);
                                  if (!value) return;
                                  setLoading(true);
                                  try {
                                    await assignComplaint(item.id, value);
                                    notify("Complaint assigned");
                                    await loadAllComplaints(filters);
                                  } catch (error) {
                                    notify((error as Error).message, "error");
                                  } finally {
                                    setLoading(false);
                                  }
                                }}
                              >
                                <option value="">Assign</option>
                                {staffList.map((staff) => (
                                  <option key={staff.id} value={staff.id}>
                                    {staff.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <form
                                className="inline-form"
                                onSubmit={async (event) => {
                                  event.preventDefault();
                                  const formData = new FormData(event.currentTarget);
                                  const status = String(formData.get("status")) as ComplaintStatus;
                                  setLoading(true);
                                  try {
                                    await updateStatus(item.id, status);
                                    notify("Status updated");
                                    await Promise.all([loadAllComplaints(filters), loadDashboard()]);
                                  } catch (error) {
                                    notify((error as Error).message, "error");
                                  } finally {
                                    setLoading(false);
                                  }
                                }}
                              >
                                <select name="status" defaultValue={item.status}>
                                  {getAdminStatusOptions(item.status).map((statusOption) => (
                                    <option key={statusOption}>{statusOption}</option>
                                  ))}
                                </select>
                                <button className="btn" type="submit">
                                  Save
                                </button>
                              </form>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {allComplaints.length === 0 && <p>No records found.</p>}
                  </div>
                </section>
              </div>
            )}

            {currentUser.role === "Staff" && (
              <section className="card">
                <h3>Assigned Complaints</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>By</th>
                        <th>Category</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Update</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignedComplaints.map((item) => (
                        <tr key={item.id}>
                          <td>{item.id}</td>
                          <td>{item.title}</td>
                          <td>{item.user_name}</td>
                          <td>{item.category}</td>
                          <td>
                            <span className={`badge priority-${buildClass(item.priority)}`}>{item.priority}</span>
                          </td>
                          <td>
                            <span className={`badge status-${buildClass(item.status)}`}>{item.status}</span>
                          </td>
                          <td>
                            {getStaffStatusOptions(item.status).length > 0 ? (
                              <form
                                className="inline-form"
                                onSubmit={async (event) => {
                                  event.preventDefault();
                                  const status = String(new FormData(event.currentTarget).get("status")) as ComplaintStatus;
                                  setLoading(true);
                                  try {
                                    await updateStatus(item.id, status);
                                    notify("Resolve request sent");
                                    await loadStaffComplaints();
                                  } catch (error) {
                                    notify((error as Error).message, "error");
                                  } finally {
                                    setLoading(false);
                                  }
                                }}
                              >
                                <select name="status" defaultValue="Resolve Requested">
                                  {getStaffStatusOptions(item.status).map((statusOption) => (
                                    <option key={statusOption}>{statusOption}</option>
                                  ))}
                                </select>
                                <button className="btn" type="submit">
                                  Send Request
                                </button>
                              </form>
                            ) : (
                              <span>-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {assignedComplaints.length === 0 && <p>No records found.</p>}
                </div>
              </section>
            )}
          </section>
        )}
      </main>

      {toast && <div className={`toast ${toast.kind === "error" ? "toast-error" : ""}`}>{toast.message}</div>}
    </>
  );
}

export default App;
