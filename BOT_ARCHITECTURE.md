# BewerbZen Bot — Архитектура и логика работы

## Статус: ✅ Активен (Apr 14, 2026)

**Workflow ID:** `wSewHe5jlOvtPw1q`  
**n8n:** tsarents.app.n8n.cloud  
**Бот:** @BewerbZen_bot (токен хранится в n8n credential "BewerbZen Bot")  
**Claude API ключ:** bewerbzen2 (в n8n workflow, ключ в Anthropic Console)  
**Claude модель:** `claude-sonnet-4-6`  
**Нод в workflow:** 30

---

## Диалоговый флоу

```
/start         → Start Handler:
                 - Новый пользователь → Онбординг (3 шага)
                 - Вернувшийся       → Приветствие с профилем

/help          → Справка (Code node): команды, форматы, лимиты
/status        → Профиль + статистика пользователя (Code node)
/jobs          → Свежие вакансии по профилю (Bundesagentur API)
/stats         → ⚠️ Только для @mihailcarenc: сводная статистика бота
/bewerben      → Запускает создание Anschreiben:
                 1. Бот спрашивает ВАКАНСИЮ
                 2. Пользователь присылает текст вакансии
                 3. Бот спрашивает РЕЗЮМЕ
                 4. Пользователь присылает резюме (текст/фото/PDF)
                 5. Claude генерирует JSON {anschreiben, betreff, kontakt}
                 6. Бот отправляет все три части
```

## Онбординг (новые пользователи)

При первом `/start` бот проводит 3-шаговый опрос:

| Шаг | Состояние | Вопрос | Сохраняется |
|-----|-----------|--------|-------------|
| 1 | `onboarding_job` | Какую должность ищешь? | `user.job_title` |
| 2 | `onboarding_city` | В каком городе? | `user.city` |
| 3 | `onboarding_lang` | Язык подборок (русский/немецкий)? | `user.language` |

После онбординга: `user.onboarded = true`, `user.state = 'idle'`  
Старые пользователи (без поля `onboarded`): автоматически считаются онбордированными.

## Вывод результата /bewerben

Claude возвращает валидный JSON. Бот отправляет три части:

```
✅ Готово, [Имя]!

📧 Betreff (тема письма):
`Bewerbung als [Position] – [Name]`

📮 Куда отправить:
jobs@company.de / Hr. Müller

📄 Anschreiben:
```
Sehr geehrte Damen und Herren...
```

📌 Замени [квадратные скобки] на свои данные, сохрани как PDF.
📊 Использовано: 1 из 3 ✨
```

Если контакт не найден в вакансии — блок «Куда отправить» не показывается.

## Поддерживаемые форматы CV

| Формат | Описание | Лимит |
|--------|----------|-------|
| Текст | На любом языке | до 3000 символов |
| Фото 📷 | Фото резюме | до 5 МБ |
| PDF 📎 | PDF документ | до 5 МБ |
| Документ | Word и другие | до 5 МБ |

## Лимиты

| Параметр | Значение |
|----------|----------|
| Текст вакансии | 5000 символов |
| Текст CV | 3000 символов |
| Файл (фото/PDF) | 5 МБ |
| Claude max_tokens | 3000 |
| Бесплатных Bewerbung | 3 штуки |

## Состояние пользователя (Static Data)

Хранится в `$getWorkflowStaticData('global').users[chatId]`:

```js
{
  count: 0,               // Количество использованных Bewerbung
  isPaid: false,          // Платный пользователь (безлимит)
  state: 'idle',          // Текущее состояние (см. ниже)
  vacancy: '',            // Временно: текст вакансии между шагами
  onboarded: false,       // Прошёл ли онбординг
  job_title: '',          // Должность (из онбординга)
  city: '',               // Город поиска (из онбординга)
  language: 'ru',         // Язык подборок: 'ru' | 'de'
  registered_at: ''       // ISO timestamp регистрации
}
```

**Состояния (`state`):**
- `idle` — обычный режим, принимает команды
- `waiting_vacancy` — ждёт текст вакансии после `/bewerben`
- `waiting_cv` — ждёт резюме после получения вакансии
- `onboarding_job` — ждёт название должности (шаг 1)
- `onboarding_city` — ждёт город (шаг 2)
- `onboarding_lang` — ждёт язык подборок (шаг 3)

## Архитектура нод (37 нод)

