"use strict";

let recognition = null;
let isListening = false;

// Запуск голосового керування
function startVoiceRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    $("voiceStatus").textContent =
      "Твій браузер не підтримує голосове керування. Спробуй Google Chrome.";
    return;
  }

  if (isListening && recognition) {
    recognition.stop();
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = $("languageSelect").value;
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isListening = true;
    $("voiceButton").textContent = "⏹ Зупинити слухання";
    $("voiceButton").classList.add("listening");
    $("voiceStatus").textContent = "🎤 Слухаю тебе...";
  };

  recognition.onresult = event => {
    const text = event.results[0][0].transcript.trim();

    $("voiceStatus").textContent = `Розпізнано: «${text}»`;
    processVoiceCommand(text, recognition.lang);
  };

  recognition.onerror = event => {
    const errors = {
      "not-allowed": "Дозволь доступ до мікрофона в браузері.",
      "no-speech": "Не почув голосу. Спробуй ще раз.",
      "audio-capture": "Не знайдено мікрофон.",
      "network": "Помилка мережі під час розпізнавання."
    };

    $("voiceStatus").textContent =
      errors[event.error] || `Помилка: ${event.error}`;
  };

  recognition.onend = () => {
    isListening = false;
    $("voiceButton").textContent = "🎤 Почати слухати";
    $("voiceButton").classList.remove("listening");
  };

  try {
    recognition.start();
  } catch {
    $("voiceStatus").textContent =
      "Не вдалося ввімкнути мікрофон. Спробуй ще раз.";
  }
}

// Обробка голосових команд
function processVoiceCommand(transcript, language = "uk-UA") {
  const text = transcript.toLocaleLowerCase(language).trim();

  // Додавання завдання
  const addPatterns = {
    "uk-UA": /^(додай|створи|добав)\s+(завдання|задачу)\s*/i,
    "en-US": /^(add|create)\s+(a\s+)?task\s*/i,
    "pl-PL": /^(dodaj|utwórz|stwórz)\s+(zadanie)\s*/i
  };

  const addMatch = transcript.match(
    addPatterns[language] || addPatterns["uk-UA"]
  );

  if (addMatch) {
    const taskText = transcript.slice(addMatch[0].length).trim();

    if (taskText) {
      if (addTask(taskText)) {
        speak(
          language === "en-US" ? "Task added." :
          language === "pl-PL" ? "Dodano zadanie." :
          "Завдання додано.",
          language
        );
      }
    } else {
      speak("Назви завдання після команди «додай завдання».", language);
    }
    return;
  }

  // Показати завдання
  const showPatterns = {
    "uk-UA": /покажи|мої завдання|список завдань/,
    "en-US": /show|my tasks|list tasks/,
    "pl-PL": /pokaż|moje zadania|lista zadań/
  };

  if ((showPatterns[language] || showPatterns["uk-UA"]).test(text)) {
    showVoiceTasks(language);
    return;
  }

  // Статистика
  const countPatterns = {
    "uk-UA": /скільки|статистик|кількість/,
    "en-US": /how many|statistics|count/,
    "pl-PL": /ile|statystyk|liczba/
  };

  if ((countPatterns[language] || countPatterns["uk-UA"]).test(text)) {
    const completed = tasks.filter(task => task.completed).length;
    const remaining = tasks.length - completed;

    let answer;

    if (language === "en-US") {
      answer = `Total tasks: ${tasks.length}. Completed: ${completed}. Remaining: ${remaining}.`;
    } else if (language === "pl-PL") {
      answer = `Wszystkie zadania: ${tasks.length}. Wykonane: ${completed}. Pozostałe: ${remaining}.`;
    } else {
      answer = `Усього завдань: ${tasks.length}. Виконано: ${completed}. Залишилося: ${remaining}.`;
    }

    $("aiAnswer").textContent = answer;
    updateStatistics();
    speak(answer, language);
    return;
  }

  // Виконати наступне активне завдання
  const completePatterns = {
    "uk-UA": /виконай останнє|познач останнє виконаним|заверши завдання/,
    "en-US": /complete the last|finish the task/,
    "pl-PL": /ukończ ostatnie|zakończ zadanie/
  };

  if ((completePatterns[language] || completePatterns["uk-UA"]).test(text)) {
    completeLastTask(language);
    return;
  }

  // Видалити перше активне завдання зі списку
  const deletePatterns = {
    "uk-UA": /видали останнє|видали завдання/,
    "en-US": /delete the last|delete task/,
    "pl-PL": /usuń ostatnie|usuń zadanie/
  };

  if ((deletePatterns[language] || deletePatterns["uk-UA"]).test(text)) {
    deleteLastTask(language);
    return;
  }

  speak(
    language === "en-US"
      ? "Command not recognized. Try adding a task or showing your tasks."
      : language === "pl-PL"
      ? "Nie rozpoznano polecenia. Spróbuj dodać zadanie lub pokazać listę."
      : "Команду не розпізнано. Спробуй додати завдання або показати список.",
    language
  );
}

// Показати активні завдання
function showVoiceTasks(language = "uk-UA") {
  const activeTasks = tasks.filter(task => !task.completed);

  let answer;

  if (activeTasks.length === 0) {
    answer = language === "en-US"
      ? "You have no active tasks."
      : language === "pl-PL"
      ? "Nie masz aktywnych zadań."
      : "Активних завдань немає.";
  } else {
    const list = activeTasks
      .map((task, index) => `${index + 1}. ${task.text}`)
      .join(". ");

    answer = language === "en-US"
      ? `Your active tasks: ${list}`
      : language === "pl-PL"
      ? `Twoje aktywne zadania: ${list}`
      : `Твої активні завдання: ${list}`;
  }

  $("aiAnswer").textContent = answer;
  speak(answer, language);
}

// Позначити перше активне завдання як виконане
function completeLastTask(language = "uk-UA") {
  const task = tasks.find(item => !item.completed);

  if (!task) {
    speak("Немає активних завдань.", language);
    return;
  }

  task.completed = true;

  saveTasks();
  renderTasks();

  speak(`Завдання виконано: ${task.text}`, language);
}

// Видалити перше активне завдання
function deleteLastTask(language = "uk-UA") {
  const task = tasks.find(item => !item.completed);

  if (!task) {
    speak("Немає активних завдань для видалення.", language);
    return;
  }

  const confirmed = confirm(`Видалити завдання «${task.text}»?`);

  if (!confirmed) {
    speak("Видалення скасовано.", language);
    return;
  }

  tasks = tasks.filter(item => item.id !== task.id);

  saveTasks();
  renderTasks();

  speak(`Завдання видалено: ${task.text}`, language);
}

// Озвучення відповіді
function speak(text, language = "uk-UA") {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language;

  window.speechSynthesis.speak(utterance);
}

// Підключення кнопки голосового керування
document.addEventListener("DOMContentLoaded", () => {
  const button = $("voiceButton");

  if (button) {
    button.addEventListener("click", startVoiceRecognition);
  }
});