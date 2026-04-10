
const currentUser = JSON.parse(localStorage.getItem("currentUser"));
if (!currentUser) {
    window.location.href = "login.html";
}

// ============== STATE ==============
const USER_KEY = `expenses_${currentUser.username}`;
const BUDGET_KEY = `budgets_${currentUser.username}`;
const THEME_KEY = `theme_${currentUser.username}`;

let expenses = JSON.parse(localStorage.getItem(USER_KEY)) || [];
let budgets = JSON.parse(localStorage.getItem(BUDGET_KEY)) || {};

// Migrate old data: add 'type' field if missing
expenses = expenses.map(e => {
    if (!e.type) e.type = "expense";
    return e;
});
save();

const CATEGORIES = ["Food", "Transport", "Housing", "Healthcare", "Education", "Entertainment", "Shopping", "Utilities", "Salary", "Freelance", "Other"];
const CHART_COLORS = [
    "#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6",
    "#a855f7", "#ec4899", "#14b8a6", "#f97316", "#64748b", "#06b6d4"
];

// ============== INIT ==============
function init() {
    // Set user info
    document.getElementById("user-display-name").textContent = currentUser.fullname || currentUser.username;
    document.getElementById("user-avatar").textContent = (currentUser.fullname || currentUser.username).charAt(0).toUpperCase();

    // Set current date display
    const now = new Date();
    document.getElementById("current-date").textContent = now.toLocaleDateString("en-IN", {
        weekday: "short", year: "numeric", month: "short", day: "numeric"
    });

    // Set default date in form
    document.getElementById("date").valueAsDate = now;

    // Event listeners
    document.getElementById("expense-form").addEventListener("submit", addExpense);
    document.getElementById("filter-category").addEventListener("change", renderExpenseList);
    document.getElementById("filter-period").addEventListener("change", renderExpenseList);
    document.getElementById("filter-type").addEventListener("change", renderExpenseList);
    document.getElementById("sort-by").addEventListener("change", renderExpenseList);
    document.getElementById("clear-all").addEventListener("click", clearAll);

    // Expense list click delegation
    document.getElementById("expense-list").addEventListener("click", handleExpenseAction);

    // Initialize theme
    initTheme();

    // Render everything
    renderAll();
}

// ============== THEME ==============
function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === "light") {
        document.documentElement.classList.add("light-theme");
        document.getElementById("icon-moon").style.display = "none";
        document.getElementById("icon-sun").style.display = "block";
    }
}

function toggleTheme() {
    const isLight = document.documentElement.classList.toggle("light-theme");
    document.getElementById("icon-moon").style.display = isLight ? "none" : "block";
    document.getElementById("icon-sun").style.display = isLight ? "block" : "none";
    localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");
}

// ============== TRANSACTION TYPE TOGGLE ==============
function setTransactionType(type) {
    document.getElementById("transaction-type").value = type;
    document.getElementById("type-expense").classList.toggle("active", type === "expense");
    document.getElementById("type-income").classList.toggle("active", type === "income");
    document.getElementById("add-btn").textContent = type === "income" ? "+ Add Income" : "+ Add Expense";
}

// ============== SAVE ==============
function save() {
    localStorage.setItem(USER_KEY, JSON.stringify(expenses));
}

function saveBudgets() {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
}

// ============== FORMAT ==============
function formatCurrency(amount) {
    return "₹" + parseFloat(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ============== DATE HELPERS ==============
function getStartOfWeek() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.getFullYear(), now.getMonth(), diff);
}

function getStartOfMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getStartOfYear() {
    return new Date(new Date().getFullYear(), 0, 1);
}

function filterByPeriod(items, period) {
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    return items.filter(e => {
        const d = new Date(e.date);
        switch (period) {
            case "today": return e.date === today;
            case "week": return d >= getStartOfWeek();
            case "month": return d >= getStartOfMonth();
            case "year": return d >= getStartOfYear();
            default: return true;
        }
    });
}

function getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ============== RENDER ALL ==============
function renderAll() {
    updateSummary();
    renderRecentExpenses();
    renderExpenseList();
    renderPieChart();
    renderBudgetPage();
    updateAnalytics();
    generateSmartInsights();
}

