# BewerbZen — Архитектура проекта, бота, сайта и VPS

## Статус: ✅ Активен, миграция сайта на VPS (Apr 28, 2026)

**Workflow ID:** `wSewHe5jlOvtPw1q`  
**n8n:** tsarents.app.n8n.cloud  
**Бот:** @BewerbZen_bot (токен хранится в n8n credential "BewerbZen Bot")  
**Claude API ключ:** bewerbzen2 (в n8n workflow, ключ в Anthropic Console)  
**Claude модель:** `claude-sonnet-4-6`  
**Нод в workflow:** 43

## Текущий production snapshot

| Компонент | Статус | Где живет |
|-----------|--------|-----------|
| Telegram bot | Активен | n8n cloud workflow `wSewHe5jlOvtPw1q` |
| Landing/site | Перенесен на VPS, DNS еще смотрит на Netlify | `/srv/projects/bewerbzen/site` |
| VPS web server | Активен | nginx на `46.225.170.55:80` |
| Analytics ingest | Активен | `/srv/projects/bewerbzen/analytics`, порт `3466` |
| Analytics raw storage | Активен | Postgres table `bewerbzen_site_events` |
| Google Sheet report | Активен как readable reporting layer | `BewerbZen Site Analytics` |
| Search Console import | Ждет доступа | service account нужно добавить в GSC |
| Netlify | Больше не основной target | аккаунт paused из-за `credit limit` |

Главная причина переноса сайта: Netlify остановил все проекты команды с ошибкой `usage_exceeded / credit limit`. Чтобы не зависеть от Netlify для маленького статического сайта, BewerbZen переносится на VPS, где уже живет аналитика.

Текущий DNS `bewerbzen.de` все еще указывает на Netlify:

```text
bewerbzen.de A 75.2.60.5
www.bewerbzen.de A 75.2.60.5
```

Чтобы домен полностью переехал на VPS, нужно у DNS-провайдера заменить записи:

```text
bewerbzen.de      A      46.225.170.55
www.bewerbzen.de  A      46.225.170.55
```

После распространения DNS нужно выпустить HTTPS сертификат:

```bash
ssh -i ~/.ssh/adr_vps_key -o IdentitiesOnly=yes root@46.225.170.55 \
  'certbot --nginx -d bewerbzen.de -d www.bewerbzen.de'
```

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

## Сайт и VPS hosting

Сайт BewerbZen теперь хранится и отдается с VPS отдельно от ADR.

### VPS layout

Новая структура для всех проектов:

```text
/srv/projects/
  bewerbzen/
    site/
    analytics/
  future-project/
    site/
    analytics/
```

BewerbZen:

```text
/srv/projects/bewerbzen/site
/srv/projects/bewerbzen/analytics
```

ADR остается в старых live-папках и не смешивается с Zen:

```text
/srv/adr-project
/opt/adr-ingest
```

Правило: все новые проекты кладем только в `/srv/projects/<project>/`. Zen-файлы не должны попадать в ADR-папки.

### nginx

nginx установлен на VPS и отдает сайт из:

```text
/srv/projects/bewerbzen/site
```

Активный конфиг:

```text
/etc/nginx/sites-available/bewerbzen
/etc/nginx/sites-enabled/bewerbzen
```

Проверки:

```bash
curl -I http://46.225.170.55/
curl -I http://46.225.170.55/sitemap.xml
curl -I http://46.225.170.55/bewerbung-schreiben-lassen-russisch-deutschland.html
```

На `2026-04-28` эти проверки возвращали `200 OK`.

### Netlify

Netlify был нужен для:

- хостинга сайта `bewerbzen.de`;
- автоматического deploy из GitHub;
- HTTPS/SSL;
- CDN;
- redirects/proxy `/api/bz-analytics/*`.

На `2026-04-28` Netlify team paused:

```json
{"error":"usage_exceeded","message":"Usage exceeded"}
```

Поэтому Netlify больше не должен быть критической частью production. Его можно оставить только как fallback/preview после восстановления billing, но canonical hosting для Zen теперь VPS.

