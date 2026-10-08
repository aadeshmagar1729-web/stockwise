let products = JSON.parse(localStorage.getItem("sw_products")) || [
  { id: 1, name: "Basmati Rice 5kg", sku: "GRO-001", category: "Grocery", quantity: 40, reorder: 10, cost: 380, price: 450 },
  { id: 2, name: "Notebook A4", sku: "STA-001", category: "Stationery", quantity: 6, reorder: 10, cost: 25, price: 40 },
  { id: 3, name: "USB Cable", sku: "ELE-001", category: "Electronics", quantity: 0, reorder: 5, cost: 80, price: 150 },
  { id: 4, name: "Cotton T-Shirt", sku: "CLO-001", category: "Clothing", quantity: 25, reorder: 8, cost: 200, price: 350 }
];
let transactions = JSON.parse(localStorage.getItem("sw_transactions")) || [];

function saveData() {
  localStorage.setItem("sw_products", JSON.stringify(products));
  localStorage.setItem("sw_transactions", JSON.stringify(transactions));
}

function $(id) {
  return document.getElementById(id);
}

function money(n) {
  return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}


function safe(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}


function getStatus(p) {
  if (p.quantity === 0) return "out";
  if (p.quantity <= p.reorder) return "low";
  return "healthy";
}

function statusBadge(p) {
  const labels = { healthy: "In stock", low: "Low stock", out: "Out of stock" };
  const s = getStatus(p);
  return `<span class="status ${s}">${labels[s]}</span>`;
}

let toastTimer;
function showToast(message) {
  const t = $("toast");
  t.textContent = message;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2500);
}


const titles = { overview: "Overview", inventory: "Inventory", transactions: "Transactions", reports: "Reports" };

function showView(name) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  $(name + "View").classList.add("active");

  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === name);
  });

  $("pageCrumb").textContent = titles[name];
  $("sidebar").classList.remove("open"); 
}

document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => showView(btn.dataset.view));
});


function renderStats() {
  let value = 0, units = 0, low = 0;
  products.forEach(p => {
    value += p.quantity * p.cost;
    units += p.quantity;
    if (getStatus(p) !== "healthy") low++;
  });
  $("totalProducts").textContent = products.length;
  $("navProductCount").textContent = products.length;
  $("inventoryValue").textContent = money(value);
  $("lowStockCount").textContent = low;
  $("totalUnits").textContent = units;
}

function renderChart() {
  
  const totals = {};
  products.forEach(p => {
    totals[p.category] = (totals[p.category] || 0) + p.quantity;
  });
  const names = Object.keys(totals);

  if (names.length === 0) {
    $("categoryChart").innerHTML = '<div class="empty-state">Add products to see your stock breakdown.</div>';
    $("chartLegend").innerHTML = "";
    return;
  }

  const biggest = Math.max(...Object.values(totals), 1);
  $("categoryChart").innerHTML = names.map(name => {
    const width = (totals[name] / biggest) * 100;
    return `<div class="bar-row">
      <span class="bar-label">${safe(name)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
      <span class="bar-value">${totals[name]}</span>
    </div>`;
  }).join("");
  $("chartLegend").innerHTML = "Bars show units in stock per category";
}

function renderLowStock() {
  const list = products.filter(p => getStatus(p) !== "healthy");
  if (list.length === 0) {
    $("lowStockList").innerHTML = '<div class="empty-state">All good! Nothing is running low.</div>';
    return;
  }
  $("lowStockList").innerHTML = list.map(p => `
    <div class="low-item">
      <div><strong>${safe(p.name)}</strong><br><small>Reorder level: ${p.reorder}</small></div>
      <div>${p.quantity} left ${statusBadge(p)}</div>
    </div>`).join("");
}

function renderRecent() {
  
  const recent = products.slice(-5).reverse();
  if (recent.length === 0) {
    $("recentTableBody").innerHTML = '<tr><td colspan="6" class="empty-state">No products yet.</td></tr>';
    return;
  }
  $("recentTableBody").innerHTML = recent.map(p => `
    <tr>
      <td><strong>${safe(p.name)}</strong></td>
      <td>${safe(p.category)}</td>
      <td>${p.quantity}</td>
      <td>${money(p.cost)}</td>
      <td>${statusBadge(p)}</td>
      <td><button class="secondary-button" data-action="edit" data-id="${p.id}">Edit</button></td>
    </tr>`).join("");
}


