# SmartMoney redesign: design plan

**Status:** plan only, written 2026-11-12. No app code has changed. The only file added is this one, on the branch `redesign-cleo-style`.

**Goal:** make SmartMoney look and move like the reference (Cleo's marketing site, first two scroll sections) while staying its own brand and keeping every feature working.

---

## 1. What I need from you

Nothing here blocks the build. Each item has a default I will go with unless you say otherwise.

| # | Decision | My default | What you would need to do to change it |
|---|---|---|---|
| 1 | **Typeface** | Hanken Grotesk (open licence, installed from npm, served from your own site) | If you want General Sans or Satoshi: the Fontshare hosts (`api.fontshare.com`, `cdn.fontshare.com`) are blocked from this build environment, so I can neither download the font nor screenshot with it. Allow those two hosts in the environment's network settings, or add the `.woff2` files to the repo yourself. I could not read Fontshare's licence from here, so I have not assumed that committing its files to the repo is allowed. Switching later is a one-line change. |
| 2 | **Headlines and copy** | The copy in section 9 | Edit it there, or pick one of the listed alternates. |
| 3 | **Text that lives in protected code** | Leave it exactly as is | Four pieces of user-facing text sit in files I am treating as off limits, and all four are pinned by tests: the advisor's greeting (`src/hooks/useChat.js`), the completeness hints (`src/lib/profile.js`), the score tips (`src/lib/healthScore.js`), and the money format `$5000.00` with no thousands separator (`src/lib/format.js`). They will not match the new voice, and the calculator will show `$5000.00` next to new cards that show `$5,000`. Say the word and I will change them, with their test expectations, in a separate commit. |
| 4 | **Phone demo ends on a payoff card** | Include it | Cleo's phone shows text only. I end ours on a card with real calculated numbers, because calculated answers are what SmartMoney has that a chatbot does not. Tell me if you want text only. |
| 5 | **What follows section 2** | A short "how it works" strip and a footer | The reference description stops at section 2. Tell me if you want the page to end there. |
| 6 | **Checking the live advisor** | A few real calls on your Groq key, plus a stubbed API for the card states | `GROQ_API_KEY` is already set in this build environment and Groq is reachable, but `npx vercel dev` needs a Vercel login I do not have. So I will serve the unchanged `api/` handlers with a small throwaway local server (not committed) and send a handful of real questions, including one that triggers a tool call. Each card type is also checked against a stubbed `/api/chat`, so those checks do not depend on what the model decides to do. Tell me if you would rather I made no real calls on your key. |
| 7 | **Deep links on Vercel** | I add a rewrite to `vercel.json` so `/start` and `/advisor` survive a refresh | I cannot deploy from here. Please refresh both URLs on the preview once it is up. |
| 8 | **Logo** | I draw a simple original mark (section 3.1) | Send me a logo if you already have one. |

### Things the reference description does not cover

I am designing SmartMoney's own answer for these and not guessing at Cleo's:

- The header beyond "logo pill, round menu button on mobile": link list, scroll behaviour, hover states.
- Everything after section 2.
- How the dot-matrix arrow under "Scroll" animates (frames, timing).
- Focus states, and how the page behaves with reduced motion.

---

## 2. Design direction

### 2.1 What makes the reference feel the way it does

1. **Scroll is the playhead.** You start inside the phone's black glass and pull back to reveal a world. The move is tied 1:1 to scroll, with no smoothing, so it feels physical.
2. **The product is shown as a conversation**, playing in real time, not as a feature list.
3. **One idea per screen.** Large light type (weight 300), a great deal of white space, one sentence of body copy, one button.
4. **A warm, narrow palette.** A coloured dark in place of black, off-white in place of grey, one bright accent.
5. **One motion signature.** Words arrive from blur, slowly, on a symmetric ease. Nothing bounces.
6. **Tactile controls.** Glassy pill buttons with a hairline ring.
7. **Short, cheeky copy.**

All seven carry over. What changes is everything that identifies Cleo: name, logo, palette, typeface, artwork, phone content, and every word.

### 2.2 SmartMoney's own idea: daybreak

The person we are building for feels behind on money and wants to feel they finally have a plan. The visual idea is **the hour before sunrise**. The hero opens in the dark, on black glass. As you scroll, the phone pulls back, the sun comes up behind a line of hills, and the screen lights with a plan on it. The palette, the logo and the artwork all come from that one idea.

### 2.3 Voice

Warm, a little witty, honest about money, on the user's side. Rules for every string I write:

- Say the number. Never "improve your finances" when "$150 extra a month" is available.
- No shame, no lecture, no exclamation marks.
- One joke at most per screen, and never about the user.
- Be exact about limits. For example, the footer says figures are sent to the AI model when you ask a question, because they are.

---

## 3. Brand

### 3.1 Name and mark

- **Wordmark:** "SmartMoney", one word, Hanken Grotesk 500.
- **Mark:** two half-discs that form an abstract S. The upper one is a coral dome (the sun coming up). The lower one is a pine bowl, offset by one radius (its reflection). It reduces to a single colour and stays legible at 16px.
- It replaces the Create React App default `favicon.ico`, `logo192.png` and `logo512.png` that are still in `public/`. The page title, description and `theme-color` are updated at the same time.
- Deliberately avoided: Cleo's speech-bubble pill (three round corners, one square).

### 3.2 Colour

Named by role. Light values on the left, dark on the right. Contrast ratios were computed, not estimated.

| Token | Role | Light | Dark |
|---|---|---|---|
| `--color-bg` | Page background | `#FFFFFF` | `#0B1815` |
| `--color-surface` | Soft panels, phone screen, chat canvas ("oat") | `#F6F3EC` | `#12241F` |
| `--color-sunken` | Input fill, hover fill | `#EDE8DD` | `#0F1E1A` |
| `--color-raised` | Cards and bubbles that sit on a surface | `#FFFFFF` | `#1A322C` |
| `--color-text` | Primary text ("pine") | `#163B35` (12.3:1 on bg) | `#F3EFE6` (15.8:1) |
| `--color-muted` | Secondary text | pine at 70% (4.9:1 on bg, 4.7:1 on surface) | cream at 68% (7.8:1) |
| `--color-faint` | Placeholder, disabled | pine at 45% | cream at 45% |
| `--color-line` | Hairlines | pine at 12% | cream at 14% |
| `--color-border` | Input borders (3:1 or better) | pine at 56% | cream at 50% |
| `--color-accent` | The one bright colour ("coral") | `#FF7A5C` | `#FF8B70` |
| `--color-on-accent` | Text on coral | `#163B35` (4.8:1) | `#0B1815` (7.9:1) |
| `--color-accent-strong` | Coral used as text or a link | `#C4432A` (5.0:1) | `#FF9D86` |
| `--color-accent-soft` | Coral tint, glow | `#FFD3C4` | coral at 16% |
| `--color-primary` / `--color-on-primary` | Filled buttons | pine / white | cream / `#0B1815` |
| `--color-success` / `-soft` | On track, covered | `#17754B` (5.7:1) / `#DFF2E6` | `#63D29B` / 14% tint |
| `--color-warning` / `-soft` | Stretch, debt warnings | `#8F5A00` (5.8:1) / `#FFF0CC` | `#F0BE4C` / 14% tint |
| `--color-danger` / `-soft` | Off track, errors | `#B4233A` (6.5:1) / `#FCE4E7` | `#FF8F9A` / 14% tint |
| `--art-*` | Hero artwork colours (sky, sun, ridge, hills, glass) | fixed | fixed |

Notes:

- **No purple, no indigo, no brand gradients.** The only gradients are the hero sky, the glass reflections and the heading sweep.
- **Coral is never body text on white** (2.6:1). It is a fill, a glow and the moving band in the heading sweep. Coral as text uses `--color-accent-strong`.
- **One departure from the reference:** Cleo's body copy is 40% opacity, which works out to about 2.2:1. I use 70% so it passes WCAG AA. It still reads as quiet.
- Status is never colour alone. Every chip and warning has an icon and a word.
- The health score's rating colours and emoji come from `src/lib/healthScore.js` as hard-coded values. The component will map the rating name to a token and an icon and ignore the library's hex and emoji, so the library stays untouched.

### 3.3 Type

**Hanken Grotesk**, variable (weights 100 to 900), SIL Open Font Licence, one 34 kB file for the Latin range, installed from `@fontsource-variable/hanken-grotesk` and served from the site itself. No third-party font request.

I rendered eight open-licence candidates side by side with the real headline, body copy and money figures. Hanken Grotesk was the closest to the reference's calm at weight 300, has proper tabular figures for money columns, and stays legible at 13px in forms. DM Sans did not align its figures in columns, Mona Sans rendered slashed zeros in money amounts, and Onest ran too wide for the one-line headline.

| Style | Size at 390px → 1440px | Line height | Weight | CSS |
|---|---|---|---|---|
| Display (hero) | 32 → 54px | 1.06 | 300 | `clamp(2rem, 1.506rem + 2.105vw, 3.4rem)` |
| Title (H2, step questions) | 32 → 41px | 1.08 | 300 | `clamp(2rem, 1.821rem + 0.81vw, 2.55rem)` |
| Label large ("Scroll") | 20 → 27px | 1.12 | 300 | `clamp(1.25rem, 1.1rem + 0.667vw, 1.7rem)` |
| Body large (landing) | 16 → 17px | 1.2 | 300 | `clamp(1rem, 0.985rem + 0.086vw, 1.0625rem)` |
| Body (app) | 16px | 1.45 | 400 | |
| Small, labels | 13 to 14px | 1.35 | 500 | |
| Button | 16 → 14px | 1.25 | 450 | `clamp(0.85rem, 1.064rem - 0.238vw, 1rem)` |
| Figure (score, payoff date) | 40 to 72px | 1 | 300 | tabular figures |

Letter spacing is normal throughout. These sizes match the reference's measurements at both widths. The one change: app body text is weight 400, because 300 at 16px on a form is hard to read.

### 3.4 Space, shape, depth, motion

- **Spacing:** 4, 8, 12, 16, 24, 32, 48, 64, 96, 140, 220px.
- **Radii:** 14px inputs, 20px cards, 28px sheets, 30px buttons (60px tall), full pill for chips and bubbles.
- **Shadows:** `sm` 0 1px 2px pine 6%. `md` 0 6px 12px black 10% (the button). `lg` 0 24px 60px pine 16% (sheets).
- **Easing tokens:** `--ease-reveal: cubic-bezier(.75,0,.25,1)`, `--ease-soft: cubic-bezier(.5,0,.5,1)`, `--ease-out: cubic-bezier(0,.83,.46,1)`, `--ease-snap: cubic-bezier(.2,.8,.2,1)`.
- **Durations:** 100ms pop, 150ms word, 200ms hover, 400ms sheet, 1200ms reveal.
- **Icons:** lucide-react, already installed, 1.5px stroke. The emoji in the strategy badges and score rating are replaced with icons.

---

## 4. Technical approach

### 4.1 What stays untouched

`src/lib/**`, `api/**`, `src/context/**`, `src/hooks/**`, every fixture and every existing test. Baseline measured before any change: **522 tests in 17 suites pass, lint is clean, the build is green** (77.0 kB JS and 5.2 kB CSS, gzipped).

### 4.2 Libraries

| Library | Used for | Why |
|---|---|---|
| **anime.js 4.5** | The scroll-driven hero and the phone's timed conversation | Its timeline can be driven by scroll position, with a separate easing per track. That is exactly what the reference's keyframe table needs. Only the landing page loads it. |
| **react-router-dom 6.30** | Routes | Version 6, not 7. I tried both under this project's Jest 27: v6 works, v7 fails to load (`Cannot find module 'react-router/dom'`). |
| **@fontsource-variable/hanken-grotesk** | The typeface | Self-hosted, open licence. |
| Plain CSS | Everything else: word reveals in chat, the heading sweep, sheets, hover states | No JavaScript cost on app screens, and existing tests stay synchronous. |

No Three.js, no WebGL, no video, no CSS framework.

### 4.3 What I verified in a throwaway prototype

Built in a scratch copy outside the repo. None of it is on the branch. Results:

- **Scroll maps to the timeline exactly.** Progress read 0.04 at 90px, 0.149 at 336px, 0.60 at 1350px (where the pin releases) and 1.0 at 2250px.
- **The pull-back lands close to the reference's measurements on a 390×844 phone, with tuning left to do.** The phone was 84% of viewport width at 825px of scroll (reference: about 85% at 800px) and 65% at the end (reference: about 70%). Early in the scroll ours is still larger than theirs: 119% of viewport width at 500px, where their screen just fills the viewport at about 450px. The start distance and final size get tuned against those three checkpoints in step 4.
- **Sharpness.** A phone drawn at final size goes soft when enlarged. Drawing it at twice the size and scaling it down by half fixed that; text was crisp at every checkpoint where the screen is lit.
- **Cost of anime.js:** about 23 kB gzipped for the parts used.
- **Tests:** anime.js imports cleanly under Jest. Its scroll observer needs `ResizeObserver`, which the test browser lacks, so animation code only runs when motion is allowed (section 4.6).

### 4.4 Routes and structure

| URL | Screen |
|---|---|
| `/` | Landing page |
| `/start` | Intake wizard |
| `/advisor` | Advisor chat. Health score and debt calculator open over it, as today. |
| anything else | Redirects to `/` |

How this avoids breaking tests: `src/App.test.js` renders `<App />` and expects the wizard straight away. So `App` keeps that exact behaviour (wizard and chat, switched by state). A new `src/Root.js`, rendered by `index.js`, adds the router and the landing page around the same screens and drives the same switch from the URL. The existing tests run unmodified, and routing gets new tests of its own.

The conversation state moves above the routes (a small new `src/app/ChatSession.js` that calls the unchanged `useChat` hook), so visiting the landing page and coming back does not lose the chat.

```
src/
├── Root.js                     router + providers + landing (new)
├── App.js                      same contract as today
├── app/ChatSession.js          holds the conversation above the routes (new)
├── components/
│   ├── brand/                  Mark, Wordmark (new)
│   ├── landing/                Landing, SiteHeader, Hero, HeroArt, Phone, PhoneScreen,
│   │                           ClaimSection, HowItWorks, SiteFooter, demoProfile (new)
│   ├── common/                 Button, Chip, Field, Sheet (was Modal), RevealText, motion gate
│   ├── chat/                   + thread builder, cards/PayoffCard, GoalCard, ProjectionCard
│   ├── intake/ dashboard/ planning/   restructured, same props and data flow
└── styles/
    ├── tokens.css              every colour, size, radius, shadow and easing
    ├── base.css                reset, type, focus rings
    ├── primitives.css          buttons, chips, fields, cards, sheets
    └── landing.css  intake.css  chat.css  health-score.css  debt-calculator.css
```

### 4.5 Styling rules

- Still hand-written CSS under `src/styles/`, imported in cascade order by `index.css`.
- **Every colour comes from `tokens.css`.** Today there are 236 hard-coded hex values and a 237-line `theme.css` of dark-mode overrides. Both go. A check at the end confirms no hex value exists outside `tokens.css`.
- **Dark mode is one block of the same variables under `body.dark-mode`.** That is the class `ThemeContext` already sets and the existing test already checks, so the context is untouched.
- Breakpoints: 768px and 1280px, mobile first.
- Desktop rail and mobile tab bar are **the same elements restyled**, never two copies. The tests find buttons by name and would fail on duplicates.

### 4.6 The motion gate

One rule for the whole app: **the page always renders its finished state, and motion is added on top only when allowed.** Motion is allowed when the browser supports the needed APIs and the user has not asked for reduced motion.

- With reduced motion: no scroll runway, no parallax, no word reveals. The hero is a single still screen with the headline visible, the phone in its final pose and the conversation and card complete.
- In the test browser the gate is off, so numbers and text are present immediately. That is why existing assertions such as "the score reads 75" keep passing with no timers.
- New tests switch the gate on to cover the animated branches.

---

## 5. Landing page

### 5.1 Header

Fixed, transparent over the hero, 60px tall.

- Left: mark and wordmark, white over the hero.
- Right: one small pill. "Get my plan" goes to `/start`. If a saved profile exists it reads "Open my plan" and goes to `/advisor`.
- On mobile: mark only on the left, the same pill on the right. No menu, because there is nothing to put in one.
- Once the hero has left the viewport the header gains a surface background and pine text.

### 5.2 Section 1: hero

**Layout**

- The section is `250svh` tall. Inside it, a stage with `position: sticky; top: 0; height: 100dvh` is a grid whose children all share one cell: artwork, phone, text.
- The stage is pinned for the first 150vh of scroll. For the last 100vh it scrolls away with the section while the animation keeps running.
- Text is centred and white, at most 780px wide, pushed down 60px to clear the header: the headline, then 100px below it (80px on mobile) the word "Scroll" with a small animated arrow. No subcopy and no button.

**Artwork: four original layers, all inline SVG**

| Layer | Content |
|---|---|
| Sky | Night pine at the top fading through dusk teal to peach and butter at the horizon. A coral sun with a soft halo. Thin cloud bands. |
| Far ridge | Hazy sage silhouettes. |
| Mid hills | Rolling pine hills with one thin path that catches the light. |
| Foreground | A dark slope with grasses and saplings framing the phone, with a light grain. |

- Each layer scales to cover and crops at the sides on mobile.
- Three things move with time, not scroll: the sun's halo breathes, the clouds drift, a glint travels along the path. This is SmartMoney's counterpart to the reference's rippling water.
- Total weight is under about 15 kB. No image files.

**The phone: HTML and CSS, no 3D engine**

- The scene has CSS `perspective: 380svh`. That equals the reference's 15° field of view, so the tilt has the same shallow, long-lens look.
- The pull-back is a real move along the Z axis inside that perspective, not a scale animation. The browser then produces the correct curve: the phone shrinks very fast at first and settles slowly. It starts about 8 times its final size.
- Final size: the target is about 70% of viewport width on a phone once tilted, which is roughly 76svh tall (capped so it never exceeds 86% of viewport width). That is a starting value, tuned against the checkpoints in 4.3.
- Build, from back to front:
  - a soft pre-blurred shadow plane;
  - the frame, with a metallic gradient whose highlight slides as the phone turns;
  - a stack of thin offset layers that gives the edge real thickness when tilted;
  - the screen, with a dynamic island;
  - a "dark glass" overlay with slow drifting reflections, which fades out as the screen lights;
  - a faint diagonal glare.
- The phone is drawn at twice its final size and scaled by half, for the sharpness reason in 4.3.

**Motion on load** (CSS keyframes)

- The headline is split into word spans. Each word goes from opacity 0 to 1 over 1.2s, and from `blur(6px)` to sharp over 1.2s starting 0.2s later. Easing `cubic-bezier(.75,0,.25,1)`.
- Word delays: 0.40s, 0.45s, 0.50s, 0.55s. The "Scroll" label does the same at 0.9s.

**Motion on scroll**

Tied 1:1 to scroll, reversing on scroll up, no smoothing. Progress runs from 0 when the section's top reaches the top of the viewport to 1 when its bottom does. Ranges are in pixels at a 900px-tall viewport (2250px in total) and scale with viewport height.

| Track | From → to | Scroll range | Easing |
|---|---|---|---|
| Headline and label: opacity, blur | 1 → 0, 0 → 6px | 0 to 336 | `(.5,0,.5,1)` |
| Phone distance | 8× → 1× apparent size | 0 to 2250 | `(.15,0,.09,.99)` |
| Phone turn (rotateY) | −12.4° → +23.4° | 0 to 1290 | `(.39,.15,.45,.99)` |
| Phone tilt (rotateX) | −20.5° → 0° | 0 to 1310 | `(.55,.74,.52,.85)` |
| Phone tilt, settling | 0° → −4.8° | 1310 to 2250 | `(.52,−.56,.5,1)` |
| Phone vertical drift | slightly low → centred | 0 to 825 | `(.5,0,.5,1)` |
| Screen: dark glass → lit | 0 → 1 | 300 to 500 | `(.5,0,.5,1)` |
| Frame highlight | slides across | 0 to 1290 | linear |
| Sky and sun rise | | 490 to 2250 | `(0,.83,.46,1)` |
| Far ridge, mid hills, foreground rise | each by a different distance | 0 to 2250 | `(0,.83,.46,1)` |

Built as one anime.js timeline whose playback is bound to the section's scroll position.

**What plays on the phone screen**

Live HTML, in real time, not tied to scroll speed.

- Screen background: oat, with a large soft coral glow that drifts on a slow loop.
- Always present: a 9:41 status bar, an input pill reading "Ask about your money…", and a tab bar with **Ask · Finances · Score · Payoff**. Those are the real app's four destinations.
- The sequence starts once you have scrolled about 4% of the hero (about 90px). It restarts only if you return to the very top and scroll down again. It does not loop.
- Every word arrives from `blur(4px)`, opacity 0, 3px low, over about 0.15s. Smooth easing, never bouncy.

| Time | What happens |
|---|---|
| 0.6s | Greeting at the top, one word at a time, 0.2s apart: "Okay. Deep breath." |
| 1.5s | An empty white pill bubble pops in on the right within about 0.1s. |
| 1.6s | The user's message fills in, about 0.07s per word: "I owe $6,400 on two cards. Help." |
| 2.6s | Advisor reply, plain left-aligned text with no bubble: "$6,400 is a number, not a verdict." |
| 3.9s | Second line: "Send your 27.9% card an extra $150 a month." |
| 5.2s | A payoff card slides up and fades in. The date counts forward, the savings tick up, the two bars grow. |
| 6.4s | Holds on the final state. |

**The payoff card shows real numbers.** It runs the app's own `simulate_debt_payoff` tool on a fixed demo profile: a $4,100 card at 27.9% with a $125 minimum, and a $2,300 card at 24.9% with a $70 minimum. I ran it. Today it returns:

- debt-free in 25 months (December 2028), against 63 months on minimums only;
- 38 months sooner;
- $3,460 less interest.

The figures in the advisor's lines come from the same profile, so the text and the card cannot drift apart. The card is the same component the real chat uses.

**Performance**

- Only `transform`, `opacity` and `filter: blur()` animate, and blur only on text and small elements, never a full-screen layer.
- Looping animations pause when the hero is off screen.
- The landing page is its own code chunk, so the app screens do not load anime.js.

### 5.3 Section 2: the claim

**Layout**

- A centred column on the page background. Vertical padding 220px at 1280px wide and up, 140px below. Side gutters 32px, 16px on mobile.
- Not pinned. It scrolls in as the hero leaves.
- Order: heading, 24px, body, 48px, button.

**Content**

- H2 in two halves: "Honest math. Zero judgment." One line on desktop, two on mobile.
- Body, one sentence, at most 383px wide, in the muted colour.
- Button: "Get my plan", to `/start`.

**Motion**

- When the heading scrolls into view it plays the same fade and un-blur word reveal once (1.2s, `cubic-bezier(.75,0,.25,1)`). It never replays.
- 1.6s later the second half gets a colour sweep. The text is filled with a gradient four times its width: pine from 0 to 25%, coral at 66.7%, pine at 18% opacity at 100%. `background-position-x` moves from 100% to 0% over 1.2s, linear. The words start faint, a coral band crosses them, and they settle on pine.
- The gradient span stays inline, so the sweep wraps with the text on mobile.
- Body and button have no entrance animation.
- Triggered by an IntersectionObserver that adds a class; the animation itself is CSS.

**Button**

- 60px tall, radius 30px, padding 0 48px, shadow 0 6px 12px black 10%.
- Outer layer: a translucent fill, plus a 1px ring drawn by a masked `::before` gradient (light, darker at 41.5%, light).
- Inner layer, inset 2px: a faint white fill with a 1px white border on the top and sides.
- Hover: the outer fill lightens and the inner border goes transparent, 0.2s linear.
- Keyboard focus: a 2px pine ring with a 3px offset.

### 5.4 After section 2 (my addition, see question 5)

- **How it works**, three short columns. Each shows a real component fed by the demo profile:
  1. "Tell it straight" with the completeness meter.
  2. "It runs the numbers" with a strategy card.
  3. "You get a plan" with the score dial.
- **Footer:** wordmark, theme toggle, and two honest lines. "Saved on this device, not in an account. Your figures are sent to the AI model only when you ask a question." And the existing educational-purposes disclaimer.

---

## 6. App screens

All four screens use the same tokens, type and card style as the landing page, so the phone demo and the real app look like one product.

### 6.1 Shared pieces

- **Navigation.** A left rail on desktop (wordmark, the destinations, theme toggle). On mobile the same elements become a top bar and a bottom tab bar matching the phone demo: Ask · Finances · Score · Payoff.
- **Card.** Raised surface, 20px radius, 20px padding, a small muted eyebrow label, one large figure, supporting rows, and a footnote reading "Calculated from your numbers".
- **Sheet** (replaces the modal). A centred dialog on desktop, a bottom sheet on mobile. It gains proper dialog semantics: a label, Escape to close, focus moved in and returned, background scroll locked.
- **Buttons.** Pine filled pill for the main action, quiet text button for the rest, the glass pill for landing only.

### 6.2 Intake wizard (`/start`)

One question in focus, full height.

- **Desktop:** left rail with the wordmark, a large "25% complete" with the next-step hint, the five steps as a vertical list with a check on each finished one, and export, import and the disclaimer at the bottom. On the right, a centred column at most 640px wide.
- **Mobile:** top bar, a slim progress line with the percentage and hint, the five steps as a row of chips that scrolls sideways, then the question. Actions sit in a bar fixed to the bottom, within thumb reach.
- **The question:** "Step 2 of 5", then the step title at Title size ("What goes out"), then its one-line explanation in the muted colour.
- **Rows:** each entry is a soft card. Money fields are large (24px tabular figures) with the `$` or `%` attached. "Add income source" is a dashed pill. Empty lists show their existing one-line message.
- **Actions:** Back, "Skip for now", Next. On the last step Next becomes "Ask my advisor". Below, quietly: "Skip the rest and start asking questions".
- Removed: the icon circle, the subtitle and the "Powered by AI" badge.

### 6.3 Advisor chat (`/advisor`)

The landing phone, made real.

- **Canvas:** oat, with the same slow coral glow, much fainter. The conversation column is at most 720px wide.
- **Messages:** the user's are white pill bubbles on the right. The advisor's are plain left-aligned text with no bubble.
- **Word reveal:** a new advisor reply arrives with the blur-in. Replies over about 60 words reveal by paragraph instead, so a long answer does not take seconds to appear. Only new messages animate; returning from "My Finances" does not replay the thread.
- **While waiting:** three soft pulsing dots and the existing label for the running tool ("Running your payoff numbers").
- **Example questions:** the existing six, as tappable chips under "Try asking:". Tapping one fills the input and does not send, as today.
- **Composer:** a pill fixed to the bottom of the column, with the send button inside it.

**Tool results become cards in the thread.** Today a tool's result is hidden and only the model's explanation is shown. The transcript already holds each result, so the thread can show it with no change to `useChat`. A card appears after the question and before the advisor's explanation.

| Tool | Card | Shows |
|---|---|---|
| `simulate_debt_payoff` | Payoff | Debt-free month, months sooner and interest saved against minimums only, two bars comparing the timelines, monthly payment, and avalanche against snowball when they differ. Warning state if the debts do not clear within the projection. |
| `evaluate_goal` | Goal | Target and date, needed per month against free per month, and a verdict chip. |
| `project_savings` | Projection | Final balance, how much was contributed against how much is growth, and the tool's own assumption sentence, word for word. |

A tool call that returns an error shows no card; the advisor's text explains it, as today.

**The verdict chip is a display rule I am adding.** It uses only fields the tool returns:

- **Already there:** nothing left to save.
- **On track:** the tool says the goal is achievable.
- **Stretch:** not achievable, but free cash covers at least 75% of what is needed each month.
- **Off track:** everything else.

The 75% line is my judgement. It lives in the component layer with its own tests, and is one number to change.

### 6.4 Financial health score (sheet)

- A ring dial with the score at 72px in the middle and "out of 100" beneath.
- A rating chip with an icon and the word (Excellent, Good, Fair, Needs Improvement), coloured by token.
- One sentence of encouragement, rewritten in the new voice.
- Three breakdown rows (savings rate, debt-to-income, emergency fund), each with points, a bar and its detail line.
- The Coverage & Retirement checklist, then How to Improve.
- With no figures: the existing message, plus a button to go and add them.

### 6.5 Debt payoff calculator (sheet)

- **Your Debts:** each debt is a card with name, balance, rate and minimum payment, and a remove button.
- **Warnings** sit directly under the list, in the warning colour with an icon. The "never gets paid off at its minimum payment" warning is the most important thing on the screen and gets the most visual weight.
- **Extra monthly payment:** one large field.
- **Totals:** total debt and total minimum payment.
- **Three strategy cards** in the shared card style: Debt Avalanche, Debt Snowball, Smart Payment Plan. Each has an icon badge, the time to debt-free as the large figure, three rows, and a bar sized against the slowest plan. The recommended plan gets a coral outline.
- Three columns on desktop, stacked on mobile.

### 6.6 Responsive behaviour

| Width | Landing | App |
|---|---|---|
| 390px | Headline on one line. Phone about 70% of width at rest. 140px section padding, 16px gutters. | Top bar and bottom tab bar. Sheets are full-height bottom sheets. One field per row. |
| 768px | Same as mobile with wider gutters (32px). | Top bar. Sheets are centred dialogs. Two fields per row. |
| 1440px | Headline 54px. 220px section padding. | Left rail. Content column centred. Strategy cards three across. |

### 6.7 Accessibility

- Text contrast meets WCAG AA in both themes (table in 3.2).
- Visible focus rings on everything interactive.
- Sheets are real dialogs.
- Split-word headings keep their text readable as one sentence.
- Reduced motion is honoured everywhere (4.6).

---

## 7. Existing behaviour the redesign must not disturb

The current tests find things by their visible text and accessible names. These stay exactly as they are:

- The heading "SmartMoney" on the wizard.
- The five step buttons, named exactly "What comes in", "What goes out", "What you owe", "What you have", "What you are working toward". Checks and step numbers on them are decorative and hidden from assistive tech, so the names do not change.
- "25% complete" as its own piece of text, and the hint text.
- The buttons Back, Next, "Skip the rest and start asking questions", "Add income source", "Add fixed expense", "Add debt", "Add account", "Remove row 1".
- Field labels: Source, Net monthly, Monthly, Name, Balance, APR, Minimum.
- In chat: "Try asking:", the input placeholder, "Send message", "My Finances", "Financial Health Score", "Debt Payoff Calculator". The mobile tab labels (Finances, Score, Payoff) are contained in those names.
- In the sheets: one button named "Close", the calculator placeholders, the "Extra Monthly Payment" label, the three strategy titles, and the "Coverage & Retirement" region.
- The theme toggle's title, "Switch to Dark Mode", and the `dark-mode` class on `body`.
- "Import a profile file" on the file input.
- The wizard and the chat are never both mounted.

---

## 8. Build order

Each step ends with `CI=true npm test`, `npm run lint` and `npm run build` green, then one commit.

| Step | Work | Check before moving on |
|---|---|---|
| 0 | Branch and this plan. | Done. |
| 1 | **Foundations.** Install the three packages. Write `tokens.css`, `base.css`, `primitives.css`. Add the font. Draw the mark and replace the favicon, app icons, title and theme colour. Delete `theme.css` and every hard-coded colour. | Existing screens still work, now on tokens, in both themes. No hex outside `tokens.css`. |
| 2 | **Routing.** `Root.js`, `ChatSession.js`, URL-driven wizard and chat, the `vercel.json` rewrite. New routing tests. | The existing `App.test.js` passes unmodified. The conversation survives a trip to `/` and back. |
| 3 | **Shared cards.** Payoff, Goal, Projection, score dial, strategy card, and the verdict rule, each tested against fixed tool results. | Figures on each card equal the tool output. |
| 4 | **Landing.** Header, artwork, phone, the scroll timeline, the phone conversation, section 2, the closing strip and footer, the reduced-motion still. | Screenshots at scroll 0, 170, 336, 400, 500, 825, 1290, 1350, 1800 and 2250px, plus section 2, at 1440×900 and 390×844. Measured against this plan: headline gone by 336px, screen lit by 500px, pin released at 150vh, phone widths at the mobile checkpoints. Gaps fixed before moving on. |
| 5 | **Intake wizard.** | Every step at 390, 768 and 1440px, light and dark. |
| 6 | **Advisor chat,** including tool cards in the thread. | Empty, mid-conversation and each card type, against a stubbed `/api/chat`, at the three widths, light and dark. Then one live round trip with a tool call (question 6). |
| 7 | **Health score and debt calculator sheets.** | Empty, filled and warning states at the three widths, light and dark. Keyboard: Escape and focus return. |
| 8 | **Polish.** Contrast, focus order, reduced motion, slow-device check of the hero, dead CSS removed. | A full screenshot pass of every screen. |
| 9 | **Wrap up.** README updated (styling, routes, structure). Final test, lint and build. Summary of what changed and what could not be matched. | All three green. |

---

## 9. Copy for the first two sections

**Hero headline**

> Money, minus the dread.

Alternates: "Your debt has an end date." · "Feel behind? Not for long." · "Finally, a money plan."

**Hero label**

> Scroll

**Phone screen**

> Okay. Deep breath.
>
> *(user)* I owe $6,400 on two cards. Help.
>
> $6,400 is a number, not a verdict.
>
> Send your 27.9% card an extra $150 a month.
>
> *(card)* Debt-free by Dec 2028 · 38 months sooner · $3,460 less interest
>
> *(input)* Ask about your money…
>
> *(tabs)* Ask · Finances · Score · Payoff

The card's figures are computed when the page loads, so the month moves forward as time passes.

**Section 2**

> **Honest math. Zero judgment.**
>
> Every answer is worked out from your real income, debts and goals, then explained without the lecture.
>
> [ Get my plan ]

Alternates for the heading: "Real numbers. No lectures." · "You bring the mess. We bring the math."

---

## 10. What will not match the reference

- **No real 3D.** The reference lights a 3D model with an environment map. Ours is HTML and CSS: reflections are gradients that slide as the phone turns, and the edge thickness is a stack of layers. At rest and in motion it should read as a phone. Frozen at an extreme angle it will look flatter than theirs.
- **No water shader.** Our time-based motion is the sun's halo, drifting clouds and a glint on the path.
- **Scrubbing runs in JavaScript.** It is 1:1 with scroll, but on a slow Android phone it may drop frames where theirs would not. Mitigations are in 5.2; I will check with CPU throttling in step 8.
- **Body copy is darker** than the reference, on purpose, for contrast.
- **The phone demo ends on a card,** which theirs does not (question 4).
- **Typeface, palette, artwork, logo and all copy differ** by design.

## 11. Risks

| Risk | Mitigation |
|---|---|
| The hero stutters on low-end phones | Only compositor-friendly properties animate, the phone subtree is kept small, loops pause off screen, and the reduced-motion still is always available. |
| A restyle changes an accessible name and breaks a test | The list in section 7, and tests run after every step. |
| Dark mode regressions | One variable block replaces the override pile, and every screen is screenshotted in both themes. |
| Deep links 404 on Vercel | Explicit rewrite, plus your check on the preview (question 7). |
| Two money formats on screen | Question 3. |
