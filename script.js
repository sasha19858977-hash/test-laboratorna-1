"use strict";

const $ = id => document.getElementById(id);
const STORAGE_KEY = "studyPlannerTasks";
let tasks = [];
let currentFilter = "all";
let selectedTaskId = null;

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    $("formStatus").textContent = "Не вдалося зберегти дані браузера.";
  }
}

function loadTasks() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    tasks = Array.isArray(data) ? data.filter(t => t && typeof t.text === "string") : [];
  } catch {
    tasks = [];
  }
}

function openModal(id) {
  const dialog = $(id);
  if (dialog && !dialog.open) dialog.showModal();
}

function closeModal(id) {
  const dialog = $(id);
  if (dialog?.open) dialog.close();
}

function showView(view) {
  $("homeView").hidden = view !== "home";
  $("tasksView").hidden = view !== "tasks";
  $("statisticsView").hidden = view !== "statistics";
  $("helpView").hidden = view !== "help";
  document.querySelectorAll("[data-view]").forEach(button => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  if (view === "tasks") {
    renderAllTasks();
  }
  if (view === "statistics") {
    updateStatistics();
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function addTask(textFromVoice = null) {
  const text = String(textFromVoice ?? $("taskInput").value).trim();

  if (!text) {
    $("formStatus").textContent = "Введи назву завдання.";
    return false;
  }

  tasks.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: text.slice(0, 180),
    category: $("taskCategory").value,
    dueDate: $("taskDate").value,
    priority: $("taskPriority").value,
    description: $("taskDescription").value.trim().slice(0, 1000),
    completed: false,
    createdAt: new Date().toISOString()
  });

  saveTasks();
  renderTasks();
  $("taskForm").reset();
  $("formStatus").textContent = "✓ Завдання успішно додано!";
  return true;
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  task.completed = !task.completed;
  saveTasks();
  renderTasks();
}

function deleteTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  if (!confirm(`Видалити завдання «${task.text}»?`)) return;

  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
  closeModal("taskModal");
}

function makeTaskElement(task) {
  const li = document.createElement("li");
  li.className = `task-item${task.completed ? " completed" : ""}`;

  const top = document.createElement("div");
  top.className = "task-top";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-check";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", "Позначити виконання");
  checkbox.addEventListener("change", () => toggleTask(task.id));

  const copy = document.createElement("div");
  copy.className = "task-copy";

  const title = document.createElement("div");
  title.className = "task-title";
  title.textContent = task.text;

  const meta = document.createElement("div");
  meta.className = "task-meta";
  meta.textContent = [
    task.category,
    task.dueDate ? `📅 ${task.dueDate}` : "",
    task.priority
  ].filter(Boolean).join(" · ");

  copy.append(title, meta);

  const open = document.createElement("button");
  open.className = "task-open";
  open.type = "button";
  open.textContent = "›";
  open.title = "Відкрити деталі завдання";
  open.setAttribute("aria-label", "Відкрити завдання");
  open.addEventListener("click", () => openTask(task.id));

  top.append(checkbox, copy, open);

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const details = document.createElement("button");
  details.type = "button";
  details.textContent = "↗ Відкрити завдання";
  details.addEventListener("click", () => openTask(task.id));

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.textContent = task.completed ? "↶ Повернути" : "✓ Виконано";
  toggle.addEventListener("click", () => toggleTask(task.id));

  actions.append(details, toggle);
  li.append(top, actions);
  return li;
}

function renderList(listId, emptyId, search = "") {
  const list = $(listId);
  list.replaceChildren();

  const query = search.toLocaleLowerCase("uk-UA").trim();

  const filtered = tasks.filter(task => {
    const matchesFilter =
      currentFilter === "all" ||
      (currentFilter === "active" && !task.completed) ||
      (currentFilter === "completed" && task.completed);

    const matchesSearch =
      `${task.text} ${task.category} ${task.description || ""}`
        .toLocaleLowerCase("uk-UA").includes(query);

    return matchesFilter && matchesSearch;
  });

  filtered.forEach(task => list.appendChild(makeTaskElement(task)));
  $(emptyId).hidden = filtered.length > 0;
  return filtered.length;
}

function renderTasks() {
  renderList("taskList", "emptyMessage");
  if (!$("tasksView").hidden) renderAllTasks();
  updateStatistics();
}

function renderAllTasks() {
  renderList("allTaskList", "allEmptyMessage", $("taskSearch").value);
}

function openTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  selectedTaskId = id;
  const container = $("taskDetails");
  container.replaceChildren();

  const title = document.createElement("h3");
  title.className = "detail-title";
  title.textContent = task.text;

  const grid = document.createElement("div");
  grid.className = "detail-grid";

  const details = [
    ["Категорія", task.category || "Не вказано"],
    ["Термін виконання", task.dueDate || "Не встановлено"],
    ["Пріоритет", task.priority || "Низький"],
    ["Статус", task.completed ? "Виконано" : "Активне"],
    ["Опис", task.description || "Опис не додано"]
  ];

  details.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "detail-row";
    const strong = document.createElement("strong");
    strong.textContent = label;
    const span = document.createElement("span");
    span.textContent = value;
    row.append(strong, span);
    grid.appendChild(row);
  });

  container.append(title, grid);
  openModal("taskModal");
}

function editSelectedTask() {
  const task = tasks.find(t => t.id === selectedTaskId);
  if (!task) return;

  const text = prompt("Нова назва завдання:", task.text);
  if (text === null) return;
  if (!text.trim()) {
    alert("Назва завдання не може бути порожньою.");
    return;
  }

  const description = prompt("Опис завдання:", task.description || "");
  if (description === null) return;

  task.text = text.trim().slice(0, 180);
  task.description = description.trim().slice(0, 1000);

  saveTasks();
  renderTasks();
  openTask(task.id);
}

