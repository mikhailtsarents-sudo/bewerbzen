# BewerbZen — Story Carousel implementation-ready visual handoff

Included: exports for Story Carousel states, final captions, typography, design tokens, button states, and interactive states.
Not included: live Figma URL, because this environment cannot create or host an external Figma file.

---

## 1. Carousel Desktop
Format: 16:9  
Purpose: homepage story carousel

### Slide 1 — Полон надежд
- Emotion: optimism, beginning, anticipation
- Visual: same male character, clean desk, coffee, soft morning light
- Headline:
  - Начал поиск работы
  - Всё выглядело просто

### Slide 2 — Полный хаос
- Emotion: stress, overload, irritation
- Visual: same character, messy desk, multiple tabs/windows, fatigue
- Headline:
  - 30 откликов
  - 0 ответов
- Supporting copy:
  - Вынужден заходить на десятки страниц и снова заполнять одни и те же данные в надежде найти работу мечты.

### Slide 3 — Решение
- Emotion: control, relief, clarity
- Visual: same character, calmer posture, laptop with BewerbZen-like interface
- Headline:
  - Попробовал BewerbZen
- Supporting copy:
  - Резюме + отклик за 8 минут

### Slide 4 — Результат
- Emotion: relief, quiet victory, confidence
- Visual: same character, handshake / offer moment / new office feel
- Headline:
  - Работа найдена
  - за 3 недели
- CTA button:
  - Bewerben

---

## 2. Carousel Mobile
Format: mobile crop from same story system

### Rules
- Keep same character across all slides
- Keep editorial photo look
- Keep glass card overlay
- Keep readable text area in lower-middle zone
- CTA on final slide must be visually stronger than the rest

---

## 3. Typography
Headings:
- Sora
- fallback: Inter Tight

Body:
- Inter

### Mobile sizing
- Slide headline: 26–32px / 700
- Supporting copy: 16–18px / 500
- CTA label: 18–20px / 700

### Styling rules
- No default rounded system font look
- No decorative serif
- Tight headline tracking
- Clean geometric sans feel

---

## 4. Design tokens
### Colors
- Primary blue: #5B7CFF
- Secondary mint: #00C896
- Text on image: #FFFFFF
- Glass surface: rgba(255,255,255,0.20)
- Glass border: rgba(255,255,255,0.35)
- Overlay dark: rgba(15,20,30,0.55)

### Radius
- Card radius: 20px
- CTA radius: 14px
- Progress radius: 999px

### Shadows
- Card shadow: 0 20px 60px rgba(0,0,0,0.12)
- CTA shadow: 0 10px 30px rgba(91,124,255,0.25)

---

## 5. Button states
Primary CTA on final slide: “Bewerben”

### Normal
- background: linear-gradient(90deg, #5B7CFF, #7B94FF)
- text: #FFFFFF

### Hover
- translateY(-1px)
- stronger shadow

### Active
- scale(0.98)

---

## 6. Interactive states
### Progress bar
- inactive: rgba(255,255,255,0.35)
- active: linear-gradient(90deg, #5B7CFF, #00C896)

### Glass content card
- default: translucent white with blur
- hover: slightly stronger border and shadow
- selected/active slide: stronger active progress segment only

---

## 7. Overlay system
Use image + cinematic overlay + glass content card

### Overlay
linear-gradient(
  to top,
  rgba(15,20,30,0.65) 0%,
  rgba(15,20,30,0.18) 45%,
  rgba(15,20,30,0.00) 75%
)

### Glass card
- background: rgba(255,255,255,0.18)
- backdrop-filter: blur(18px)
- border: 1px solid rgba(255,255,255,0.25)

---

## 8. Final expectation
Carousel must feel:
- premium
- calm
- cinematic
- product-level
- emotionally clear
- not generic
