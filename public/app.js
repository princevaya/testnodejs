const API_BASE = `${window.location.origin}/api`;

const authCard = document.getElementById("authCard");
const appPanel = document.getElementById("appPanel");
const userPanel = document.getElementById("userPanel");
const adminPanel = document.getElementById("adminPanel");
const staffPanel = document.getElementById("staffPanel");
const userWelcome = document.getElementById("userWelcome");
const userMeta = document.getElementById("userMeta");
const toast = document.getElementById("toast");

const state = {
  token: localStorage.getItem("token") || "",
  user: JSON.parse(localStorage.getItem("user") || "null"),
  staffList: []
};

const el = {
  loginForm: document.getElementById("loginForm"),
  registerForm: document.getElementById("registerForm"),
  showLogin: document.getElementById("showLogin"),
  showRegister: document.getElementById("showRegister"),
  registerRole: document.getElementById("registerRole"),
  departmentWrap: document.getElementById("departmentWrap"),
  logoutBtn: document.getElementById("logoutBtn"),
  complaintForm: document.getElementById("complaintForm"),
  myComplaints: document.getElementById("myComplaints"),
  filterForm: document.getElementById("filterForm"),
  allComplaints: document.getElementById("allComplaints"),
  staffComplaints: document.getElementById("staffComplaints"),
  dashboardStats: document.getElementById("dashboardStats"),
  dashboardMeta: document.getElementById("dashboardMeta")
};

const notify = (message, isError = false) => {
  toast.textContent = message;
  toast.style.background = isError ? "#7f1d1d" : "#111827";
  toast.classList.remove("hidden");
  window.clearTimeout(window.__toastTimer);
  window.__toastTimer = window.setTimeout(() => toast.classList.add("hidden"), 2800);
};

const classToken = (value) => (value || "").replace(/\s+/g, "\\ ");

const request = async (path, options = {}) => {
  const config = {
    method: options.method || "GET",
    headers: options.headers ? { ...options.headers } : {}
  };

  if (state.token) {
    config.headers.Authorization = `Bearer ${state.token}`;
  }

  if (options.body instanceof FormData) {
    config.body = options.body;
  } else if (options.body !== undefined) {
    config.headers["Content-Type"] = "application/json";
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE}${path}`, config);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "Request failed");
  }

  return payload;
};

const setAuthView = (isLogin) => {
  el.loginForm.classList.toggle("hidden", !isLogin);
  el.registerForm.classList.toggle("hidden", isLogin);
  el.showLogin.classList.toggle("chip-active", isLogin);
  el.showRegister.classList.toggle("chip-active", !isLogin);
};

const setSession = ({ token, user }) => {
  state.token = token;
  state.user = user;
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
};

const clearSession = () => {
  state.token = "";
  state.user = null;
  state.staffList = [];
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

const guardPanels = () => {
  if (!state.user || !state.token) {
    authCard.classList.remove("hidden");
    appPanel.classList.add("hidden");
    return;
  }

  authCard.classList.add("hidden");
  appPanel.classList.remove("hidden");

  userWelcome.textContent = `Hi, ${state.user.name}`;
  userMeta.textContent = `${state.user.role} | ${state.user.email}`;

  userPanel.classList.toggle("hidden", state.user.role !== "User");
  adminPanel.classList.toggle("hidden", state.user.role !== "Admin");
  staffPanel.classList.toggle("hidden", state.user.role !== "Staff");
};

const renderTable = (columns, rows) => {
  if (!rows.length) {
    return "<p>No records found.</p>";
  }

  const head = `<tr>${columns.map((c) => `<th>${c.label}</th>`).join("")}</tr>`;
  const body = rows
    .map(
      (row) =>
        `<tr>${columns
          .map((c) => `<td>${typeof c.render === "function" ? c.render(row) : row[c.key] ?? "-"}</td>`)
          .join("")}</tr>`
    )
    .join("");

  return `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
};

const loadMyComplaints = async () => {
  const res = await request("/complaints/my");
  const columns = [
    { label: "ID", key: "id" },
    { label: "Title", key: "title" },
    {
      label: "Category",
      render: (r) => `<span class="badge">${r.category}</span>`
    },
    {
      label: "Priority",
      render: (r) => `<span class="badge priority-${classToken(r.priority)}">${r.priority}</span>`
    },
    {
      label: "Status",
      render: (r) => `<span class="badge status-${classToken(r.status)}">${r.status}</span>`
    },
    {
      label: "Feedback",
      render: (r) => {
        if (r.status !== "Resolved") return "-";
        return `
          <form class="inline-form" data-feedback="${r.id}">
            <select name="rating" required>
              <option value="">Rate</option>
              <option>5</option><option>4</option><option>3</option><option>2</option><option>1</option>
            </select>
            <input name="comment" placeholder="Comment" />
            <button class="btn" type="submit">Send</button>
          </form>
        `;
      }
    }
  ];

  el.myComplaints.innerHTML = renderTable(columns, res.data || []);
};