function updateStatistics() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const remaining = total - completed;
  const progress = total ? Math.round(completed / total * 100) : 0;

  $("totalCount").textContent = total;
  $("completedCount").textContent = completed;
  $("remainingCount").textContent = remaining;
  $("progressText").textContent = `${progress}%`;
  $("progressBar").style.width = `${progress}%`;

  $("detailTotal").textContent = total;
  $("detailCompleted").textContent = completed;
  $("detailRemaining").textContent = remaining;
  $("detailProgress").textContent = `${progress}%`;

  $("modalTotal").textContent = total;
  $("modalCompleted").textContent = completed;
  $("modalRemaining").textContent = remaining;
  $("modalProgress").textContent = `${progress}%`;

  renderBreakdown("categoryStats", "category");
  renderBreakdown("priorityStats", "priority");
  renderBreakdown("modalCategoryStats", "category");
}

function renderBreakdown(containerId, field) {
  const container = $(containerId);
  if (!container) return;
  container.replaceChildren();

  const groups = {};
  tasks.forEach(task => {
    const key = task[field] || "Інше";
    groups[key] = (groups[key] || 0) + 1;
  });

  const entries = Object.entries(groups).sort((a, b) => b[1] - a[1]);

  if (!entries.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "Поки що немає даних для статистики.";
    container.appendChild(p);
    return;
  }

  entries.forEach(([name, count]) => {
    const row = document.createElement("div");
    row.className = "category-row";

    const label = document.createElement("span");
    label.textContent = name;

    const bar = document.createElement("div");
    bar.className = "category-bar";
    const fill = document.createElement("span");
    fill.style.width = `${Math.round(count / tasks.length * 100)}%`;
    bar.appendChild(fill);

    const value = document.createElement("span");
    value.textContent = `${count} · ${Math.round(count / tasks.length * 100)}%`;

    row.append(label, bar, value);
    container.appendChild(row);
  });
}

function showVoiceTasks(language = "uk-UA") {
  const active = tasks.filter(t => !t.completed);
  const answer = active.length
    ? "Активні завдання: " + active.map((t, i) => `${i + 1}. ${t.text}`).join(". ")
    : "Активних завдань немає.";

  $("aiAnswer").textContent = answer;
  speak(answer, language);
}

function completeLastTask(language = "uk-UA") {
  const task = tasks.find(t => !t.completed);
  if (!task) return speak("Немає активних завдань.", language);
  task.completed = true;
  saveTasks();
  renderTasks();
  speak(`Завдання виконано: ${task.text}`, language);
}

function deleteLastTask(language = "uk-UA") {
  const task = tasks.find(t => !t.completed);
  if (!task) return speak("Немає активних завдань для видалення.", language);
  tasks = tasks.filter(t => t.id !== task.id);
  saveTasks();
  renderTasks();
  speak(`Завдання видалено: ${task.text}`, language);
}

async function askAI() {
  const message = $("aiInput").value.trim();
  if (!message) return;

  const button = $("aiForm").querySelector("button");
  button.disabled = true;
  $("aiAnswer").textContent = "AI готує відповідь…";

  try {
    const response = await fetch("http://localhost:3000/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        tasks,
        language: $("languageSelect").value,
        currentDate: new Date().toLocaleDateString("uk-UA"),
        currentTime: new Date().toLocaleTimeString("uk-UA")
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    $("aiAnswer").textContent = data.answer || "AI не повернув відповідь.";
  } catch (error) {
    $("aiAnswer").textContent =
      `Не вдалося підключитися до Study AI: ${error.message}\n` +
      "Перевір, чи запущено сервер на localhost:3000.";
  } finally {
    button.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  $("todayDate").textContent = new Date().toLocaleDateString("uk-UA");
  loadTasks();
  renderTasks();

  $("taskForm").addEventListener("submit", event => {
    event.preventDefault();
    addTask();
  });

  $("aiForm").addEventListener("submit", event => {
    event.preventDefault();
    askAI();
  });

  document.querySelectorAll("[data-view]").forEach(button => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });

  document.querySelectorAll("[data-modal]").forEach(button => {
    button.addEventListener("click", () => {
      if (button.dataset.modal === "statsModal") updateStatistics();
      openModal(button.dataset.modal);
    });
  });

  document.querySelectorAll("[data-close]").forEach(button => {
    button.addEventListener("click", () => closeModal(button.dataset.close));
  });

  document.querySelectorAll(".app-modal").forEach(dialog => {
    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });
  });

  document.querySelectorAll("[data-filter]").forEach(button => {
    button.addEventListener("click", () => {
      currentFilter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach(b => {
        b.classList.toggle("active", b.dataset.filter === currentFilter);
      });
      renderTasks();
    });
  });

  document.querySelectorAll("[data-help-topic]").forEach(button => {
    button.addEventListener("click", () => {
      const topic = button.dataset.helpTopic;

      document.querySelectorAll("[data-help-topic]").forEach(item => {
        item.classList.toggle("active", item.dataset.helpTopic === topic);
      });

      document.querySelectorAll("[data-help-content]").forEach(item => {
        item.classList.toggle("active", item.dataset.helpContent === topic);
      });
    });
  });

  $("taskSearch").addEventListener("input", renderAllTasks);

  $("editTaskButton").addEventListener("click", editSelectedTask);
  $("deleteTaskButton").addEventListener("click", () => {
    if (selectedTaskId) deleteTask(selectedTaskId);
  });
});