// ============== SUMMARY ==============
function updateSummary() {
    const totalExpense = expenses.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);
    const totalIncome = expenses.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0);
    const balance = totalIncome - totalExpense;

    document.getElementById("total-all").textContent = formatCurrency(totalExpense);
    document.getElementById("total-income").textContent = formatCurrency(totalIncome);
    document.getElementById("total-balance").textContent = formatCurrency(balance);
    document.getElementById("total-count").textContent = expenses.length;

    // Color the balance based on positive/negative
    const balanceEl = document.getElementById("total-balance");
    balanceEl.style.color = balance >= 0 ? "var(--accent-green)" : "var(--accent-red)";
}

// ============== ADD EXPENSE ==============
function addExpense(e) {
    e.preventDefault();
    const desc = document.getElementById("description").value.trim();
    const amount = parseFloat(document.getElementById("amount").value);
    const category = document.getElementById("category").value;
    const date = document.getElementById("date").value;
    const type = document.getElementById("transaction-type").value;

    if (!desc || !amount || !category || !date) return;

    expenses.push({
        id: Date.now(),
        description: desc,
        amount,
        category,
        date,
        type
    });

    save();
    renderAll();
    e.target.reset();
    document.getElementById("date").valueAsDate = new Date();
    setTransactionType("expense"); // Reset to expense
}

// ============== RECENT EXPENSES ==============
function renderRecentExpenses() {
    const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
    const recent = sorted.slice(0, 5);
    const tbody = document.getElementById("recent-list");
    const emptyMsg = document.getElementById("recent-empty");
    const table = document.getElementById("recent-table");

    if (recent.length === 0) {
        emptyMsg.style.display = "block";
        table.style.display = "none";
        return;
    }

    emptyMsg.style.display = "none";
    table.style.display = "table";
    tbody.innerHTML = recent.map(e => `
        <tr>
            <td>${formatDate(e.date)}</td>
            <td>${escapeHtml(e.description)}</td>
            <td><span class="type-tag ${e.type}">${e.type}</span></td>
            <td><span class="cat-tag">${e.category}</span></td>
            <td class="amount-${e.type}">${e.type === "income" ? "+" : "-"}${formatCurrency(e.amount)}</td>
        </tr>
    `).join("");
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

// ============== EXPENSE LIST (Full Page) ==============
function renderExpenseList() {
    const catFilter = document.getElementById("filter-category").value;
    const periodFilter = document.getElementById("filter-period").value;
    const typeFilter = document.getElementById("filter-type").value;
    const sortBy = document.getElementById("sort-by").value;

    let filtered = expenses.filter(e => catFilter === "All" || e.category === catFilter);
    filtered = filtered.filter(e => typeFilter === "All" || e.type === typeFilter);
    filtered = filterByPeriod(filtered, periodFilter);

    // Sort
    switch (sortBy) {
        case "newest": filtered.sort((a, b) => new Date(b.date) - new Date(a.date)); break;
        case "oldest": filtered.sort((a, b) => new Date(a.date) - new Date(b.date)); break;
        case "highest": filtered.sort((a, b) => b.amount - a.amount); break;
        case "lowest": filtered.sort((a, b) => a.amount - b.amount); break;
    }

    const tbody = document.getElementById("expense-list");
    const emptyMsg = document.getElementById("empty-msg");
    const table = document.getElementById("expense-table");
    const summary = document.getElementById("filter-summary");

    const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0);
    summary.textContent = `Showing ${filtered.length} transaction(s) — Total: ${formatCurrency(totalFiltered)}`;

    if (filtered.length === 0) {
        emptyMsg.style.display = "block";
        table.style.display = "none";
    } else {
        emptyMsg.style.display = "none";
        table.style.display = "table";
        tbody.innerHTML = filtered.map(e => `
            <tr>
                <td>${formatDate(e.date)}</td>
                <td>${escapeHtml(e.description)}</td>
                <td><span class="type-tag ${e.type}">${e.type}</span></td>
                <td>${e.category}</td>
                <td class="amount-${e.type}">${e.type === "income" ? "+" : "-"}${formatCurrency(e.amount)}</td>
                <td>
                    <div class="action-btns">
                        <button class="edit-btn" data-id="${e.id}">Edit</button>
                        <button class="delete-btn" data-id="${e.id}">Delete</button>
                    </div>
                </td>
            </tr>
        `).join("");
    }
}

