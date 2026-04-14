# BewerbZen Bot — Архитектура и логика работы

## Статус: ✅ Активен (Apr 14, 2026)

**Workflow ID:** `wSewHe5jlOvtPw1q`  
**n8n:** tsarents.app.n8n.cloud  
**Бот:** @BewerbZen_bot (токен хранится в n8n credential "BewerbZen Bot")  
**Claude API ключ:** bewerbzen2 (в n8n workflow, ключ в Anthropic Console)  
**Claude модель:** `claude-sonnet-4-6`

---

## Диалоговый флоу

```
/start         → Приветствие
/help          → Справка по командам
/status        → Статус использования
/bewerben      → Запускает создание Anschreiben:
                 1. Бот спрашивает ВАКАНСИЮ
                 2. Пользователь присылает текст вакансии
                 3. Бот спрашивает РЕЗЮМЕ
                 4. Пользователь присылает резюме (текст/фото/PDF)
                 5. Claude генерирует Anschreiben
                 6. Бот отправляет результат
```

## Поддерживаемые форматы CV

| Формат | Описание | Лимит |
|--------|----------|-------|
| Текст | На любом языке | до 3000 символов |
| Фото 📷 | Фото резюме или паспорта | до 5 МБ |
| PDF 📎 | PDF документ | до 5 МБ |
| Документ | Word и другие | до 5 МБ |

Поддерживаемые языки CV: немецкий, русский, украинский, арабский и любые другие — Claude читает всё.

## Лимиты

| Параметр | Значение | Причина |
|----------|----------|---------|
| Текст вакансии | 5000 символов | Достаточно для любой вакансии |
| Текст CV | 3000 символов | Достаточно для краткого резюме |
| Файл (фото/PDF) | 5 МБ | Любое резюме умещается |
| Бесплатных Bewerbung | 3 штуки | Freemium модель |

При превышении лимитов бот отправляет понятное сообщение с просьбой сократить.

## Состояние пользователя (State Machine)

Хранится в `$getWorkflowStaticData('global').users[chatId]`:

```js
{
  count: 0,          // Количество использованных Bewerbung
  isPaid: false,     // Платный пользователь (разблокирует безлимит)
  state: 'idle',     // Текущее состояние: idle | waiting_vacancy | waiting_cv
  vacancy: ''        // Временно хранит текст вакансии между шагами
}
```

**Состояния:**
- `idle` — обычный режим, принимает команды
- `waiting_vacancy` — ждёт текст вакансии после `/bewerben`
- `waiting_cv` — ждёт резюме после получения вакансии
- После успешной генерации → автоматически сбрасывается в `idle`

## Архитектура нод (28 нод)

```
Telegram Trigger
└── Parse Message (Code) — определяет команду/состояние/тип файла
    ├── Is /start? → Send Welcome
    ├── Is /help?  → Send Help
    ├── Is /bewerben? → Set Bewerben State (Code) → Ask Vacancy
    ├── Is /status? → Send Status
    ├── Is waiting_vacancy? → Save Vacancy (Code) → Ask CV
    ├── Is cv_text?
    │   └── Prepare Text Input (Code)
    │       └── Check Limit (Code)
    │           ├── Limit OK? → Claude API → Format Result → Send Anschreiben
    │           └── Limit exceeded → Send Limit Exceeded
    ├── Is cv_file?
    │   └── Get File Info (httpRequest)
    │       └── Get File URL (Code) — проверяет размер файла
    │           └── Download File (httpRequest)
    │               └── Prepare File Input (Code)
    │                   └── Check Limit → Claude API → ...
    └── Send Fallback
```

## Промпт для Claude

Claude получает:
1. **Текст вакансии** — полностью, как прислал пользователь
2. **Резюме/о себе** — текст или извлечённый из файла

Инструкция Claude:
- Писать Anschreiben на немецком языке
- Использовать ТОЛЬКО навыки из резюме, релевантные вакансии
- НЕ упоминать нерелевантные навыки
- [Квадратные скобки] для данных которые пользователь заменит сам

## Тарификация (Freemium)

- 3 бесплатных Anschreiben
- После: пакет €4.99 (3 шт.) или подписка €12.99/мес
- Оплата пока через @mihailcarenc (Stripe — фаза 2)
- Платный статус включается через `data.users[chatId].isPaid = true` в static data

---

## Что НЕ реализовано (фаза 2)

- Lebenslauf генерация (ждём валидации спроса)
- Stripe оплата (после первых платящих пользователей)
- Gotenberg PDF экспорт
- Telegram канал @BewerbZen (нужно создать)
- Автоматическая отправка вакансий (Jobs Fetcher workflow)

---

## Credentiials и ключи

| Сервис | Где хранится |
|--------|-------------|
| Telegram Bot Token | n8n Credential "BewerbZen Bot" (ID: QnYKdsbSqRsqqH0J) |
| Claude API Key | Прямо в ноде "Claude API" workflow |
| n8n API Key | У Михаила (не хранить в репо) |
| Anthropic аккаунт | mikhail.tsarents@gmail.com |
