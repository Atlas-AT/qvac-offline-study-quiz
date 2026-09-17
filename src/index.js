#!/usr/bin/env node
/**
 * Offline Study Quiz — on-device QVAC (Tether) quiz from your own notes.
 * Uses loadModel + completion from @qvac/sdk. No cloud AI.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import {
  loadModel,
  unloadModel,
  completion,
  LLAMA_3_2_1B_INST_Q4_0
} from '@qvac/sdk'

const SDK_VERSION = '0.19.1'
const QUESTION_COUNT = 3

function usage() {
  console.log(`Offline Study Quiz (QVAC ${SDK_VERSION})

Usage:
  npm start -- <path-to-notes.txt|md>
  node src/index.js <path-to-notes.txt|md>

Example:
  npm start -- samples/notes.md
  npm start -- samples/notes.md --answers-file proof/answers.txt

Requires Node.js >= 22.17. First run downloads a small local model.
`)
}

function stripJsonFence(text) {
  const trimmed = text.trim()
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) return fence[1].trim()
  return trimmed
}

async function completeText(modelId, prompt) {
  const result = completion({
    modelId,
    history: [{ role: 'user', content: prompt }],
    stream: true
  })
  let text = ''
  for await (const token of result.tokenStream) {
    text += token
    process.stdout.write(token)
  }
  return text
}

async function generateQuestions(modelId, notes) {
  const prompt = `You are a study coach. Read the notes and write exactly ${QUESTION_COUNT} short quiz questions that test understanding.

Notes:
"""
${notes.slice(0, 6000)}
"""

Reply with ONLY a JSON array of ${QUESTION_COUNT} strings. No markdown, no extra keys.
Example: ["Question one?","Question two?","Question three?"]`

  console.log('\nGenerating quiz questions on-device...\n')
  const raw = await completeText(modelId, prompt)
  console.log('\n')

  let questions
  try {
    questions = JSON.parse(stripJsonFence(raw))
  } catch {
    questions = raw
      .split('\n')
      .map((l) => l.replace(/^\s*[-*\d.)]+\s*/, '').trim())
      .filter((l) => l.endsWith('?') || l.length > 12)
      .slice(0, QUESTION_COUNT)
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('Model did not return usable questions. Try again.')
  }
  return questions.slice(0, QUESTION_COUNT).map(String)
}

async function gradeAnswer(modelId, notes, question, answer) {
  const prompt = `Grade this short answer using the notes. Be brief.

Notes:
"""
${notes.slice(0, 4000)}
"""

Question: ${question}
Student answer: ${answer}

Reply with ONLY JSON: {"score":0or1,"feedback":"one short sentence"}
score 1 = mostly correct, 0 = incorrect or empty.`

  console.log('\nGrading on-device...\n')
  const raw = await completeText(modelId, prompt)
  console.log('\n')

  try {
    const parsed = JSON.parse(stripJsonFence(raw))
    return {
      score: Number(parsed.score) === 1 ? 1 : 0,
      feedback: String(parsed.feedback || '').slice(0, 240)
    }
  } catch {
    const ok = /correct|yes|good|right/i.test(raw) && !/incorrect|wrong|no\b/i.test(raw)
    return { score: ok ? 1 : 0, feedback: raw.trim().slice(0, 240) }
  }
}

function parseArgs(argv) {
  const args = { notesPath: null, answersFile: null }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '-h' || a === '--help') return { help: true }
    if (a === '--answers-file') {
      args.answersFile = argv[++i]
      continue
    }
    if (!args.notesPath) args.notesPath = a
  }
  return args
}

async function main() {
  const parsed = parseArgs(process.argv)
  if (parsed.help || !parsed.notesPath) {
    usage()
    process.exit(parsed.help ? 0 : 1)
  }
  const notesPath = parsed.notesPath

  const abs = resolve(notesPath)
  if (!existsSync(abs)) {
    console.error(`File not found: ${abs}`)
    process.exit(1)
  }

  const notes = readFileSync(abs, 'utf8').trim()
  if (notes.length < 40) {
    console.error('Notes file is too short. Add more study material.')
    process.exit(1)
  }

  console.log('Offline Study Quiz')
  console.log(`QVAC SDK ${SDK_VERSION} · on-device only (loadModel + completion)`)
  console.log(`Notes: ${abs}`)
  console.log('Loading local model (first run may download weights)...')

  const modelId = await loadModel({
    modelSrc: LLAMA_3_2_1B_INST_Q4_0,
    onProgress: (p) => {
      if (typeof p?.percentage === 'number') {
        const line = `Download ${p.percentage.toFixed(0)}%`
        process.stderr.write(process.stderr.isTTY ? `\r${line}` : `${line}\n`)
        if (p.percentage >= 100) process.stderr.write('\n')
      }
    }
  })

  const presetAnswers = parsed.answersFile
    ? readFileSync(resolve(parsed.answersFile), 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    : null
  const rl = presetAnswers ? null : readline.createInterface({ input, output })
  let earned = 0

  try {
    const questions = await generateQuestions(modelId, notes)
    console.log(`\n--- Quiz (${questions.length} questions) ---\n`)

    for (let i = 0; i < questions.length; i++) {
      console.log(`Q${i + 1}. ${questions[i]}`)
      const answer = presetAnswers
        ? String(presetAnswers[i] || '').trim()
        : (await rl.question('Your answer: ')).trim()
      if (presetAnswers) console.log(`Your answer: ${answer}`)
      if (!answer) {
        console.log('Skipped — counted as incorrect.\n')
        continue
      }
      const { score, feedback } = await gradeAnswer(modelId, notes, questions[i], answer)
      earned += score
      console.log(`${score ? 'Correct' : 'Incorrect'}${feedback ? ` — ${feedback}` : ''}\n`)
    }

    console.log(`--- Score: ${earned}/${questions.length} ---`)
    console.log('All inference ran locally via QVAC. Nothing sent to a cloud AI API.')
  } finally {
    if (rl) rl.close()
    await unloadModel({ modelId })
  }
}

main().catch((err) => {
  console.error('✖', err?.message || err)
  process.exit(1)
})
