
"use strict";

// FINOVA — Banking Dashboard Demo

const STARTING_BALANCE = 50000;

const sampleTransactions = [
  { id: 1, name: "Monthly Salary", type: "income", category: "Salary", amount: 35000, date: "2026-10-01" },
  { id: 2, name: "Shopping", type: "expense", category: "Shopping", amount: 2500, date: "2026-10-03" },
  { id: 3, name: "Freelance Payment", type: "income", category: "Other", amount: 8000, date: "2026-10-05" },
  { id: 4, name: "Electricity Bill", type: "expense", category: "Bills", amount: 1200, date: "2026-10-08" },
  { id: 5, name: "Restaurant", type: "expense", category: "Food", amount: 800, date: "2026-10-10" }
];

function loadTransactions() {
  try {
    const saved = JSON.parse(localStorage.getItem("finovaTransactions"));
    if (Array.isArray(saved)) return saved;
  } catch (error) {
    console.warn("Could not load saved transactions.", error);
  }
  return [...sampleTransactions];
}

let transactions = loadTransactions();
let charts = {};
let toastTimer;

// DOM helpers
const $ = id => document.getElementById(id);

function money(value) {
  return Number(value).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  });
}

function saveTransactions() {
  localStorage.setItem("finovaTransactions", JSON.stringify(transactions));
}

