# BewerbZen — Чеклист перед деплоем

## Статус готовности файлов

| Файл | Статус | Комментарий |
| ---- | ------ | ----------- |
| `index.html` | ✅ Готов | Основной файл лендинга (синхронизирован с preview.html) |
| `preview.html` | ✅ Готов | Рабочая копия (всегда синхронизировать с index.html перед деплоем) |
| `assets/images/story-carousel.png` | ✅ Готов | Карусель 4-панельная |
| `assets/images/favicon.svg` | ✅ Готов | Иконка вкладки |
| `assets/images/og-cover.png` | ✅ Готов | OG-обложка 1200×630 для соцсетей |
| `netlify.toml` | ✅ Готов | Конфиг деплоя, редиректы /bot и /start → Telegram |
| `robots.txt` | ✅ Готов | SEO |
| `sitemap.xml` | ✅ Готов | Обновить дату при деплое |
| `n8n/bewerbzen_telegram_bot.json` | ✅ **Развёрнут** | ID: `wSewHe5jlOvtPw1q` |
| `n8n/bewerbzen_jobs_fetcher.json` | ✅ **Развёрнут** | ID: `qOoPc4Idc0a1Fjk8` |
| `n8n/bewerbzen_tally_notifier.json` | ✅ **Развёрнут** | ID: `13dT1MNhz9TDx5hN` |

---

## Шаг 1. Деплой на Netlify (5 минут)

1. Зайди на [netlify.com](https://netlify.com) → Log in
2. Sites → Add new site → Deploy manually
3. Перетащи папку `bewerbzen/` в окно браузера
4. Получи URL вида `random-name.netlify.app`
5. После покупки домена: Netlify → Domain management → Add custom domain → `bewerbzen.de`

> **Важно:** `index.html` уже синхронизирован. Ничего переименовывать не нужно.

---

## Шаг 2. Telegram Bot (15 минут)

1. @BotFather → `/newbot` → имя `BewerbZen` → username `BewerbZenBot`
2. Скопируй токен бота
3. Создай публичный канал → `@BewerbZen` → добавь бота как admin с правами на публикацию
4. В n8n Cloud (tsarents.app.n8n.cloud):
   - Credentials → Add → Telegram API → вставь токен → назови `BewerbZen Bot`
   - Скопируй ID нового credential (вида `abc123...`)

---

## Шаг 3. Настроить n8n workflows (20 минут)

Все три workflow уже развёрнуты в n8n. Нужно только подставить реальные значения:

### BewerbZen Telegram Bot MVP (ID: `wSewHe5jlOvtPw1q`)

1. Открой workflow в n8n
2. Найди все узлы типа Telegram → смени credential на `BewerbZen Bot` (новый)
3. Найди узел `Claude API — Anschreiben` → в заголовке `x-api-key` замени `REPLACE_WITH_CLAUDE_API_KEY` на реальный ключ
4. Активируй workflow

#### Claude API ключ

[console.anthropic.com](https://console.anthropic.com) → API Keys → Create Key

### BewerbZen Tally Form → Telegram Notification (ID: `13dT1MNhz9TDx5hN`)

1. Найди узел `Notify Mikhail` → замени `REPLACE_WITH_YOUR_TELEGRAM_CHAT_ID` на свой ID
2. Как узнать свой Telegram chat_id: напиши @userinfobot → он пришлёт число (например: `120796715`)
3. Активируй workflow

### BewerbZen Jobs Fetcher (ID: `qOoPc4Idc0a1Fjk8`)

1. Найди узел отправки в Telegram → смени credential на `BewerbZen Bot`
2. Замени `CHANNEL_ID` на `@BewerbZen` (или числовой ID канала)
3. Активируй workflow

---

## Шаг 4. Подключить Webhook для регистрационной формы

Форма на лендинге отправляет данные на:

```text
https://tsarents.app.n8n.cloud/webhook/bewerbzen-tally
```

Это уже захардкожено в `index.html`. После активации workflow Tally Notifier webhook будет принимать запросы.

---

## Шаг 5. Зарегистрировать Telegram Webhook для бота

После активации бота в n8n, зарегистрируй webhook:

```text
GET https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<N8N_WEBHOOK_URL>
```

N8N Webhook URL — скопируй из узла `Telegram Trigger` в workflow бота.

---

## Шаг 6. Финальная проверка

- [ ] Открыть сайт — лендинг загружается
- [ ] Нажать кнопку «Начать бесплатно» — открывается регистрационная форма
- [ ] Заполнить и отправить форму — приходит уведомление в Telegram
- [ ] Написать боту `/start` — приходит приветствие с inline-кнопками
- [ ] Написать боту `/bewerben` — бот просит прислать вакансию
- [ ] Прислать текст вакансии — бот генерирует Anschreiben за ~20 сек
- [ ] После 3-го Bewerbung — бот отправляет сообщение об исчерпании лимита
- [ ] Канал @BewerbZen — бот публикует вакансии (Jobs Fetcher активен)

---

## Что НЕ нужно делать прямо сейчас

- ❌ Stripe (после первых платящих пользователей)
- ❌ Gotenberg PDF (после валидации спроса)
- ❌ Полноценный Lebenslauf-генератор (фаза 2)
- ❌ Регистрация Kleingewerbe (до первых €ew заработанных)

> Трекинг 3 бесплатных ✅ уже реализован через workflow static data в боте.

---

## Домен

bewerbzen.de — регистрировать через INWX или Namecheap (~€10/год)
После регистрации: Netlify → Domain management → Add custom domain → bewerbzen.de → следовать инструкции (DNS CNAME/A запись, займёт до 24ч)
