# Kindstart

**Success is a direction, not a destination.**
Understand yourself. Set your goals.

Kindstart helps you act (organisation, motivation and small tools) and feel better about yourself (gentle realizations, your wins, and help or a referral when you need one). Designed with ADHD in mind, made for anyone.

Live: https://ruvad.github.io/Kindstart/ (once GitHub Pages is switched on).

## What's in it

Few things at a time: everything else rolls out when you tap it.

- **Today:** the time and how long until bed, your top goal, the next important date, and your tasks. Each task shows its next step; a tap shows all steps, Focus and Later. The circle marks it done. Your wins of the week are one tap away.
- **Calendar:** the month, tasks and important dates (once or every year), each with its own reminder.
- **Focus:** a pomodoro timer (focus, short break, long break), started on its own or from a task.
- **Help:** what's going on right now → a realization, your goal, tips, and people to talk to. About you (one statement at a time) and an ADHD self-check link.
- **SOS:** crisis lines (911, 988 in Canada and the US, Find A Helpline), one tap away on every page.
- **⋯:** Goals (High / Medium / Low, sorted for you), Notes (each can become a task), Sleep (bedtime, wake-up, a warmer screen in the evening), Tips, Saved realizations, Me (account, name, notifications, your data).
- **Notifications** for tasks, important dates, bedtime and the focus timer, each one configurable, while the app is open.
- **Warm colours** with little blue light, light or dark, darker in the evening.

## Run it

Double-click `start.bat` (needs Python). It opens `http://127.0.0.1:5560/`. Tests: `http://127.0.0.1:5560/tests.html`. After an update, press Ctrl+Shift+R.

## Content

Everything people read lives in [`content/content.js`](content/content.js) and [`content/extra.js`](content/extra.js); the app joins them. Entries with `sample: true` are placeholders.

## Accounts

Optional, with Supabase, and off until set up: run [`docs/supabase-setup.sql`](docs/supabase-setup.sql) in a Supabase project, then put its URL and publishable key in [`js/config.js`](js/config.js).

## How it's built

A school project. Plain HTML, CSS and JavaScript, no build step. The app runs on plain rules and sends nothing to an AI.