function getTotals() {
  let income = 0;
  let expense = 0;

  transactions.forEach(item => {
    if (item.type === "income") income += Number(item.amount);
    if (item.type === "expense") expense += Number(item.amount);
  });

  return {
    income,
    expense,
    balance: STARTING_BALANCE + income - expense,
    savings: income - expense
  };
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function formatDate(dateString) {
  const date = new Date(dateString + "T00:00:00");
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function makeCell(text, className) {
  const td = document.createElement("td");
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

function makeTransactionRow(item, showDelete = false) {
  const row = document.createElement("tr");

  const description = document.createElement("td");
  const name = document.createElement("span");
  name.className = "transaction-name";
  name.textContent = item.name;

  const sub = document.createElement("small");
  sub.className = "transaction-sub";
  sub.textContent = item.category || "General";

  description.append(name, sub);

  const amountPrefix = item.type === "income" ? "+" : "−";
  const amountClass = item.type === "income" ? "amount-in" : "amount-out";

  row.append(
    description,
    makeCell(formatDate(item.date)),
    makeCell(item.category || "General"),
    makeCell(amountPrefix + money(item.amount), amountClass),
    makeStatusCell()
  );

  if (showDelete) {
    const actionCell = document.createElement("td");
    const button = document.createElement("button");
    button.className = "delete-button";
    button.textContent = "Delete";
    button.addEventListener("click", () => deleteTransaction(item.id));
    actionCell.appendChild(button);
    row.appendChild(actionCell);
  }

  return row;
}

function makeStatusCell() {
  const td = document.createElement("td");
  const status = document.createElement("span");
  status.className = "status-pill";
  status.textContent = "Completed";
  td.appendChild(status);
  return td;
}

// Dashboard totals
function updateTotals() {
  const totals = getTotals();

  $("balance").textContent = money(totals.balance);
  $("income").textContent = money(totals.income);
  $("expense").textContent = money(totals.expense);
  $("transactionCount").textContent = transactions.length;
  $("savings").textContent = money(totals.savings);

  $("transferBalance").textContent = money(totals.balance);

  $("analyticsIncome").textContent = money(totals.income);
  $("analyticsExpense").textContent = money(totals.expense);
  $("analyticsSavings").textContent = money(totals.savings);
}

// Recent transactions
function renderRecentTransactions() {
  const list = $("recentList");
  list.replaceChildren();

  const recent = [...transactions]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);

  if (!recent.length) {
    const row = document.createElement("tr");
    row.appendChild(makeCell("No transactions yet."));
    list.appendChild(row);
    return;
  }

  recent.forEach(item => list.appendChild(makeTransactionRow(item)));
}

// Full transaction table
function renderTransactions() {
  const list = $("transactionList");
  const search = $("searchInput").value.trim().toLowerCase();
  const type = $("typeFilter").value;

  list.replaceChildren();

  const filtered = [...transactions]
    .sort((a, b) => b.id - a.id)
    .filter(item => {
      const matchesSearch =
        item.name.toLowerCase().includes(search) ||
        (item.category || "").toLowerCase().includes(search);

      const matchesType = type === "all" || item.type === type;
      return matchesSearch && matchesType;
    });

  $("emptyTransactions").hidden = filtered.length !== 0;

  filtered.forEach(item => {
    list.appendChild(makeTransactionRow(item, true));
  });
}

// Add income or expense
$("transactionForm").addEventListener("submit", event => {
  event.preventDefault();

  const name = $("transactionName").value.trim();
  const amount = Number($("transactionAmount").value);
  const type = $("transactionType").value;
  const category = $("transactionCategory").value;

  if (!name || !Number.isFinite(amount) || amount <= 0) {
    showToast("Please enter a valid name and amount.");
    return;
  }

  if (type === "expense" && amount > getTotals().balance) {
    showToast("Insufficient balance!");
    return;
  }

  transactions.push({
    id: Date.now(),
    name,
    amount,
    type,
    category,
    date: new Date().toISOString().slice(0, 10)
  });

  saveTransactions();
  refreshDashboard();
  event.target.reset();
  showToast("Transaction added successfully!");
});

// Delete a transaction
function deleteTransaction(id) {
  transactions = transactions.filter(item => item.id !== id);
  saveTransactions();
  refreshDashboard();
  showToast("Transaction deleted.");
}

// Demo money transfer
$("transferForm").addEventListener("submit", event => {
  event.preventDefault();

  const recipient = $("recipient").value.trim();
  const account = $("accountNumber").value.trim();
  const amount = Number($("transferAmount").value);
  const message = $("transferMessage").value.trim();

  if (!recipient) {
    showToast("Enter the recipient name.");
    return;
  }

  if (!/^\d{8,18}$/.test(account)) {
    showToast("Account number must contain 8–18 digits.");
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    showToast("Enter a valid transfer amount.");
    return;
  }

  if (amount > getTotals().balance) {
    showToast("Insufficient balance!");
    return;
  }

  transactions.push({
    id: Date.now(),
    name: "Transfer to " + recipient,
    amount,
    type: "expense",
    category: message || "Transfer",
    date: new Date().toISOString().slice(0, 10)
  });

  saveTransactions();
  refreshDashboard();
  event.target.reset();
  showToast("Demo transfer recorded successfully!");
});

// CSV export
function downloadCSV() {
  if (!transactions.length) {
    showToast("There are no transactions to export.");
    return;
  }

  const rows = [
    ["Description", "Type", "Category", "Amount", "Date"],
    ...transactions.map(item => [
      item.name,
      item.type,
      item.category || "General",
      item.amount,
      item.date
    ])
  ];

  const csv = rows.map(row =>
    row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(",")
  ).join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "FINOVA_Transactions.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
  showToast("CSV statement downloaded!");
}

$("downloadButton").addEventListener("click", downloadCSV);
$("heroExport").addEventListener("click", downloadCSV);
$("settingsExportButton").addEventListener("click", downloadCSV);

$("searchInput").addEventListener("input", renderTransactions);
$("typeFilter").addEventListener("change", renderTransactions);

// Navigation
function openPage(pageName) {
  const validPages = [
    "dashboard", "transactions", "transfers",
    "cards", "analytics", "settings"
  ];

  if (!validPages.includes(pageName)) return;

  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
  });

  $("page-" + pageName).classList.add("active");

  document.querySelectorAll(".nav-link").forEach(button => {
    button.classList.toggle("active", button.dataset.page === pageName);
  });

  const names = {
    dashboard: "Overview",
    transactions: "Transactions",
    transfers: "Transfers",
    cards: "My Cards",
    analytics: "Analytics",
    settings: "Settings"
  };

  $("pageName").textContent = names[pageName];
  $("sidebar").classList.remove("open");

  if (pageName === "analytics") {
    updateCharts();
  }
}

document.querySelectorAll(".nav-link").forEach(button => {
  button.addEventListener("click", () => openPage(button.dataset.page));
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => openPage(button.dataset.go));
});

// Mobile sidebar
$("mobileMenu").addEventListener("click", () => {
  $("sidebar").classList.toggle("open");
});

