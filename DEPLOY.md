# BewerbZen — Чеклист перед деплоем

## Статус готовности файлов

| Файл | Статус | Действие |
|------|--------|----------|
| `preview.html` | ✅ Готов | Переименовать в `index.html` перед заливкой |
| `assets/images/story-carousel.png` | ✅ Готов | Карусель, чистый путь |
| `assets/images/favicon.svg` | ✅ Готов | Иконка вкладки |
| `netlify.toml` | ✅ Готов | Конфиг деплоя, редиректы |
| `robots.txt` | ✅ Готов | SEO |
| `sitemap.xml` | ✅ Готов | Обновить дату при деплое |
| `n8n/bewerbzen_telegram_bot.json` | ✅ Готов | Импортировать в n8n |
| `n8n/bewerbzen_jobs_fetcher.json` | ✅ Готов | Импортировать в n8n |
| `n8n/bewerbzen_tally_notifier.json` | ✅ Готов | Импортировать в n8n |

---

## Шаг 1. Tally форма (10 минут)

1. Зайди на [tally.so](https://tally.so) → Sign up
2. Создай форму с полями:
   - Имя (короткий текст)
   - Telegram или email (короткий текст)
   - "Сколько откликов ты отправил — и сколько ответов получил?" (длинный текст)
3. Publish → скопируй ID формы из URL: `tally.so/r/xxxxxx` → `xxxxxx` это и есть ID
4. Открой `preview.html` → найди строку:
   ```js
   const TALLY_URL = 'https://tally.so/r/TALLY_FORM_ID';
   ```
5. Замени `TALLY_FORM_ID` на реальный ID формы

---

## Шаг 2. Переименовать HTML

```
preview.html → index.html
```
(Netlify по умолчанию раздаёт `index.html`)

---

## Шаг 3. Деплой на Netlify (5 минут)

1. Зайди на [netlify.com](https://netlify.com) → Log in
2. Sites → Add new site → Deploy manually
3. Перетащи папку `bewerbzen/` в окно браузера
4. Получи URL вида `random-name.netlify.app`
5. После покупки домена: Netlify → Domain management → Add custom domain → `bewerbzen.de`

---

## Шаг 4. Telegram Bot (15 минут)

1. @BotFather → `/newbot` → имя `BewerbZen` → username `BewerbZenBot`
2. Скопируй токен
3. Создай публичный канал → `@BewerbZen` → добавь бота как admin
4. В n8n Cloud (tsarents.app.n8n.cloud):
   - Credentials → Add → Telegram API → вставь токен → назови `BewerbZen Bot`
   - Скопируй ID credential

---

## Шаг 5. Импорт n8n workflows (20 минут)

### Для каждого из трёх файлов в `n8n/`:

1. n8n → Workflows → Import from file → выбери JSON
2. После импорта найди все `REPLACE_WITH_CREDENTIAL_ID` → замени на реальный ID
3. В боте: найди `REPLACE_WITH_CLAUDE_API_KEY` → замени на ключ Claude API
4. В Tally Notifier: найди `REPLACE_WITH_YOUR_TELEGRAM_CHAT_ID` → вставь свой Telegram ID

#### Как узнать свой Telegram ID:
Напиши @userinfobot в Telegram → он пришлёт твой chat_id

#### Claude API ключ:
[console.anthropic.com](https://console.anthropic.com) → API Keys → Create Key

---

## Шаг 6. Подключить Tally Webhook к n8n

1. В n8n: открой workflow `BewerbZen Tally Form → Telegram`
2. Нажми на узел `Tally Webhook` → скопируй Production URL
   - Будет вида: `https://tsarents.app.n8n.cloud/webhook/bewerbzen-tally`
3. В Tally: открой форму → Integrations → Webhooks → Add webhook → вставь URL
4. Активируй workflow в n8n

---

## Шаг 7. Активировать все workflows

В n8n переключи все три workflow в Active:
- [x] BewerbZen Telegram Bot MVP
- [x] BewerbZen Jobs Fetcher
- [x] BewerbZen Tally Form → Telegram

---

## Шаг 8. Финальная проверка

- [ ] Открыть bewerbzen.de — лендинг загружается
- [ ] Нажать кнопку CTA — открывается Tally форма
- [ ] Заполнить форму — приходит уведомление в Telegram от бота
- [ ] Написать боту `/start` — приходит приветствие
- [ ] Написать боту текст вакансии — приходит Anschreiben за ~20 сек
- [ ] Канал @BewerbZen — бот публикует вакансии

---

## Что НЕ нужно делать прямо сейчас

- ❌ Stripe (после первых платящих пользователей)
- ❌ Gotenberg PDF (после валидации спроса)
- ❌ Трекинг лимитов 3/3 (после первых 10 пользователей)
- ❌ Полноценный Lebenslauf-генератор (фаза 2)
- ❌ Регистрация Kleingewerbe (до первых €ew заработанных)

---

## Домен (опционально на старте)

bewerbzen.de — регистрировать через INWX или Namecheap (~€10/год)
После регистрации: Netlify → Add custom domain → следовать инструкции (DNS CNAME/A запись)
