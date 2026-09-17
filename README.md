# Offline Study Quiz (QVAC)

Turn a notes file into a short interactive quiz — **entirely on-device** with [QVAC](https://qvac.tether.io) by Tether. No cloud AI APIs, no API keys.

**QVAC SDK version: `0.19.1` (`@qvac/sdk`)**

QVAC functions used: `loadModel`, `completion`, `unloadModel` (model constant `LLAMA_3_2_1B_INST_Q4_0`).

## What it does

1. Reads your `.txt` / `.md` notes
2. Loads a small local LLM via QVAC
3. Generates 3 quiz questions with `completion`
4. Asks you to answer in the terminal
5. Grades each answer on-device with another `completion` call
6. Prints a simple score

## Requirements

- Node.js **>= 22.17**
- A few GB free disk for the first model download
- Internet only for the initial model fetch; inference runs locally after that

## Install

```bash
git clone https://github.com/Atlas-AT/qvac-offline-study-quiz.git
cd qvac-offline-study-quiz
npm install
```

## Run

```bash
npm start -- samples/notes.md
```

Or with your own notes:

```bash
npm start -- /path/to/your-notes.md
```

## Why this exists

Built for the QVAC hackathon bounty on Whop: a small original app that proves on-device AI with a real `loadModel` + `completion` path, not a cloud wrapper.

## License

MIT

## Livestream proof (Whop bounty)

Run this in a visible terminal while the Whop proof livestream is live (leave it running through install + model load + quiz output):

```bash
git clone https://github.com/Atlas-AT/qvac-offline-study-quiz.git
cd qvac-offline-study-quiz
bash proof/full-demo.sh
```

That script shows Node version, `@qvac/sdk` dependency, `loadModel` / `completion` in source, `npm install`, then a full on-device quiz with AI output on screen.
