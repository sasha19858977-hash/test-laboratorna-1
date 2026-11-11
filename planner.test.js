const test = require('node:test');
const assert = require('node:assert');
function isOverdue(deadlineDate) {
  return new Date(deadlineDate) < new Date('2026-11-11');
}
function filterTasks(tasks, subject) {
  return tasks.filter(t => t.subject === subject);
}

test('Перевірка простроченого дедлайну', () => {
  assert.strictEqual(isOverdue('2026-11-01'), true);
  assert.strictEqual(isOverdue('2026-11-20'), false);
});

test('Фільтрація завдань за предметом', () => {
  const tasks = [
    { title: 'Лаб 6', subject: 'Проєктний практикум' },
    { title: 'Тест', subject: 'Бази даних' }
  ];
  const result = filterTasks(tasks, 'Проєктний практикум');
  assert.strictEqual(result.length, 1);
});