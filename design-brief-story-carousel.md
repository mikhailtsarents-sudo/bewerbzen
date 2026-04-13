# Design Brief: Story Carousel — BewerbZen
## «История каждого, кто искал работу в Германии»

---

## Общий стиль

- Фотореалистичные изображения, editorial-стиль
- Светлая, воздушная атмосфера (не тёмная, не мрачная)
- Cinematic depth of field — размытый фон, чёткий объект
- Цветовая гамма: мягкие холодные тона (синий, серо-голубой), акцент на эмоции
- Персонаж: молодой человек 25–35 лет, европейская внешность
- Формат: 16:9 или 3:2, горизонтальный
- Качество: высокое разрешение, минимум 1920×1080

---

## Сцена 1 — «Полон надежд»

**Эмоция:** оптимизм, начало, предвкушение
**Момент:** человек только начинает поиск работы

**Описание:**
Молодой мужчина сидит за чистым рабочим столом с открытым ноутбуком.
Утреннее мягкое освещение из окна. Он улыбается, смотрит в экран,
в руке кофе. На экране — сайт с вакансиями.
Стол аккуратный, атмосфера свежая и позитивная.

**Настроение:** воскресное утро, начало нового этапа жизни
**Цвет:** тёплый белый + мягкий голубой

---

### Midjourney prompt (Scene 1):

```
Young professional man in his late 20s sitting at a clean modern desk,
open laptop with job listings website on screen, holding a coffee cup,
soft morning light from window, warm smile, feeling optimistic and hopeful,
minimalist Scandinavian home office interior, light blue and white tones,
shallow depth of field, cinematic editorial photography style,
soft bokeh background, --ar 16:9 --v 6 --style raw --q 2
```

---

## Сцена 2 — «Полный хаос»

**Эмоция:** стресс, перегруженность, раздражение
**Момент:** 4-я неделя поиска — десятки вкладок, повторные формы

**Описание:**
Тот же человек, но теперь явно уставший. На экране множество
открытых вкладок браузера — StepStone, Indeed, Xing. На столе
стопка бумаг, пустые чашки. Он держится за голову или смотрит
в экран с выражением «я не понимаю что происходит».
Освещение более жёсткое, беспорядок.

**Настроение:** перегрузка информацией, усталость от системы
**Цвет:** тёплый янтарный, приглушённый

---

### Midjourney prompt (Scene 2):

```
Same young professional man, visibly stressed and exhausted,
sitting at a messy desk with multiple browser tabs open on laptop screen,
head in hands or frustrated expression, empty coffee cups, papers scattered,
multiple monitors or browser windows showing job websites,
harsh overhead lighting, warm amber tones, feeling overwhelmed,
cinematic editorial photography, shallow depth of field, --ar 16:9 --v 6 --style raw --q 2
```

---

## Сцена 3 — «Только тишина»

**Эмоция:** разочарование, одиночество, потеря надежды
**Момент:** 8-я неделя — 30 заявок отправлено, ответов нет

**Описание:**
Человек сидит и смотрит в телефон или ноутбук с пустым почтовым ящиком.
Выражение лица — усталая грусть. Он один в комнате. Поздний день
или вечер. На экране виден пустой inbox или уведомление «Нет ответов».
Минималистичная атмосфера, ощущение застывшего времени.

**Настроение:** ожидание которое ни к чему не приводит, тишина
**Цвет:** холодный серо-синий, приглушённый

---

### Midjourney prompt (Scene 3):

```
Young professional man looking at laptop screen showing empty email inbox,
tired and disappointed expression, sitting alone in quiet room,
late afternoon soft light, cold blue-grey tones, one empty coffee mug,
minimal surroundings, feeling invisible and defeated, no new notifications,
cinematic editorial photography, melancholic mood, shallow depth of field,
--ar 16:9 --v 6 --style raw --q 2
```

---

## Сцена 4 — «Работа найдена. 3 недели с BewerbZen»

**Эмоция:** радость, облегчение, победа, уверенность
**Момент:** оффер получен — он устроился на работу за 3 недели

**Описание:**
Тот же человек, но теперь широко улыбается, смотрит в экран.
На экране ноутбука видно письмо с оффером или сообщение «Herzlichen Glückwunsch».
Чистый стол, дневное солнце, ощущение победы.
Возможно — он стоит, жмёт руку или сидит в новом офисе, уверенный.

**Настроение:** победа, облегчение, новая жизнь начинается
**Цвет:** тёплый зелёный акцент, яркое естественное освещение

---

### Midjourney prompt (Scene 4):

```
Young professional man smiling widely looking at laptop screen,
job offer acceptance email or "Herzlichen Glückwunsch" message visible,
bright natural daylight, clean modern desk, feeling of triumph and relief,
warm green-tinted light, confident posture, celebrating quietly,
or shaking hands in a bright modern office,
cinematic editorial photography, warm tones, shallow depth of field,
--ar 16:9 --v 6 --style raw --q 2
```

---

## Дополнительные параметры для всех сцен

Если нужна единая стилистика — добавь к каждому промпту:

```
consistent character, same young man, editorial magazine style,
Canon 5D natural light photography, soft shadows, no harsh flash
```

Если хочешь более иллюстративный стиль (не фото):

```
flat editorial illustration, soft gradient background,
modern SaaS website illustration style, 2D character design
```

---

## Размеры для вставки в сайт

| Слайд | Ширина | Высота |
|-------|--------|--------|
| Все   | 1920px | 1080px |
| Mobile| 768px  | 600px  |

Формат: JPG (q 85) или WebP

---

## Где использовать

Файл `preview.html` → секция карусели → фоновые изображения слайдов.
Когда будут готовы изображения — скажи, интегрирую в код за 5 минут.