// ============== EXPENSE ACTIONS ==============
function handleExpenseAction(e) {
    const id = parseInt(e.target.dataset.id);
    if (!id) return;

    if (e.target.classList.contains("delete-btn")) {
        if (confirm("Delete this transaction?")) {
            expenses = expenses.filter(ex => ex.id !== id);
            save();
            renderAll();
        }
    }

    if (e.target.classList.contains("edit-btn")) {
        const exp = expenses.find(ex => ex.id === id);
        if (!exp) return;
        document.getElementById("edit-id").value = exp.id;
        document.getElementById("edit-type").value = exp.type || "expense";
        document.getElementById("edit-description").value = exp.description;
        document.getElementById("edit-amount").value = exp.amount;
        document.getElementById("edit-category").value = exp.category;
        document.getElementById("edit-date").value = exp.date;
        document.getElementById("edit-modal").classList.remove("hidden");
    }
}

function saveEdit(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById("edit-id").value);
    const idx = expenses.findIndex(ex => ex.id === id);
    if (idx === -1) return;

    expenses[idx] = {
        ...expenses[idx],
        type: document.getElementById("edit-type").value,
        description: document.getElementById("edit-description").value.trim(),
        amount: parseFloat(document.getElementById("edit-amount").value),
        category: document.getElementById("edit-category").value,
        date: document.getElementById("edit-date").value
    };

    save();
    closeModal();
    renderAll();
}

function closeModal() {
    document.getElementById("edit-modal").classList.add("hidden");
}

function clearAll() {
    if (expenses.length === 0) return;
    if (confirm("Delete ALL transactions? This cannot be undone.")) {
        expenses = [];
        save();
        renderAll();
    }
}

// ============== PIE CHART (Dashboard) ==============
let pieChart = null;

function renderPieChart() {
    const canvas = document.getElementById("pie-chart");
    const noData = document.getElementById("no-chart-data");

    // Only show expenses in pie chart
    const expenseItems = expenses.filter(e => e.type === "expense");
    const totals = {};
    expenseItems.forEach(e => { totals[e.category] = (totals[e.category] || 0) + e.amount; });

    const labels = Object.keys(totals);
    const data = Object.values(totals);

    if (labels.length === 0) {
        noData.style.display = "block";
        canvas.style.display = "none";
        if (pieChart) { pieChart.destroy(); pieChart = null; }
        return;
    }

    noData.style.display = "none";
    canvas.style.display = "block";

    if (pieChart) pieChart.destroy();

    pieChart = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: CHART_COLORS.slice(0, labels.length),
                borderColor: "transparent",
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || "#71717a",
                        padding: 12,
                        font: { size: 11, family: "Inter" }
                    }
                }
            },
            cutout: "60%"
        }
    });
}

// ============== BUDGET PAGE ==============
function renderBudgetPage() {
    const container = document.getElementById("budget-list");
    const monthKey = getCurrentMonthKey();

    container.innerHTML = CATEGORIES.map(cat => {
        const spent = expenses
            .filter(e => e.type === "expense" && e.category === cat && e.date.startsWith(monthKey))
            .reduce((s, e) => s + e.amount, 0);

        const limit = budgets[cat] || 0;
        const percent = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
        const barClass = percent >= 100 ? "danger" : percent >= 75 ? "warning" : "safe";
        const overBudget = limit > 0 && spent > limit;

        return `
            <div class="budget-item">
                <div class="budget-header">
                    <span class="budget-category">${cat}</span>
                </div>
                <div class="budget-input-row">
                    <span style="color:var(--text-muted); font-size:13px;">Limit: ₹</span>
                    <input type="number" id="budget-${cat}" value="${limit || ''}" placeholder="0" min="0" step="100">
                    <button class="btn-save" onclick="setBudget('${cat}')">Set</button>
                </div>
                ${limit > 0 ? `
                    <div class="budget-bar-container">
                        <div class="budget-bar ${barClass}" style="width:${percent}%"></div>
                    </div>
                    <div class="budget-info">
                        <span>${formatCurrency(spent)} / ${formatCurrency(limit)}</span>
                        ${overBudget ? '<span class="over-budget">⚠ Over budget!</span>' : `<span>${Math.round(percent)}% used</span>`}
                    </div>
                ` : `<div class="budget-info"><span style="font-style:italic;">No budget set</span></div>`}
            </div>
        `;
    }).join("");
}

function setBudget(category) {
    const input = document.getElementById(`budget-${category}`);
    const val = parseFloat(input.value);
    if (isNaN(val) || val < 0) {
        alert("Please enter a valid budget amount.");
        return;
    }
    budgets[category] = val;
    saveBudgets();
    renderBudgetPage();
}

// ============== ANALYTICS ==============
let analyticsPie = null;
let analyticsBar = null;