---

## Сайт: SEO и индексируемые страницы

Live sitemap расширен с одной главной страницы до набора SEO landing pages.

Файлы:

```text
/sitemap.xml
/bewerbung-schreiben-lassen-russisch-deutschland.html
/anschreiben-erstellen-lassen.html
/lebenslauf-deutschland-russisch.html
/bewerbung-vorlage-russisch-deutsch.html
/jobsuche-deutschland-bewerbung-hilfe.html
```

Каждая SEO-страница содержит:

- `<title>`;
- meta description;
- canonical URL;
- Open Graph tags;
- favicon;
- `Article` JSON-LD;
- `h1`;
- внутренние ссылки на связанные SEO-страницы и главную.

Главная `index.html` дополнена footer-блоком `SEO-гайды` со ссылками на эти страницы. Это нужно, чтобы страницы были не только в sitemap, но и во внутренней структуре сайта.

Проверки:

```bash
xmllint --noout sitemap.xml
curl -sS http://46.225.170.55/sitemap.xml
curl -sS http://46.225.170.55/anschreiben-erstellen-lassen.html
```

Индексация: Google уже видел `bewerbzen.de` до миграции. Точные impressions/clicks пока недоступны, потому что Search Console доступ для service account еще не выдан.

---

## Аналитика сайта

Решение: canonical raw analytics хранится на VPS в Postgres. Google Sheets — только удобный readable reporting layer.

### Сервис

```text
service: bewerbzen-analytics.service
folder: /srv/projects/bewerbzen/analytics
health: http://46.225.170.55:3466/healthz
nginx proxy: /api/bz-analytics/*
```

Проверки:

```bash
ssh -i ~/.ssh/adr_vps_key -o IdentitiesOnly=yes root@46.225.170.55 \
  'systemctl status bewerbzen-analytics.service --no-pager'

curl -sS http://46.225.170.55/api/bz-analytics/healthz
```

### Таблицы

```text
bewerbzen_site_events
bewerbzen_gsc_daily
```

`bewerbzen_site_events` хранит события сайта:

- `page_view`;
- `form_open`;
- `form_submitted`;
- `click_open_bot_success`;
- `click_buy_pack`;
- `click_buy_pro`;
- `lang_switch`.

Visitor/session identifiers хешируются SHA-256. В raw analytics нельзя хранить имена, email, Telegram handle, IP как бизнес-данные формы или полный текст формы.

### Browser tracker

Файл:

```text
/scripts/analytics/browser-tracker.js
```

Подключение в `index.html`:

```html
<script>
  window.BZ_ANALYTICS_ENDPOINT = "/api/bz-analytics/v1/site/event";
  window.BZ_ANALYTICS_PUBLIC_KEY = "public key from VPS env";
</script>
<script defer src="/scripts/analytics/browser-tracker.js"></script>
```

Такой endpoint работает и после переноса на VPS, потому что nginx проксирует `/api/bz-analytics/*` в локальный service на `127.0.0.1:3466`.

### Smoke events

На `2026-04-28` в Postgres были записаны:

```text
vps_smoke_test
netlify_proxy_smoke_test
vps_site_preview_smoke_test
vps_nginx_smoke_test
```

Проверка последних событий:

```bash
ssh -i ~/.ssh/adr_vps_key -o IdentitiesOnly=yes root@46.225.170.55 \
  'docker exec n8n-selfhost-postgres-1 psql -U n8n -d n8n -c "select event_name, source, occurred_at from bewerbzen_site_events order by occurred_at desc limit 10;"'
```

### Google Sheet

Readable report:

```text
BewerbZen Site Analytics
https://docs.google.com/spreadsheets/d/18LpO8h1Hvw6QKPOBy8I_M8eBzqs8zzVk-aTfaljADj8/edit
```

Tabs:

- `Summary`;
- `Daily`;
- `Events`;
- `GSC Queries`;
- `Config`;
- `Runbook`.

Правило конфликтов:

