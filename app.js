let expenses = JSON.parse(localStorage.getItem("expenses")) || [];

const form = document.getElementById("expense-form");
const list = document.getElementById("expense-list");
const emptyMsg = document.getElementById("empty-msg");
const filterCategory = document.getElementById("filter-category");

document.getElementById("date").valueAsDate = new Date();

function save() {
    localStorage.setItem("expenses", JSON.stringify(expenses));
}

function formatCurrency(amount) {
    return "₹" + parseFloat(amount).toFixed(2);
}

function getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function updateSummary(filtered) {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const monthKey = getCurrentMonthKey();
    const monthTotal = expenses
        .filter(e => e.date.startsWith(monthKey))
        .reduce((sum, e) => sum + e.amount, 0);

    document.getElementById("total-all").textContent = formatCurrency(total);
    document.getElementById("total-month").textContent = formatCurrency(monthTotal);
    document.getElementById("total-count").textContent = expenses.length;
}

function updateCategoryBreakdown() {
    const container = document.getElementById("category-breakdown");
    container.innerHTML = "";

    const totals = {};
    expenses.forEach(e => {
        totals[e.category] = (totals[e.category] || 0) + e.amount;
    });

    if (Object.keys(totals).length === 0) {
        container.textContent = "No data yet.";
        return;
    }

    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);

    sorted.forEach(([cat, amt]) => {
        const row = document.createElement("div");
        row.className = "cat-row";

        row.innerHTML = `
            <span class="cat-label">${cat}</span>
            <span class="cat-amount">${formatCurrency(amt)}</span>
        `;

        container.appendChild(row);
    });
}

function renderList() {
    const catFilter = filterCategory.value;

    let filtered = expenses.filter(e => {
        const catOk = catFilter === "All" || e.category === catFilter;
        return catOk;
    });

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    list.innerHTML = "";

    if (filtered.length === 0) {
        emptyMsg.style.display = "block";
        document.getElementById("expense-table").style.display = "none";
    } else {
        emptyMsg.style.display = "none";
        document.getElementById("expense-table").style.display = "table";

        filtered.forEach(e => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${e.date}</td>
                <td>${e.description}</td>
                <td>${e.category}</td>
                <td>${formatCurrency(e.amount)}</td>
                <td><button class="delete-btn" data-id="${e.id}">Delete</button></td>
            `;
            list.appendChild(tr);
        });
    }

    updateSummary();
    updateCategoryBreakdown();
}

form.addEventListener("submit", function (e) {
    e.preventDefault();

    const desc = document.getElementById("description").value.trim();
    const amount = parseFloat(document.getElementById("amount").value);
    const category = document.getElementById("category").value;
    const date = document.getElementById("date").value;

    if (!desc || !amount || !category || !date) return;

    const expense = {
        id: Date.now(),
        description: desc,
        amount: amount,
        category: category,
        date: date
    };

    expenses.push(expense);
    save();
    renderList();
    form.reset();
    document.getElementById("date").valueAsDate = new Date();
});

list.addEventListener("click", function (e) {
    if (e.target.classList.contains("delete-btn")) {
        const id = parseInt(e.target.dataset.id);
        expenses = expenses.filter(ex => ex.id !== id);
        save();
        renderList();
    }
});

document.getElementById("clear-all").addEventListener("click", function () {
    if (expenses.length === 0) return;
    if (confirm("Delete all expenses? This cannot be undone.")) {
        expenses = [];
        save();
        renderList();
    }
});

filterCategory.addEventListener("change", renderList);

renderList();