const loadDashboard = async () => {
  const res = await request("/dashboard/summary");
  const data = res.data;
  const statusMap = Object.fromEntries((data.status_wise || []).map((s) => [s.status, Number(s.count)]));

  el.dashboardStats.innerHTML = [
    { label: "Total", value: data.total_complaints || 0 },
    { label: "Pending", value: statusMap.Pending || 0 },
    { label: "In Progress", value: statusMap["In Progress"] || 0 },
    { label: "Resolve Requested", value: statusMap["Resolve Requested"] || 0 },
    { label: "Resolved", value: statusMap.Resolved || 0 }
  ]
    .map((s) => `<div class="stat"><h4>${s.label}</h4><p>${s.value}</p></div>`)
    .join("");

  const catRows = (data.category_wise || [])
    .map((c) => `<li>${c.category}: <strong>${c.count}</strong></li>`)
    .join("");
  const staffRows = (data.staff_performance || [])
    .map(
      (s) =>
        `<li>${s.staff_name} | assigned: <strong>${s.total_assigned || 0}</strong> | resolved: <strong>${s.resolved_count || 0}</strong></li>`
    )
    .join("");

  el.dashboardMeta.innerHTML = `
    <div class="card"><h3>Category-wise Count</h3><ul>${catRows || "<li>No data</li>"}</ul></div>
    <div class="card"><h3>Staff Performance</h3><ul>${staffRows || "<li>No data</li>"}</ul></div>
  `;
};

const loadStaffList = async () => {
  const res = await request("/complaints/staff");
  state.staffList = res.data || [];
};

const staffSelect = (selected = "") => {
  const options = [`<option value="">Assign</option>`]
    .concat(
      state.staffList.map(
        (s) => `<option value="${s.id}" ${String(selected) === String(s.id) ? "selected" : ""}>${s.name}</option>`
      )
    )
    .join("");

  return `<select data-assign-select>${options}</select>`;
};

const getStatusOptions = (current, role) => {
  if (role === "Staff") {
    return current === "In Progress" ? ["Resolve Requested"] : [];
  }

  if (role === "Admin") {
    if (current === "Pending") return ["In Progress"];
    if (current === "In Progress") return ["Pending", "Resolve Requested"];
    if (current === "Resolve Requested") return ["In Progress", "Resolved"];
    if (current === "Resolved") return ["In Progress"];
  }

  return [];
};

const statusSelect = (current, role) => {
  const statuses = getStatusOptions(current, role);
  if (!statuses.length) return "-";

  return `<select data-status-select>${statuses
    .map((s) => `<option value="${s}" ${s === current ? "selected" : ""}>${s}</option>`)
    .join("")}</select>`;
};

const loadAllComplaints = async (filters = {}) => {
  const query = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
  const res = await request(`/complaints/all${query ? `?${query}` : ""}`);

  const columns = [
    { label: "ID", key: "id" },
    { label: "Title", key: "title" },
    { label: "User", key: "user_name" },
    { label: "Category", key: "category" },
    {
      label: "Priority",
      render: (r) => `<span class="badge priority-${classToken(r.priority)}">${r.priority}</span>`
    },
    {
      label: "Status",
      render: (r) => `<span class="badge status-${classToken(r.status)}">${r.status}</span>`
    },
    {
      label: "Assign",
      render: (r) => `<div data-assign-wrap="${r.id}">${staffSelect(r.assigned_staff_id || "")}</div>`
    },
    {
      label: "Update",
      render: (r) => {
        const select = statusSelect(r.status, "Admin");
        if (select === "-") return "-";
        return `<div data-status-wrap="${r.id}">${select} <button class="btn" data-save-status="${r.id}">Save</button></div>`;
      }
    }
  ];

  el.allComplaints.innerHTML = renderTable(columns, res.data || []);
};

const loadStaffComplaints = async () => {
  const res = await request("/complaints/assigned");
  const columns = [
    { label: "ID", key: "id" },
    { label: "Title", key: "title" },
    { label: "By", key: "user_name" },
    { label: "Category", key: "category" },
    {
      label: "Priority",
      render: (r) => `<span class="badge priority-${classToken(r.priority)}">${r.priority}</span>`
    },
    {
      label: "Status",
      render: (r) => `<span class="badge status-${classToken(r.status)}">${r.status}</span>`
    },
    {
      label: "Update",
      render: (r) => {
        const select = statusSelect(r.status, "Staff");
        if (select === "-") return "-";
        return `<div data-status-wrap="${r.id}">${select} <button class="btn" data-save-status="${r.id}">Send Request</button></div>`;
      }
    }
  ];

  el.staffComplaints.innerHTML = renderTable(columns, res.data || []);
};

