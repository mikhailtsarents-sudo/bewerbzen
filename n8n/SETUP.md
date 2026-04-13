# BewerbZen n8n — Инструкция по запуску

## Что взято из ADR проекта (без изменений оригинала)

| Паттерн ADR | Как использован в BewerbZen |
|-------------|----------------------------|
| Telegram Trigger → Code → Switch | Основа роутера бота |
| HTTP Request → Claude API | Адаптирован промпт под Anschreiben |
| Schedule Trigger → HTTP Request loop | Основа Jobs Fetcher |
| Data Tables для очередей | Планируется на этапе 2 (трекинг лимитов) |
| Структура JSON workflow | Скопирована схема nodes/connections |

**ADR проект НЕ изменён.** Всё скопировано и переработано в новые файлы.

---

## Workflow IDs в n8n (созданы автоматически через API 13 апреля 2026)

| Workflow | n8n ID | Статус |
|----------|--------|--------|
| BewerbZen Telegram Bot MVP | `wSewHe5jlOvtPw1q` | ⏸ Inactive |
| BewerbZen Jobs Fetcher | `qOoPc4Idc0a1Fjk8` | ⏸ Inactive |
| BewerbZen Tally Notifier | `13dT1MNhz9TDx5hN` | ⏸ Inactive |

Активировать после: создания @BewerbZenBot → добавления Telegram credential → обновления credential ID в узлах.

---

## Файлы

- `bewerbzen_telegram_bot.json` — Telegram бот: /start, /help, /bewerben, генерация Anschreiben через Claude API
- `bewerbzen_jobs_fetcher.json` — Парсинг вакансий из Bundesagentur API → пост в Telegram канал @BewerbZen

---

## Шаг 1. Создать Telegram-бота

1. Открой Telegram → @BotFather
2. `/newbot` → имя: `BewerbZen` → username: `BewerbZenBot`
3. Скопируй токен бота
4. Создай Telegram-канал → `@BewerbZen` (публичный)
5. Добавь бота как администратора канала

---

## Шаг 2. Добавить Credential в n8n

1. Зайди на tsarents.app.n8n.cloud
2. Credentials → Add Credential → Telegram API
3. Вставь токен бота
4. Назови credential: `BewerbZen Bot`
5. Сохрани → скопируй ID credential

---

## Шаг 3. Импортировать workflows

### Telegram Bot
1. n8n → Workflows → Import from File
2. Выбери `bewerbzen_telegram_bot.json`
3. После импорта: найди все узлы с `REPLACE_WITH_CREDENTIAL_ID`
4. Замени на реальный ID credential из Шага 2
5. Найди `REPLACE_WITH_CLAUDE_API_KEY` → вставь ключ Claude API
6. Активируй workflow

### Jobs Fetcher
1. Импортируй `bewerbzen_jobs_fetcher.json`
2. Замени `REPLACE_WITH_CREDENTIAL_ID` везде
3. Активируй workflow

---

## Шаг 4. Настроить Webhook

n8n Cloud автоматически создаёт webhook URL при активации Telegram Trigger.

Адрес будет вида:
```
https://tsarents.app.n8n.cloud/webhook/bewerbzen-bot-webhook
```

Зарегистрируй его через BotFather или Telegram API:
```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://tsarents.app.n8n.cloud/webhook/bewerbzen-bot-webhook
```

---

## Шаг 5. Тест

Напиши боту:
- `/start` → должно прийти приветствие
- `/help` → справка
- `/bewerben` → запрос описания вакансии
- Любой текст → генерация Anschreiben через Claude API

---

## Claude API ключ

Получить: https://console.anthropic.com → API Keys → Create Key
Вставить в узел `Claude API — Generate Anschreiben` → поле `x-api-key`

Текущая модель в workflow: `claude-opus-4-5`
Стоимость: ~$0.015 на один Anschreiben (~1200 токенов output)

---

## Что будет на этапе 2 (после первых пользователей)

- [ ] Трекинг лимитов (3 бесплатных) через n8n Data Tables
- [ ] Stripe Payment Link для покупки пакетов
- [ ] Генерация Lebenslauf (не только Anschreiben)
- [ ] PDF через Gotenberg
- [ ] Персонализация (профиль пользователя в Data Tables)