function renderCategoryFilter() {
  const current = $("categoryFilter").value;
  const cats = [...new Set(products.map(p => p.category))]; 
  $("categoryFilter").innerHTML = '<option value="all">All categories</option>' +
    cats.map(c => `<option value="${safe(c)}">${safe(c)}</option>`).join("");
  $("categoryFilter").value = cats.includes(current) ? current : "all";
}

function getFilteredProducts() {
  const text = $("searchInput").value.trim().toLowerCase();
  const cat = $("categoryFilter").value;
  const status = $("statusFilter").value;

  return products.filter(p => {
    const matchText = p.name.toLowerCase().includes(text) || p.sku.toLowerCase().includes(text);
    const matchCat = cat === "all" || p.category === cat;
    const matchStatus = status === "all" || getStatus(p) === status;
    return matchText && matchCat && matchStatus;
  });
}

function renderInventory() {
  const list = getFilteredProducts();
  $("resultCount").textContent = list.length + (list.length === 1 ? " product" : " products");

  if (list.length === 0) {
    $("inventoryTableBody").innerHTML = '<tr><td colspan="7" class="empty-state">No products found.</td></tr>';
    return;
  }
  $("inventoryTableBody").innerHTML = list.map(p => `
    <tr>
      <td><strong>${safe(p.name)}</strong></td>
      <td>${safe(p.sku) || "-"}</td>
      <td>${safe(p.category)}</td>
      <td>${p.quantity}</td>
      <td>${money(p.cost)}</td>
      <td>${statusBadge(p)}</td>
      <td>
        <button class="secondary-button" data-action="edit" data-id="${p.id}">Edit</button>
        <button class="secondary-button" data-action="delete" data-id="${p.id}">Delete</button>
      </td>
    </tr>`).join("");
}

["input", "change"].forEach(evt => {
  $("searchInput").addEventListener(evt, renderInventory);
  $("categoryFilter").addEventListener(evt, renderInventory);
  $("statusFilter").addEventListener(evt, renderInventory);
});


document.addEventListener("click", e => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (btn.dataset.action === "edit") openProductModal(id);
  if (btn.dataset.action === "delete") deleteProduct(id);
});

function deleteProduct(id) {
  const p = products.find(item => item.id === id);
  if (!p) return;
  if (confirm(`Delete "${p.name}"?`)) {
    products = products.filter(item => item.id !== id);
    saveData();
    renderAll();
    showToast("Product deleted");
  }
}


function openModal(id) { $(id).classList.add("open"); }
function closeModal(id) { $(id).classList.remove("open"); }

document.querySelectorAll("[data-close]").forEach(btn => {
  btn.addEventListener("click", () => closeModal(btn.dataset.close));
});

document.querySelectorAll(".modal-backdrop").forEach(back => {
  back.addEventListener("click", e => { if (e.target === back) back.classList.remove("open"); });
});

function openProductModal(id) {
  $("productForm").reset();
  $("productError").textContent = "";
  $("productId").value = "";
  $("productModalTitle").textContent = "Add a product";

  if (id) { 
    const p = products.find(item => item.id === id);
    $("productModalTitle").textContent = "Edit product";
    $("productId").value = p.id;
    $("productName").value = p.name;
    $("productSku").value = p.sku;
    $("productCategory").value = p.category;
    $("productQuantity").value = p.quantity;
    $("productReorder").value = p.reorder;
    $("productCost").value = p.cost;
    $("productPrice").value = p.price;
  }
  openModal("productModal");
}

$("quickAddBtn").addEventListener("click", () => openProductModal());
$("inventoryAddBtn").addEventListener("click", () => openProductModal());