1. VPS Postgres raw tables win.
2. VPS summary/API logic must match raw tables.
3. Google Sheet refreshes from VPS.
4. Umami is auxiliary only.

### Search Console

Чтобы подтянуть реальные clicks/impressions, нужно добавить service account в Google Search Console property для `bewerbzen.de`:

```text
adr-search-console@adr-trainer.iam.gserviceaccount.com
```

Рекомендуемая property:

```text
sc-domain:bewerbzen.de
```

Fallback:

```text
https://bewerbzen.de/
```

---

## Что НЕ реализовано (фаза 2)

- Stripe оплата (после первых платящих пользователей)
- Gotenberg PDF экспорт
- Lebenslauf генерация (ждём валидации спроса)
- Deep linking: сайт → бот (передача данных из формы)
- Автоматический импорт Search Console в `bewerbzen_gsc_daily` (ждет GSC access)
- HTTPS на VPS для `bewerbzen.de` (ждет смены DNS с Netlify на `46.225.170.55`)

---

## Credentials и ключи

| Сервис | Где хранится |
|--------|-------------|
| Telegram Bot Token | n8n Credential "BewerbZen Bot" (ID: QnYKdsbSqRsqqH0J) |
| Claude API Key | Прямо в ноде "Claude API" workflow |
| n8n API Key | У Михаила (не хранить в репо) |
| Anthropic аккаунт | mikhail.tsarents@gmail.com |
| VPS SSH | `~/.ssh/adr_vps_key` на Mac |
| BewerbZen site VPS path | `/srv/projects/bewerbzen/site` |
| BewerbZen analytics VPS path | `/srv/projects/bewerbzen/analytics` |
| Analytics env | `/srv/projects/bewerbzen/analytics/.env` на VPS, не хранить в репо |
| Analytics public key | В `.env` на VPS и в `index.html`; публичный ключ, не секрет |
| Analytics admin API key | Только `.env` на VPS, не хранить в репо |
| Google Sheet | `BewerbZen Site Analytics`, id `18LpO8h1Hvw6QKPOBy8I_M8eBzqs8zzVk-aTfaljADj8` |

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
| 2026-04-21 | Parse Message: сохраняет user.username и user.email для автоактивации после оплаты |
| 2026-04-21 | /pay и Send Limit Exceeded: сначала спрашивают email → потом показывают кнопки оплаты |
| 2026-04-21 | Handle Email Input нод: валидирует email, сохраняет в staticData, показывает кнопки Gumroad |
| 2026-04-21 | Улучшен Claude промпт: конкретика, связь требований с опытом, правильная структура |
| 2026-04-21 | Добавлен /invite: реферальная ссылка + ref_bonus +1 кредит реферреру |
| 2026-04-21 | Добавлены кнопки 👍/👎 после Anschreiben + Handle Feedback нод |
| 2026-04-15 | Добавлен /pay (код бота + is /pay? нод), Send Limit Exceeded обновлён с inline-кнопками LS |
| 2026-04-28 | Создана VPS-структура `/srv/projects/bewerbzen/{site,analytics}` отдельно от ADR |
| 2026-04-28 | Развернут `bewerbzen-analytics.service` на VPS, порт `3466`, Postgres tables `bewerbzen_site_events` и `bewerbzen_gsc_daily` |
| 2026-04-28 | Создан Google Sheet `BewerbZen Site Analytics` как readable report поверх VPS raw analytics |
| 2026-04-28 | Добавлен browser tracker `/scripts/analytics/browser-tracker.js` и endpoint `/api/bz-analytics/v1/site/event` |
| 2026-04-28 | Добавлены SEO landing pages и расширен `sitemap.xml` |
| 2026-04-28 | Netlify team paused из-за `credit limit`; принято решение переносить production hosting на VPS |
| 2026-04-28 | Установлен nginx на VPS, сайт отдается из `/srv/projects/bewerbzen/site` по `http://46.225.170.55/` |
| 2026-04-28 | nginx проксирует `/api/bz-analytics/*` в локальный analytics service; smoke event `vps_nginx_smoke_test` записан в Postgres |
