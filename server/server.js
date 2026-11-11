require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
const port = 3000;

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        status: "ok",
        message: "StudyPlanner AI server працює"
    });
});

app.post("/api/ai", async (req, res) => {
    try {
        const {
            message,
            tasks = [],
            language = "uk-UA",
            currentDate,
            currentTime
        } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({
                error: "Повідомлення порожнє"
            });
        }

        const languageName = {
            "uk-UA": "українською мовою",
            "en-US": "англійською мовою",
            "pl-PL": "польською мовою"
        }[language] || "українською мовою";

        const prompt = `
Ти — AI-помічник навчального планувальника StudyPlanner.

Користувач спілкується з тобою ${languageName}.

Поточна дата: ${currentDate || "невідома"}
Поточний час: ${currentTime || "невідомий"}

Список навчальних завдань користувача:
${JSON.stringify(tasks, null, 2)}

Запит користувача:
${message}

Допомагай користувачу керувати навчанням.

Ти можеш:
- аналізувати його завдання;
- пояснювати статистику;
- знаходити активні та виконані завдання;
- допомагати визначати порядок роботи;
- пропонувати план на день;
- відповідати на звичайні запитання;
- пояснювати, що варто зробити далі;
- використовувати інформацію з переданого списку завдань.

Не вигадуй завдання, яких немає у списку.
Якщо інформації недостатньо, прямо скажи про це.

Відповідай природно, коротко та зрозуміло.
`;

        const response = await client.responses.create({
           model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
            input: prompt
        });

        res.json({
            answer: response.output_text
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Не вдалося отримати відповідь від AI"
        });
    }
});

app.listen(port, () => {
    console.log(`StudyPlanner AI server запущено: http://localhost:${port}`);
});