$("productForm").addEventListener("submit", e => {
  e.preventDefault(); 

  const data = {
    name: $("productName").value.trim(),
    sku: $("productSku").value.trim(),
    category: $("productCategory").value,
    quantity: Number($("productQuantity").value),
    reorder: Number($("productReorder").value),
    cost: Number($("productCost").value),
    price: Number($("productPrice").value)
  };

  if (data.name === "") {
    $("productError").textContent = "Please enter a product name.";
    return;
  }
  if (data.quantity < 0 || data.reorder < 0 || data.cost < 0 || data.price < 0) {
    $("productError").textContent = "Numbers cannot be negative.";
    return;
  }

  const id = Number($("productId").value);
  if (id) {
    const p = products.find(item => item.id === id);
    Object.assign(p, data); 
    showToast("Product updated");
  } else {
    products.push({ id: Date.now(), ...data });
    showToast("Product added");
  }

  saveData();
  renderAll();
  closeModal("productModal");
});


function renderTransactions() {
  if (transactions.length === 0) {
    $("transactionsTableBody").innerHTML = '<tr><td colspan="5" class="empty-state">No transactions yet.</td></tr>';
    return;
  }
  $("transactionsTableBody").innerHTML = transactions.slice().reverse().map(t => `
    <tr>
      <td>${safe(t.date)}</td>
      <td>${safe(t.productName)}</td>
      <td><span class="status ${t.type === "sale" ? "low" : "healthy"}">${t.type === "sale" ? "Sale" : "Restock"}</span></td>
      <td>${t.type === "sale" ? "-" : "+"}${t.quantity}</td>
      <td>${safe(t.note) || "-"}</td>
    </tr>`).join("");
}

$("newTransactionBtn").addEventListener("click", () => {
  if (products.length === 0) {
    showToast("Add a product first");
    return;
  }
  $("transactionForm").reset();
  $("transactionError").textContent = "";
  $("transactionProduct").innerHTML = products.map(p =>
    `<option value="${p.id}">${safe(p.name)} (${p.quantity} in stock)</option>`).join("");
  openModal("transactionModal");
});

$("transactionForm").addEventListener("submit", e => {
  e.preventDefault();

  const product = products.find(p => p.id === Number($("transactionProduct").value));
  const type = $("transactionType").value;
  const qty = Number($("transactionQuantity").value);

  if (qty < 1) {
    $("transactionError").textContent = "Quantity must be at least 1.";
    return;
  }
  if (type === "sale" && qty > product.quantity) {
    $("transactionError").textContent = `Only ${product.quantity} in stock.`;
    return;
  }

  product.quantity += type === "sale" ? -qty : qty;

  transactions.push({
    date: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
    productName: product.name,
    type: type,
    quantity: qty,
    note: $("transactionNote").value.trim()
  });

  saveData();
  renderAll();
  closeModal("transactionModal");
  showToast("Transaction saved");
});


function renderReports() {
  let retail = 0, cost = 0;
  products.forEach(p => {
    retail += p.quantity * p.price;
    cost += p.quantity * p.cost;
  });
  $("reportProducts").textContent = products.length;
  $("retailValue").textContent = money(retail);
  $("potentialMargin").textContent = money(retail - cost);

  
  const groups = {};
  products.forEach(p => {
    if (!groups[p.category]) groups[p.category] = { count: 0, units: 0, value: 0 };
    groups[p.category].count++;
    groups[p.category].units += p.quantity;
    groups[p.category].value += p.quantity * p.cost;
  });
  const names = Object.keys(groups);
  $("categoryReportBody").innerHTML = names.length === 0
    ? '<tr><td colspan="4" class="empty-state">No data yet.</td></tr>'
    : names.map(n => `<tr><td>${safe(n)}</td><td>${groups[n].count}</td><td>${groups[n].units}</td><td>${money(groups[n].value)}</td></tr>`).join("");

  
  const count = { healthy: 0, low: 0, out: 0 };
  products.forEach(p => count[getStatus(p)]++);
  $("healthReport").innerHTML = `
    <div class="low-item"><span>Healthy</span><span class="status healthy">${count.healthy}</span></div>
    <div class="low-item"><span>Low stock</span><span class="status low">${count.low}</span></div>
    <div class="low-item"><span>Out of stock</span><span class="status out">${count.out}</span></div>`;
}


