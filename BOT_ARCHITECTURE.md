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
/pay           → Страница оплаты: 2 inline-кнопки (Pack €4.99 / Pro €12.99)
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
  registered_at: '',      // ISO timestamp регистрации
  ui_lang: 'ru'           // Язык интерфейса бота: 'ru'|'de'|'ar'|'tr'|'uk'|'en' (из Telegram language_code)
}
```

**Состояния (`state`):**
- `idle` — обычный режим, принимает команды
- `waiting_vacancy` — ждёт текст вакансии после `/bewerben`
- `waiting_cv` — ждёт резюме после получения вакансии
- `onboarding_job` — ждёт название должности (шаг 1)
- `onboarding_city` — ждёт город (шаг 2)
- `onboarding_lang` — ждёт язык подборок (шаг 3)

## Архитектура нод (43 нода)

```
Telegram Trigger
└── Parse Message (Code) — определяет route, userState, detectBotLang
    │                       callback_query → route='callback'
    ├── Is /start?   → Start Handler (Code)
    │                  ├── ref_XXXX startParam → +1 ref_bonus реферреру
    │                  ├── Новый: онбординг шаг 1
    │                  └── Вернувшийся: welcome back
    ├── Is /help?    → Send Help
    ├── Is /bewerben? → Set Bewerben State → Ask Vacancy
    ├── Is /status?  → Send Status
    ├── Is waiting_vacancy? → Save Vacancy → Ask CV
    ├── Is cv_text?
    │   └── Prepare Text Input (Code)
    │       └── Check Limit (Code) — лимит = 3 + ref_bonus
    │           ├── OK  → Claude API → Format Result → Send Anschreiben [👍/👎]
    │           └── !OK → Send Limit Exceeded [кнопки оплаты]
    ├── Is cv_file?
    │   └── Get File Info → Get File URL → Download File
    │       └── Prepare File Input → Check Limit → ...
    │           └── Is callback? → Handle Feedback (Code) — сохраняет 👍/👎 в staticData
    │               └── Is onboarding?
    │                   ├── true → Handle Onboarding (Code)
    │                   └── false → Send Fallback
    ├── Is /stats?  → Send Stats (Code) — только для admin chat_id
    ├── Is /pay?    → Send Pay (Code) — 2 inline-кнопки с LS checkout links
    └── Is /invite? → Send Invite (Code) — реф. ссылка t.me/BewerbZen_bot?start=ref_CHATID

Claude API ошибка → Claude Error (Code) — сбрасывает state в idle, retry-сообщение
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
- После лимита: бот показывает /pay с двумя кнопками
- **Pack:** €4.99 → 3 Anschreiben (one-time)
- **Pro:** €12.99/мес → Unlimited
- Оплата через **Gumroad** (tsarentsonic.gumroad.com)
- Pack checkout: `https://tsarentsonic.gumroad.com/l/svvxdp`
- Pro checkout: `https://tsarentsonic.gumroad.com/l/bewerbzen-pro`
- Gumroad Ping → `https://tsarents.app.n8n.cloud/webhook/bewerbzen-gumroad` (workflow: 7JZ0KekCYSVxgmHC)
- При покупке: покупатель вводит @username в custom field → n8n автоматически ставит `isPaid = true`
- Если username не найден → уведомление админу для ручной активации
- ⚠️ Добавить custom field "Telegram username" в оба продукта на Gumroad

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
| 2026-04-15 | Мультиязычность бота: 6 языков (ru/de/ar/tr/uk/en), автоопределение из Telegram language_code |
| 2026-04-15 | Ask Vacancy, Ask CV, Send Anschreiben, Send Limit Exceeded, Send Fallback переведены в Code nodes |
| 2026-04-15 | user.ui_lang сохраняется в staticData, все сообщения бота переведены на язык пользователя |
| 2026-04-15 | Мультиязычность сайта: 6 языков, RTL для арабского, автоопределение OS, переключатель языка |
| 2026-04-15 | Lemon Squeezy: отклонён. Переход на Gumroad (tsarentsonic) |
| 2026-04-21 | Gumroad: 2 продукта (Pack svvxdp / Pro bewerbzen-pro), Ping webhook → n8n |
| 2026-04-21 | Parse Message: сохраняет user.username для автоактивации после оплаты |
| 2026-04-21 | Улучшен Claude промпт: конкретика, связь требований с опытом, правильная структура |
| 2026-04-21 | Добавлен /invite: реферальная ссылка + ref_bonus +1 кредит реферреру |
| 2026-04-21 | Добавлены кнопки 👍/👎 после Anschreiben + Handle Feedback нод |
| 2026-04-15 | Добавлен /pay (код бота + is /pay? нод), Send Limit Exceeded обновлён с inline-кнопками LS |