function updateAnalytics() {
    const period = document.getElementById("analytics-period").value;
    let filtered = filterByPeriod(expenses, period === "all" ? "all" : period);
    // Only expenses for analytics
    let expenseOnly = filtered.filter(e => e.type === "expense");

    renderAnalyticsPie(expenseOnly);
    renderAnalyticsBar();
    renderAnalyticsBreakdown(expenseOnly);
}

function renderAnalyticsPie(data) {
    const canvas = document.getElementById("analytics-pie");
    const totals = {};
    data.forEach(e => { totals[e.category] = (totals[e.category] || 0) + e.amount; });

    const labels = Object.keys(totals);
    const values = Object.values(totals);

    if (analyticsPie) analyticsPie.destroy();

    if (labels.length === 0) {
        analyticsPie = new Chart(canvas, {
            type: "doughnut",
            data: { labels: ["No Data"], datasets: [{ data: [1], backgroundColor: ["#2a2d3a"] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
        return;
    }

    analyticsPie = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels,
            datasets: [{ data: values, backgroundColor: CHART_COLORS.slice(0, labels.length), borderWidth: 0 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "right",
                    labels: { color: "#e4e4e7", padding: 10, font: { size: 11, family: "Inter" } }
                }
            },
            cutout: "55%"
        }
    });
}

function renderAnalyticsBar() {
    const canvas = document.getElementById("analytics-bar");
    if (analyticsBar) analyticsBar.destroy();

    // Get last 6 months
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
            label: d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
        });
    }

    const expenseData = months.map(m => {
        return expenses.filter(e => e.type === "expense" && e.date.startsWith(m.key)).reduce((s, e) => s + e.amount, 0);
    });

    const incomeData = months.map(m => {
        return expenses.filter(e => e.type === "income" && e.date.startsWith(m.key)).reduce((s, e) => s + e.amount, 0);
    });

    analyticsBar = new Chart(canvas, {
        type: "bar",
        data: {
            labels: months.map(m => m.label),
            datasets: [
                {
                    label: "Income",
                    data: incomeData,
                    backgroundColor: "rgba(34, 197, 94, 0.7)",
                    borderColor: "#22c55e",
                    borderWidth: 1,
                    borderRadius: 6
                },
                {
                    label: "Expenses",
                    data: expenseData,
                    backgroundColor: "rgba(99, 102, 241, 0.7)",
                    borderColor: "#6366f1",
                    borderWidth: 1,
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: { color: "#71717a", font: { size: 11, family: "Inter" } },
                    grid: { display: false }
                },
                y: {
                    ticks: {
                        color: "#71717a",
                        font: { size: 11, family: "Inter" },
                        callback: v => "₹" + v.toLocaleString("en-IN")
                    },
                    grid: { color: "#2a2d3a" }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    labels: { color: "#e4e4e7", font: { size: 11, family: "Inter" } }
                }
            }
        }
    });
}

function renderAnalyticsBreakdown(data) {
    const container = document.getElementById("analytics-breakdown");
    const totals = {};
    data.forEach(e => { totals[e.category] = (totals[e.category] || 0) + e.amount; });

    const grand = Object.values(totals).reduce((s, v) => s + v, 0);
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);

    if (sorted.length === 0) {
        container.innerHTML = '<p class="muted-text">No data for selected period.</p>';
        return;
    }

    container.innerHTML = sorted.map(([cat, amt], i) => {
        const pct = grand > 0 ? ((amt / grand) * 100).toFixed(1) : 0;
        return `
            <div class="breakdown-item">
                <div class="breakdown-color" style="background:${CHART_COLORS[i % CHART_COLORS.length]}"></div>
                <div class="breakdown-info">
                    <div class="breakdown-name">${cat}</div>
                    <div class="breakdown-amount">${formatCurrency(amt)}</div>
                </div>
                <div class="breakdown-percent">${pct}%</div>
            </div>
        `;
    }).join("");
}