function exportCSV() {
  if (products.length === 0) {
    showToast("Nothing to export");
    return;
  }
  const rows = [["Name", "SKU", "Category", "Quantity", "Reorder level", "Unit cost", "Selling price"]];
  products.forEach(p => rows.push([p.name, p.sku, p.category, p.quantity, p.reorder, p.cost, p.price]));

  
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");

  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = "inventory.csv";
  link.click();
  showToast("CSV downloaded");
}
$("exportBtn").addEventListener("click", exportCSV);
$("reportExportBtn").addEventListener("click", exportCSV);


$("seeAllLow").addEventListener("click", () => {
  $("statusFilter").value = "low";
  renderInventory();
  showView("inventory");
});
$("viewInventoryBtn").addEventListener("click", () => {
  $("statusFilter").value = "all";
  renderInventory();
  showView("inventory");
});
$("notificationBtn").addEventListener("click", () => {
  const n = products.filter(p => getStatus(p) !== "healthy").length;
  showToast(n === 0 ? "No low stock alerts" : `${n} item(s) need restocking`);
});
$("helpBtn").addEventListener("click", () => {
  showToast("Add products, record sales/restocks, and watch the alerts.");
});
$("mobileMenu").addEventListener("click", () => {
  $("sidebar").classList.toggle("open");
});


function renderAll() {
  renderStats();
  renderChart();
  renderLowStock();
  renderRecent();
  renderCategoryFilter();
  renderInventory();
  renderTransactions();
  renderReports();
}

$("todayLabel").textContent = new Date().toLocaleDateString("en-IN", {
  weekday: "short", day: "numeric", month: "short", year: "numeric"
});
renderAll();

let users = JSON.parse(localStorage.getItem("sw_users")) || [];
let signUpMode = false;


async function hashText(text) {
  const bytes = new TextEncoder().encode(text);
  const buffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function setMode(signUp) {
  signUpMode = signUp;
  $("loginTitle").textContent = signUp ? "Create your account" : "Welcome back";
  $("loginSubtitle").textContent = signUp ? "Choose a username and password." : "Sign in to manage your stock.";
  $("loginSubmit").textContent = signUp ? "Create account" : "Sign in";
  $("loginToggle").textContent = signUp ? "Already have an account? Sign in" : "New here? Create an account";
  $("confirmField").hidden = !signUp;
  $("loginConfirm").required = signUp;
  $("loginError").textContent = "";
}

function showUser(username) {
  const words = username.split(/[\s._-]+/).filter(Boolean);
  const parts = words.length ? words : [username];

  const fullName = parts.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  const initials = (parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2)).toUpperCase();

  $("welcomeName").textContent = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  $("sidebarName").textContent = fullName;
  $("sidebarAvatar").textContent = initials;
  $("topAvatar").textContent = initials;

  const hour = new Date().getHours();
  $("greeting").textContent = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function showApp() {
  $("loginScreen").classList.add("hidden");
}
function showLogin() {
  $("loginForm").reset();
  setMode(users.length === 0);   
  $("loginScreen").classList.remove("hidden");
}
function startSession(username) {
  sessionStorage.setItem("sw_user", username);
  showUser(username);
  $("loginForm").reset();
  showApp();
}

$("loginToggle").addEventListener("click", () => setMode(!signUpMode));

$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();

  const username = $("loginUser").value.trim().toLowerCase();
  const password = $("loginPass").value;
  
  const hash = await hashText(username + ":" + password);

  if (signUpMode) {
    if (password.length < 6) {
      $("loginError").textContent = "Password must be at least 6 characters.";
      return;
    }
    if (password !== $("loginConfirm").value) {
      $("loginError").textContent = "Passwords do not match.";
      return;
    }
    if (users.some(u => u.username === username)) {
      $("loginError").textContent = "That username is already taken.";
      return;
    }
    users.push({ username: username, hash: hash });
    localStorage.setItem("sw_users", JSON.stringify(users));
    startSession(username);
  } else {
    const found = users.find(u => u.username === username && u.hash === hash);
    if (!found) {
      $("loginError").textContent = "Wrong username or password.";
      return;
    }
    startSession(username);
  }
});

$("logoutBtn").addEventListener("click", () => {
  sessionStorage.removeItem("sw_user");
  showLogin();
});


setMode(users.length === 0);
const savedUser = sessionStorage.getItem("sw_user");
if (savedUser) {
  showUser(savedUser);
  showApp();
}

