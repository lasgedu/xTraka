const ffmpeg = require('fluent-ffmpeg')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { AssemblyAI } = require('assemblyai')
const { THRESHOLDS } = require('./constants')

// ─── AssemblyAI client ───────────────────────────────────
const aai = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY })

// ─── Lazy-load ESM-only modules ─────────────────────────
let _franc = null
let _Filter = null

const loadFranc = async () => {
  if (!_franc) {
    const mod = await import('franc')
    _franc = mod.franc || mod.default
  }
  return _franc
}

const loadFilter = async () => {
  if (!_Filter) {
    const mod = await import('bad-words')
    _Filter = mod.default || mod.Filter || mod
  }
  return _Filter
}

// ─── Arabic → Latin transliteration ─────────────────────
const arabicToLatin = {
  'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'aa', 'ب': 'b', 'ت': 't', 'ث': 'th',
  'ج': 'j', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z',
  'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a',
  'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
  'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a', 'ة': 'a', 'ء': '', 'ئ': 'i',
  'ؤ': 'u', 'َ': 'a', 'ُ': 'u', 'ِ': 'i', 'ّ': '', 'ْ': '', 'ً': 'an',
  'ٌ': 'un', 'ٍ': 'in',
}

const hasArabicChars = (text) => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text)

const transliterateToLatin = (text) => {
  if (!text || !hasArabicChars(text)) return text

  // Only transliterate Arabic script → Latin, preserve everything else
  let result = ''
  for (const char of text) {
    if (arabicToLatin[char] !== undefined) {
      result += arabicToLatin[char]
    } else {
      result += char  // Keep ALL non-Arabic chars (Latin, Igbo diacritics, spaces, etc.)
    }
  }

  console.log('🔄 Transliterated Arabic to Latin:', result.trim())
  return result
}