// Theme
function toggleTheme() {
  document.body.classList.toggle("dark");

  const theme = document.body.classList.contains("dark") ? "dark" : "light";
  localStorage.setItem("finovaTheme", theme);

  $("themeButton").textContent = theme === "dark" ? "☀" : "☾";
  updateCharts();
}

function loadTheme() {
  const savedTheme = localStorage.getItem("finovaTheme");

  if (savedTheme === "dark") {
    document.body.classList.add("dark");
  }

  $("themeButton").textContent =
    document.body.classList.contains("dark") ? "☀" : "☾";
}

$("themeButton").addEventListener("click", toggleTheme);
$("settingsThemeButton").addEventListener("click", toggleTheme);

// Charts
function destroyCharts() {
  Object.values(charts).forEach(chart => {
    if (chart) chart.destroy();
  });
  charts = {};
}

function chartColors() {
  const dark = document.body.classList.contains("dark");
  return {
    text: dark ? "#b4b6c9" : "#9294a8",
    grid: dark ? "#34374c" : "#eeeeF4"
  };
}

function updateCharts() {
  if (typeof Chart === "undefined") {
    document.querySelectorAll(".chart-wrap").forEach(wrap => {
      wrap.textContent = "Charts need an internet connection to load.";
    });
    return;
  }

  destroyCharts();

  const totals = getTotals();
  const colors = chartColors();

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: colors.text,
          usePointStyle: true,
          boxWidth: 8,
          font: { size: 10 }
        }
      }
    }
  };

  const cashCanvas = $("cashFlowChart");
  if (cashCanvas) {
    charts.cash = new Chart(cashCanvas, {
      type: "bar",
      data: {
        labels: ["Income", "Expenses"],
        datasets: [{
          data: [totals.income, totals.expense],
          backgroundColor: ["#6c59e8", "#ef8490"],
          borderRadius: 7,
          barThickness: 38
        }]
      },
      options: {
        ...commonOptions,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: { color: colors.text },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: colors.text,
              callback: value => "₹" + Number(value).toLocaleString("en-IN")
            },
            grid: { color: colors.grid }
          }
        }
      }
    });
  }

  const comparisonCanvas = $("comparisonChart");
  if (comparisonCanvas) {
    charts.comparison = new Chart(comparisonCanvas, {
      type: "doughnut",
      data: {
        labels: ["Income", "Expenses"],
        datasets: [{
          data: [totals.income, totals.expense],
          backgroundColor: ["#6c59e8", "#ef8490"],
          borderWidth: 0,
          hoverOffset: 7
        }]
      },
      options: {
        ...commonOptions,
        cutout: "68%"
      }
    });
  }

  const categoryCanvas = $("categoryChart");
  if (categoryCanvas) {
    const categoryTotals = {};

    transactions
      .filter(item => item.type === "expense")
      .forEach(item => {
        const category = item.category || "General";
        categoryTotals[category] = (categoryTotals[category] || 0) + Number(item.amount);
      });

    const labels = Object.keys(categoryTotals);
    const values = Object.values(categoryTotals);

    charts.category = new Chart(categoryCanvas, {
      type: "doughnut",
      data: {
        labels: labels.length ? labels : ["No expenses"],
        datasets: [{
          data: labels.length ? values : [1],
          backgroundColor: ["#6c59e8", "#ef8490", "#46b99a", "#e8b65c", "#5b9ddd", "#9a82d9"],
          borderWidth: 0,
          hoverOffset: 7
        }]
      },
      options: {
        ...commonOptions,
        cutout: "65%"
      }
    });
  }
}

// Reset demo data
$("resetButton").addEventListener("click", () => {
  const confirmed = window.confirm("Reset all transactions to the original demo data?");

  if (!confirmed) return;

  transactions = [...sampleTransactions];
  saveTransactions();
  refreshDashboard();
  showToast("Demo data restored.");
});

// Small interface actions
$("notificationButton").addEventListener("click", () => {
  showToast("You are all caught up!");
});

$("helpButton").addEventListener("click", () => {
  showToast("This is a student demo. No support service is connected.");
});

// Date in header
function setDate() {
  $("todayDate").textContent = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

// Refresh all dashboard information
function refreshDashboard() {
  updateTotals();
  renderRecentTransactions();
  renderTransactions();
  updateCharts();
}

// Start application
loadTheme();
setDate();
refreshDashboard();