```
Telegram Trigger
└── Parse Message (Code) — определяет route и userState
    ├── Is /start?   → Start Handler (Code)
    │                  ├── Новый: онбординг шаг 1 (auto HTTP)
    │                  └── Вернувшийся: welcome back (auto HTTP)
    ├── Is /help?    → Send Help
    ├── Is /bewerben? → Set Bewerben State → Ask Vacancy
    ├── Is /status?  → Send Status
    ├── Is waiting_vacancy? → Save Vacancy → Ask CV
    ├── Is cv_text?
    │   └── Prepare Text Input (Code)
    │       └── Check Limit (Code)
    │           ├── OK  → Claude API → Format Result → Send Anschreiben
    │           └── !OK → Send Limit Exceeded
    ├── Is cv_file?
    │   └── Get File Info → Get File URL → Download File
    │       └── Prepare File Input → Check Limit → ...
    ├── Is /stats?  → Send Stats (Code) — только для admin chat_id
    └── Is onboarding?
        ├── true → Handle Onboarding (Code) — шаги 1/2/3 (auto HTTP)
        └── false → Send Fallback

Claude API ошибка → Claude Error (Code) — сбрасывает state в idle, отправляет retry-сообщение
```

## Промпт для Claude

Claude получает текст вакансии + резюме (текст или файл) и возвращает JSON:

```json
{
  "anschreiben": "...",
  "betreff": "Bewerbung als [Position] – [Name]",
  "kontakt": "hr@company.de / Hr. Müller — или 'Nicht angegeben'"
}
```

Правила:
- Писать Anschreiben на немецком языке
- Использовать ТОЛЬКО навыки из резюме, релевантные вакансии
- [Квадратные скобки] для данных которые пользователь заменит сам

## Тарификация (Freemium)

- 3 бесплатных Anschreiben
- После: пакет €4.99 (3 шт.) или подписка €12.99/мес
- Оплата пока через @mihailcarenc (Stripe — фаза 2)
- Платный статус: `data.users[chatId].isPaid = true` в static data

---

## Jobs Fetcher (автоматическая рассылка вакансий)

Встроен в основной workflow как второй trigger (Schedule).

**Расписание:** каждую пятницу в 16:00 (перед выходными — когда люди занимаются поиском работы)

**Нод:** `Weekly Schedule` → `Broadcast Jobs` (Code)

**Логика Broadcast Jobs:**
1. Читает всех пользователей из `staticData.users`
2. Фильтрует: только `onboarded=true` + есть `job_title` и `city`
3. Для каждого: запрос в Bundesagentur für Arbeit API (бесплатно, без auth)
4. До 5 вакансий → форматирует дайджест → отправляет в Telegram
5. Задержка 500ms между пользователями (rate limit Telegram)

**BA API endpoint:**
```
GET https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs
?was={job_title}&wo={city}&umkreis=25&size=5
Headers: X-API-Key: jobboerse-jobsuche
```

**Формат дайджеста:**
```
🔔 Подборка вакансий — Elektriker · Berlin

1. *Elektriker (m/w/d)*
   🏢 Siemens AG · 📍 Berlin
   [Открыть →](https://arbeitsagentur.de/...)

📝 Понравилась вакансия? /bewerben — составлю Anschreiben за 2 минуты.
```

---

## Что НЕ реализовано (фаза 2)

- Stripe оплата (после первых платящих пользователей)
- Gotenberg PDF экспорт
- Lebenslauf генерация (ждём валидации спроса)
- Deep linking: сайт → бот (передача данных из формы)

---

## Credentials и ключи

| Сервис | Где хранится |
|--------|-------------|
| Telegram Bot Token | n8n Credential "BewerbZen Bot" (ID: QnYKdsbSqRsqqH0J) |
| Claude API Key | Прямо в ноде "Claude API" workflow |
| n8n API Key | У Михаила (не хранить в репо) |
| Anthropic аккаунт | mikhail.tsarents@gmail.com |

---

## История изменений

| Дата | Изменение |
|------|-----------|
| 2026-04-14 | Создан бот, базовый флоу /bewerben |
| 2026-04-14 | Добавлен онбординг (3 шага: должность, город, язык) |
| 2026-04-14 | Claude теперь возвращает JSON: anschreiben + betreff + kontakt |
| 2026-04-14 | Claude max_tokens увеличен до 3000 |
| 2026-04-14 | Удалены все ссылки на @BewerbZen канал (канал не существует) |
| 2026-04-14 | Расширена структура данных пользователя (job_title, city, language, registered_at) |
| 2026-04-15 | Добавлен /jobs (по запросу), рассылка изменена на пятницу 16:00 |
| 2026-04-15 | Аналитика: last_seen, visits, returned_at, jobs_count в staticData |
| 2026-04-15 | /status переделан в Code node (читает staticData надёжно) |
| 2026-04-15 | Umami аналитика на сайте (ID: eafea19f) |
| 2026-04-15 | Зарегистрированы команды бота через setMyCommands |
| 2026-04-15 | Добавлен /stats (только admin): сводная статистика по всем пользователям |
| 2026-04-15 | Нудж при /bewerben без онбординга — предлагает /start |
| 2026-04-15 | Claude API error handler: сбрасывает state, отправляет retry-сообщение |
| 2026-04-15 | /help переделан в Code node с улучшенным форматированием |