// ============== SMART INSIGHTS ==============
function generateSmartInsights() {
    const container = document.getElementById("insights-container");
    const insights = [];
    const monthKey = getCurrentMonthKey();

    const monthExpenses = expenses.filter(e => e.type === "expense" && e.date.startsWith(monthKey));
    const monthIncome = expenses.filter(e => e.type === "income" && e.date.startsWith(monthKey));
    const totalMonthExpense = monthExpenses.reduce((s, e) => s + e.amount, 0);
    const totalMonthIncome = monthIncome.reduce((s, e) => s + e.amount, 0);

    // 1) Savings this month
    if (totalMonthIncome > 0 || totalMonthExpense > 0) {
        const savings = totalMonthIncome - totalMonthExpense;
        if (savings >= 0) {
            insights.push({ icon: "💰", text: `You've saved <strong>${formatCurrency(savings)}</strong> this month!` });
        } else {
            insights.push({ icon: "⚠️", text: `You're in the red by <strong>${formatCurrency(Math.abs(savings))}</strong> this month. Spending exceeds income.` });
        }
    }

    // 2) Highest spending category this month
    if (monthExpenses.length > 0) {
        const catTotals = {};
        monthExpenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });
        const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
        if (topCat) {
            insights.push({ icon: "📊", text: `Your highest spending category this month is <strong>${topCat[0]}</strong> at ${formatCurrency(topCat[1])}.` });
        }
    }

    // 3) Budget usage
    const budgetCats = Object.keys(budgets).filter(c => budgets[c] > 0);
    if (budgetCats.length > 0) {
        let totalBudget = 0;
        let totalSpent = 0;
        budgetCats.forEach(cat => {
            totalBudget += budgets[cat];
            totalSpent += monthExpenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
        });
        const usagePct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
        const emoji = usagePct >= 90 ? "🔴" : usagePct >= 60 ? "🟡" : "🟢";
        insights.push({ icon: emoji, text: `You've used <strong>${usagePct}%</strong> of your total set budgets this month.` });

        // Any over-budget categories?
        const overBudget = budgetCats.filter(cat => {
            const spent = monthExpenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
            return spent > budgets[cat];
        });
        if (overBudget.length > 0) {
            insights.push({ icon: "🚨", text: `<strong>${overBudget.join(", ")}</strong> ${overBudget.length === 1 ? "is" : "are"} over budget this month!` });
        }
    }

    // 4) Transaction count this month
    const monthAll = expenses.filter(e => e.date.startsWith(monthKey));
    if (monthAll.length > 0) {
        insights.push({ icon: "🧾", text: `You've logged <strong>${monthAll.length}</strong> transactions this month.` });
    }

    // 5) Compare with last month
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;
    const lastMonthTotal = expenses.filter(e => e.type === "expense" && e.date.startsWith(lastMonthKey)).reduce((s, e) => s + e.amount, 0);

    if (lastMonthTotal > 0 && totalMonthExpense > 0) {
        const diff = totalMonthExpense - lastMonthTotal;
        const pctChange = Math.round((Math.abs(diff) / lastMonthTotal) * 100);
        if (diff > 0) {
            insights.push({ icon: "📈", text: `Spending is up <strong>${pctChange}%</strong> compared to last month.` });
        } else if (diff < 0) {
            insights.push({ icon: "📉", text: `Spending is down <strong>${pctChange}%</strong> compared to last month. Nice!` });
        }
    }

    // Render
    if (insights.length === 0) {
        container.innerHTML = '<p class="muted-text">Add some transactions to see smart insights.</p>';
        return;
    }

    container.innerHTML = insights.map(i => `
        <div class="insight-card">
            <div class="insight-icon">${i.icon}</div>
            <div class="insight-text">${i.text}</div>
        </div>
    `).join("");
}

// ============== EXPORT CSV ==============
function exportToCSV() {
    if (expenses.length === 0) {
        alert("No transactions to export.");
        return;
    }

    const headers = ["Date", "Type", "Category", "Description", "Amount"];
    const rows = expenses.map(e => [
        e.date,
        e.type || "expense",
        e.category,
        `"${e.description.replace(/"/g, '""')}"`,
        e.amount.toFixed(2)
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ExpenseTracker_${currentUser.username}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}

// ============== PAGE NAVIGATION ==============
function showPage(page) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById(`page-${page}`).classList.add("active");

    document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
    document.querySelector(`.nav-link[data-page="${page}"]`).classList.add("active");

    const titles = { overview: "Dashboard", expenses: "Transactions", budget: "Budget", analytics: "Analytics" };
    document.getElementById("page-title").textContent = titles[page] || "Dashboard";

    // Re-render charts when analytics page is shown
    if (page === "analytics") updateAnalytics();
    if (page === "budget") renderBudgetPage();
}

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    sidebar.classList.toggle("open");
}

function logout() {
    localStorage.removeItem("currentUser");
    window.location.href = "login.html";
}

// ============== START ==============
init();