// ─── Text similarity (fuzzy, diacritic-insensitive) ─────
const normalizeText = (text) =>
  transliterateToLatin(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics/accents
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()

const charSimilarity = (a, b) => {
  if (!a || !b) return 0
  const longer = a.length >= b.length ? a : b
  const shorter = a.length >= b.length ? b : a
  if (longer.length === 0) return 1

  // Simple character overlap ratio
  let matches = 0
  const longerChars = [...longer]
  const used = new Set()

  for (const ch of shorter) {
    for (let i = 0; i < longerChars.length; i++) {
      if (!used.has(i) && longerChars[i] === ch) {
        matches++
        used.add(i)
        break
      }
    }
  }

  return matches / longer.length
}

const tokenSimilarity = (source, transcript) => {
  const srcNorm = normalizeText(source)
  const transNorm = normalizeText(transcript)
  const srcTokens = srcNorm.split(' ').filter(Boolean)
  const transTokens = transNorm.split(' ').filter(Boolean)

  if (srcTokens.length === 0) return 0
  if (transTokens.length === 0) return 0

  // Debug logging
  console.log('🔍 Source text (normalized):', srcNorm)
  console.log('🔍 Transcript  (normalized):', transNorm)

  // ── Score 1: Word-level fuzzy matching ──
  let wordMatches = 0
  const used = new Set()

  for (const srcWord of srcTokens) {
    let bestScore = 0
    let bestIdx = -1

    for (let i = 0; i < transTokens.length; i++) {
      if (used.has(i)) continue

      // Exact match
      if (transTokens[i] === srcWord) {
        bestScore = 1
        bestIdx = i
        break
      }

      // Fuzzy match — threshold based on word length
      const sim = charSimilarity(srcWord, transTokens[i])
      const threshold = srcWord.length <= 3 ? 0.8 : 0.5  // stricter for short words
      if (sim > bestScore && sim >= threshold) {
        bestScore = sim
        bestIdx = i
      }
    }

    if (bestIdx >= 0) {
      wordMatches++
      used.add(bestIdx)
    }
  }

  const wordScore = Math.round((wordMatches / srcTokens.length) * 100)

  // ── Score 2: Whole-text character overlap ──
  // Catches cases where word boundaries differ but characters are right
  const textScore = Math.round(charSimilarity(srcNorm.replace(/\s/g, ''), transNorm.replace(/\s/g, '')) * 100)

  // Take the better of the two scores
  const finalScore = Math.max(wordScore, textScore)

  console.log(`🔍 Word match: ${wordMatches}/${srcTokens.length} = ${wordScore}% | Char overlap: ${textScore}% | Final: ${finalScore}%`)
  return finalScore
}

// ─── AssemblyAI transcription ───────────────────────────
const transcribeAudio = async (audioBuffer, sourceText) => {
  if (!audioBuffer || !audioBuffer.length) {
    return { transcript: '', error: 'No audio buffer provided' }
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xtraka-aai-'))
  const tempFile = path.join(tempDir, 'audio.webm')
  fs.writeFileSync(tempFile, audioBuffer)

  // Extract unique words from source text as boost hints
  // Include BOTH normalized and original words for better language-specific recognition
  const normalizedWords = normalizeText(sourceText || '')
    .split(' ')
    .filter((w) => w.length >= 2)

  const originalWords = (sourceText || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter((w) => w.length >= 2)

  const boostWords = [...new Set([...normalizedWords, ...originalWords])]

  console.log(`🎯 Word boost (${boostWords.length} words):`, boostWords.slice(0, 15).join(', '))

  try {
    const config = {
      audio: tempFile,
      speech_models: ['universal-3-pro', 'universal-2'],
    }

    // Boost with source text words — guides the AI to recognize language-specific words
    if (boostWords.length > 0) {
      config.word_boost = boostWords
      config.boost_param = 'high'
    }

    // Pass 1: No language setting — let word_boost guide the output
    let result = await aai.transcripts.transcribe(config)

    // Pass 2: If empty, retry with language_detection as fallback
    if (!result.text || result.status === 'error') {
      console.log('🔄 Pass 1 empty, retrying with language_detection...')
      config.language_detection = true
      result = await aai.transcripts.transcribe(config)
    }

    if (result.status === 'error') {
      return { transcript: '', detectedLang: null, error: result.error || 'Transcription failed' }
    }

    // Get detected language
    const detectedLang = result.language_code || null
    console.log(`🌍 AssemblyAI detected language: ${detectedLang}`)

    return { transcript: result.text || '', detectedLang, error: null }
  } catch (error) {
    console.error('AssemblyAI transcription error:', error.message)
    return { transcript: '', error: error.message }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

// ─── Language detection & profanity ─────────────────────
const detectLanguage = async (text) => {
  if (!text || text.trim().length < 5) {
    return { language: 'und', confidence: 0 }
  }
  const franc = await loadFranc()
  const lang = franc(text)
  return { language: lang, confidence: lang === 'und' ? 0 : 80 }
}

const detectProfanity = async (text) => {
  try {
    const FilterClass = await loadFilter()
    const filter = new FilterClass()
    const words = filter.list || []
    const lower = (text || '').toLowerCase()
    const found = words.filter((word) => lower.includes(word))
    return { detected: found.length > 0, words: found }
  } catch {
    return { detected: false, words: [] }
  }
}

// ─── Audio analysis (ffprobe) ───────────────────────────
const analyzeAudio = async (buffer) => {
  if (!buffer || !buffer.length) {
    return {
      audioQuality: 'missing',
      audioDuration: 0,
      audioBitrate: 0,
      audioSampleRate: 0,
      audioCorrupted: true,
    }
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xtraka-'))
  const tempFile = path.join(tempDir, 'audio-upload')
  fs.writeFileSync(tempFile, buffer)

  try {
    const info = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(tempFile, (err, data) => {
        if (err) return reject(err)
        return resolve(data)
      })
    })

    const stream = info.streams && info.streams[0] ? info.streams[0] : {}
    const audioDuration = Number(info.format?.duration || 0)
    const audioBitrate = Number(info.format?.bit_rate || 0)
    const audioSampleRate = Number(stream.sample_rate || 0)

    return {
      audioQuality: audioDuration > 0 ? 'ok' : 'invalid',
      audioDuration,
      audioBitrate,
      audioSampleRate,
      audioCorrupted: audioDuration === 0,
    }
  } catch {
    return {
      audioQuality: 'error',
      audioDuration: 0,
      audioBitrate: 0,
      audioSampleRate: 0,
      audioCorrupted: true,
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

// ─── Quick initial checks (runs synchronously at submit) ─
const runQuickChecks = async ({ audioBuffer }) => {
  const audioMeta = await analyzeAudio(audioBuffer)
  return { audioMeta }
}

// ─── Full Whisper validation (runs async after submit) ──
const runWhisperValidation = async (submission, sourceText) => {
  const Submission = require('../models/Submission')
  const Task = require('../models/Task')
  const User = require('../models/User')
  const { calculateTrustScore, getBadgeForTrust } = require('./helpers')

  try {
    const task = await Task.findById(submission.taskId)
    const textToCompare = sourceText || task?.sourceText || ''

    // 1. Transcribe audio with AssemblyAI
    const { transcript, detectedLang, error: transcribeError } = await transcribeAudio(submission._audioBuffer, textToCompare)

    if (transcribeError && !transcript) {
      // Transcription failed — leave as pending for manual review
      await Submission.findByIdAndUpdate(submission._id, {
        $set: {
          'aiVerification.audioTranscription': '',
          'aiVerification.transcriptionMatch': false,
          'aiVerification.verifiedAt': new Date(),
          'aiVerification.modelVersion': 'assemblyai-v1',
          feedback: `AI validation could not process audio: ${transcribeError}`,
        },
      })
      return
    }

    // 2. Compare transcript with source text — this is the sole accuracy metric
    const textMatch = tokenSimilarity(textToCompare, transcript)
    const similarity = Math.min(100, Math.max(0, textMatch))

    console.log(`📊 Final similarity: ${similarity}% (pure word match, no language penalty)`)

    // 3. Profanity check on transcript (language detection removed)
    const profanity = await detectProfanity(transcript)

    // 5. Determine status (threshold: 65%)
    const newStatus = similarity >= 65 ? 'approved' : 'rejected'
    const rejectionReason =
      newStatus === 'rejected'
        ? `Reading accuracy too low (${similarity}%). At least 65% match required.`
        : ''

    // 5. Update submission
    await Submission.findByIdAndUpdate(submission._id, {
      $set: {
        status: newStatus,
        rejectionReason,
        'aiVerification.audioTranscription': transcript,
        'aiVerification.transcriptionMatch': similarity >= 50,
        'aiVerification.overallConfidence': similarity,
        'aiVerification.languageDetected': detectedLang || 'unknown',
        'aiVerification.languageConfidence': detectedLang ? 80 : 0,
        'aiVerification.profanityDetected': profanity.detected,
        'aiVerification.profanityWords': profanity.words,
        'aiVerification.verifiedAt': new Date(),
        'aiVerification.modelVersion': 'assemblyai-v1',
      },
    })

    // 6. Update user stats
    const user = await User.findOne({ walletHashIndex: submission.userHash })
    if (user) {
      user.pendingSubmissions = Math.max(0, user.pendingSubmissions - 1)
      user.pendingRewards = Math.max(0, user.pendingRewards - (task?.rewardAmount || 0))

      if (newStatus === 'approved') {
        user.approvedSubmissions += 1
        user.approvedRewards += task?.rewardAmount || 0
      } else {
        user.rejectedSubmissions += 1
      }

      user.trustScore = await calculateTrustScore(user.walletHashIndex)
      user.currentBadge = getBadgeForTrust(user.approvedSubmissions)
      await user.save()
    }

    console.log(
      `✅ Whisper validation done: submission=${submission._id} similarity=${similarity}% status=${newStatus}`
    )
  } catch (error) {
    console.error(`❌ Whisper validation failed for submission=${submission._id}:`, error.message)
  }
}

// ─── Legacy sync verification (kept for non-audio tasks) ─
const normalizeExpectedLanguage = (value) => {
  const lower = (value || '').toLowerCase()
  if (!lower) return ''
  if (lower === 'igbo') return 'ibo'
  return lower
}

const runVerification = async ({ text, expectedLanguage, minTextLength, audioRequired, audioBuffer }) => {
  const audioMeta = await analyzeAudio(audioBuffer)

  const normalizedExpected = normalizeExpectedLanguage(expectedLanguage)
  const language = await detectLanguage(text)
  const profanity = await detectProfanity(text)
  const textLength = (text || '').trim().length
  const textComplete = textLength >= (minTextLength || 0)

  const languageMatch = normalizedExpected ? language.language === normalizedExpected : true
  const languageScore = languageMatch ? 30 : 0
  const profanityScore = profanity.detected ? 0 : 20
  const completenessScore = textComplete ? 20 : 0
  const audioScore = audioRequired ? (audioMeta.audioCorrupted ? 0 : 30) : 30

  const overallConfidence = languageScore + profanityScore + completenessScore + audioScore

  const aiVerification = {
    languageDetected: language.language,
    languageConfidence: language.confidence,
    expectedLanguage: normalizedExpected,
    languageMatch,
    textLength,
    textComplete,
    profanityDetected: profanity.detected,
    profanityWords: profanity.words,
    audioQuality: audioMeta.audioQuality,
    audioDuration: audioMeta.audioDuration,
    audioBitrate: audioMeta.audioBitrate,
    audioSampleRate: audioMeta.audioSampleRate,
    audioCorrupted: audioMeta.audioCorrupted,
    overallConfidence,
    verifiedAt: new Date(),
    modelVersion: 'v1',
  }

  const status =
    overallConfidence >= THRESHOLDS.AUTO_APPROVE
      ? 'approved'
      : overallConfidence >= THRESHOLDS.REVIEW
        ? 'pending'
        : 'rejected'

  return { aiVerification, status }
}

module.exports = {
  runVerification,
  runQuickChecks,
  runWhisperValidation,
  transcribeAudio,
  tokenSimilarity,
  detectLanguage,
  detectProfanity,
}
