const Submission = require('../models/Submission')
const Task = require('../models/Task')
const User = require('../models/User')
const { getGridFSBucket } = require('../config/database')
const { transcribeAudio, tokenSimilarity, detectLanguage, detectProfanity } = require('./aiVerification')
const { calculateTrustScore, getBadgeForTrust } = require('./helpers')

let isProcessing = false

// Read audio file from GridFS into a buffer
const readAudioFromGridFS = (fileId) => {
    return new Promise((resolve, reject) => {
        const bucket = getGridFSBucket()
        if (!bucket) return reject(new Error('GridFS bucket not ready'))

        const chunks = []
        const stream = bucket.openDownloadStream(fileId)

        stream.on('data', (chunk) => chunks.push(chunk))
        stream.on('end', () => resolve(Buffer.concat(chunks)))
        stream.on('error', reject)
    })
}

// Process a single pending submission
const processSubmission = async (submission) => {
    try {
        const task = await Task.findById(submission.taskId)
        if (!task) {
            console.log(`⚠️ Queue: Task not found for submission ${submission._id}, marking rejected`)
            await Submission.findByIdAndUpdate(submission._id, {
                $set: { status: 'rejected', rejectionReason: 'Task not found' },
            })
            return
        }

        // Read audio from GridFS
        if (!submission.audioFileId) {
            console.log(`⚠️ Queue: No audio file for submission ${submission._id}, marking rejected`)
            await Submission.findByIdAndUpdate(submission._id, {
                $set: { status: 'rejected', rejectionReason: 'No audio file found' },
            })
            return
        }

        const audioBuffer = await readAudioFromGridFS(submission.audioFileId)
        const sourceText = task.sourceText || ''

        console.log(`🔄 Queue: Processing submission ${submission._id} (${task.language})`)

        // 1. Transcribe
        const { transcript, detectedLang, error: transcribeError } = await transcribeAudio(audioBuffer, sourceText)

        if (transcribeError && !transcript) {
            console.log(`⚠️ Queue: Transcription failed for ${submission._id}: ${transcribeError}`)
            await Submission.findByIdAndUpdate(submission._id, {
                $set: {
                    'aiVerification.audioTranscription': '',
                    'aiVerification.transcriptionMatch': false,
                    'aiVerification.verifiedAt': new Date(),
                    'aiVerification.modelVersion': 'assemblyai-v1',
                    feedback: `AI validation could not process audio: ${transcribeError}`,
                },
            })
            return // Will be retried next cycle
        }

        // 2. Compare text
        const textMatch = tokenSimilarity(sourceText, transcript)

        // 3. Language detection — strict match only
        const expectedLangs = {
            igbo: ['ig'],
            hausa: ['ha', 'ar'],
            pidgin: ['en', 'pcm'],
        }
        const taskLang = (task.language || '').toLowerCase()
        const accepted = expectedLangs[taskLang] || []
        const langIsCorrect = accepted.includes(detectedLang)
        const langAdjust = langIsCorrect ? 0 : -15

        const similarity = Math.min(100, Math.max(0, textMatch + langAdjust))
        console.log(`🌍 Language: detected=${detectedLang} expected=${taskLang} correct=${langIsCorrect} adjust=${langAdjust}`)
        console.log(`📊 Final: textMatch=${textMatch}% + langAdjust=${langAdjust} = ${similarity}%`)

        // 3. Language & profanity
        const language = await detectLanguage(transcript)
        const profanity = await detectProfanity(transcript)

        // 4. Determine status (threshold: 65%)
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
                'aiVerification.transcriptionMatch': similarity >= 65,
                'aiVerification.overallConfidence': similarity,
                'aiVerification.languageDetected': language.language,
                'aiVerification.languageConfidence': language.confidence,
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
            user.pendingRewards = Math.max(0, user.pendingRewards - (task.rewardAmount || 0))

            if (newStatus === 'approved') {
                user.approvedSubmissions += 1
                user.approvedRewards += task.rewardAmount || 0
            } else {
                user.rejectedSubmissions += 1
            }

            user.trustScore = await calculateTrustScore(user.walletHashIndex)
            user.currentBadge = getBadgeForTrust(user.approvedSubmissions)
            await user.save()
        }

        console.log(
            `✅ Queue: submission=${submission._id} similarity=${similarity}% status=${newStatus}`
        )
    } catch (error) {
        console.error(`❌ Queue: Error processing submission ${submission._id}:`, error.message)
    }
}

// Main queue loop — runs every 15s
const processQueue = async () => {
    if (isProcessing) return
    isProcessing = true

    try {
        // Find pending submissions that haven't been verified yet
        const pending = await Submission.find({
            status: 'pending',
            'aiVerification.verifiedAt': { $exists: false },
        })
            .sort({ createdAt: 1 })
            .limit(5)

        // Also find pending submissions that failed (verifiedAt exists but still pending)
        const stuck = await Submission.find({
            status: 'pending',
            'aiVerification.verifiedAt': { $exists: true },
            'aiVerification.audioTranscription': '',
        })
            .sort({ createdAt: 1 })
            .limit(3)

        const toProcess = [...pending, ...stuck]

        if (toProcess.length > 0) {
            console.log(`📋 Queue: Found ${toProcess.length} submissions to validate`)
        }

        for (const submission of toProcess) {
            await processSubmission(submission)
        }
    } catch (error) {
        console.error('❌ Queue loop error:', error.message)
    } finally {
        isProcessing = false
    }
}

// Start the queue worker
let intervalId = null

const startValidationQueue = () => {
    console.log('🚀 Validation queue worker started (checking every 15s)')
    processQueue() // Run immediately on start
    intervalId = setInterval(processQueue, 15000)
}

const stopValidationQueue = () => {
    if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
        console.log('⏹️ Validation queue worker stopped')
    }
}

module.exports = { startValidationQueue, stopValidationQueue }