const refreshRoleView = async () => {
  guardPanels();
  if (!state.user) return;

  if (state.user.role === "User") {
    await loadMyComplaints();
  }

  if (state.user.role === "Admin") {
    await Promise.all([loadStaffList(), loadDashboard()]);
    await loadAllComplaints();
  }

  if (state.user.role === "Staff") {
    await loadStaffComplaints();
  }
};

el.showLogin.addEventListener("click", () => setAuthView(true));
el.showRegister.addEventListener("click", () => setAuthView(false));

el.registerRole.addEventListener("change", (e) => {
  el.departmentWrap.classList.toggle("hidden", e.target.value !== "Staff");
});

el.loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);

  try {
    const res = await request("/auth/login", {
      method: "POST",
      body: {
        email: form.get("email"),
        password: form.get("password")
      }
    });

    setSession(res.data);
    notify("Login successful");
    await refreshRoleView();
  } catch (error) {
    notify(error.message, true);
  }
});

el.registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);

  try {
    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
      role: form.get("role")
    };

    if (payload.role === "Staff") {
      payload.department = form.get("department") || "General";
    }

    const res = await request("/auth/register", { method: "POST", body: payload });
    setSession(res.data);
    notify("Registration successful");
    await refreshRoleView();
  } catch (error) {
    notify(error.message, true);
  }
});

el.logoutBtn.addEventListener("click", () => {
  clearSession();
  guardPanels();
  setAuthView(true);
  notify("Logged out");
});

el.complaintForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);

  try {
    await request("/complaints/create", {
      method: "POST",
      body: form
    });

    notify("Complaint created");
    e.target.reset();
    await loadMyComplaints();
  } catch (error) {
    notify(error.message, true);
  }
});

el.myComplaints.addEventListener("submit", async (e) => {
  const form = e.target.closest("form[data-feedback]");
  if (!form) return;

  e.preventDefault();

  try {
    await request("/feedback/add", {
      method: "POST",
      body: {
        complaint_id: Number(form.dataset.feedback),
        rating: Number(new FormData(form).get("rating")),
        comment: new FormData(form).get("comment") || ""
      }
    });

    notify("Feedback submitted");
    await loadMyComplaints();
  } catch (error) {
    notify(error.message, true);
  }
});

el.filterForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  await loadAllComplaints({
    status: form.get("status"),
    category: form.get("category"),
    priority: form.get("priority")
  });
});

const handleAssign = async (root, complaintId) => {
  const select = root.querySelector("select[data-assign-select]");
  const staffId = Number(select.value);
  if (!staffId) return notify("Select staff first", true);

  await request("/complaints/assign", {
    method: "POST",
    body: { complaint_id: Number(complaintId), staff_id: staffId }
  });
  notify("Complaint assigned");
};

const handleStatusUpdate = async (root, complaintId) => {
  const select = root.querySelector("select[data-status-select]");
  await request("/complaints/update-status", {
    method: "PATCH",
    body: { complaint_id: Number(complaintId), status: select.value }
  });
  notify("Status updated");
};

el.allComplaints.addEventListener("click", async (e) => {
  const statusBtn = e.target.closest("button[data-save-status]");
  if (statusBtn) {
    try {
      const complaintId = statusBtn.dataset.saveStatus;
      const wrap = el.allComplaints.querySelector(`[data-status-wrap="${complaintId}"]`);
      await handleStatusUpdate(wrap, complaintId);
      await Promise.all([loadDashboard(), loadAllComplaints()]);
    } catch (error) {
      notify(error.message, true);
    }
  }
});

el.allComplaints.addEventListener("change", async (e) => {
  if (!e.target.matches("select[data-assign-select]")) return;

  const wrap = e.target.closest("[data-assign-wrap]");
  const complaintId = wrap.dataset.assignWrap;

  try {
    await handleAssign(wrap, complaintId);
    await loadAllComplaints();
  } catch (error) {
    notify(error.message, true);
  }
});

el.staffComplaints.addEventListener("click", async (e) => {
  const statusBtn = e.target.closest("button[data-save-status]");
  if (!statusBtn) return;

  try {
    const complaintId = statusBtn.dataset.saveStatus;
    const wrap = el.staffComplaints.querySelector(`[data-status-wrap="${complaintId}"]`);
    await handleStatusUpdate(wrap, complaintId);
    await loadStaffComplaints();
  } catch (error) {
    notify(error.message, true);
  }
});

(async () => {
  guardPanels();
  if (state.user && state.token) {
    try {
      await refreshRoleView();
    } catch (error) {
      clearSession();
      guardPanels();
      notify("Session expired. Please login again.", true);
    }
  }
})();
