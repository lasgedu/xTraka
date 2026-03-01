import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAuth } from '../hooks/useAuth'
import './submit-prompt.css'
import './dashboard.css'
import { Sidebar } from '../components/Sidebar'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

interface Task {
    _id: string
    language: string
    title: string
    description: string
    sourceText: string
    rewardAmount: number
    audioRequired: boolean
}

interface Progress {
    completedToday: number
    completedTodayLanguage: number
    dailyLimit: number
    remaining: number
    totalForLanguage: number
    completedForLanguage: number
    remainingForLanguage: number
    limitReached: boolean
}

export function SubmitPrompt() {
    const { language } = useParams<{ language: string }>()
    const { token, isAuthenticated, authenticating, retry } = useAuth()
    const [task, setTask] = useState<Task | null>(null)
    const [progress, setProgress] = useState<Progress | null>(null)
    const [loading, setLoading] = useState(true)

    // Audio state
    const [isRecording, setIsRecording] = useState(false)
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
    const [audioUrl, setAudioUrl] = useState<string | null>(null)
    const [recordingTime, setRecordingTime] = useState(0)
    const [audioDuration, setAudioDuration] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)

    // Submit state
    const [submitting, setSubmitting] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

    const mediaRecorder = useRef<MediaRecorder | null>(null)
    const audioChunks = useRef<Blob[]>([])
    const timerRef = useRef<number | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const recordingTimeRef = useRef(0)

    const fetchNextPrompt = useCallback(() => {
        if (!language || !token) return

        setLoading(true)
        fetch(`${API}/tasks/next/${language}?category=prompt`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((data) => {
                setTask(data.task || null)
                setProgress(data.progress || null)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [language, token])

    useEffect(() => {
        if (isAuthenticated) {
            fetchNextPrompt()
        } else {
            setLoading(false)
        }
    }, [isAuthenticated, fetchNextPrompt])

    // Recording
    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const recorder = new MediaRecorder(stream)
            audioChunks.current = []

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.current.push(e.data)
            }

            recorder.onstop = () => {
                const blob = new Blob(audioChunks.current, { type: 'audio/webm' })
                setAudioBlob(blob)
                const url = URL.createObjectURL(blob)
                setAudioUrl(url)
                setAudioDuration(recordingTimeRef.current)
                stream.getTracks().forEach((t) => t.stop())
            }

            mediaRecorder.current = recorder
            recorder.start(200)
            setIsRecording(true)
            setRecordingTime(0)
            recordingTimeRef.current = 0

            timerRef.current = window.setInterval(() => {
                recordingTimeRef.current += 1
                setRecordingTime((prev) => prev + 1)
            }, 1000)
        } catch {
            setStatus({ type: 'error', message: 'Microphone access denied. Please allow microphone access.' })
        }
    }, [])

    const stopRecording = useCallback(() => {
        if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
            mediaRecorder.current.requestData() // Flush current buffer
            setTimeout(() => {
                if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
                    mediaRecorder.current.stop()
                }
            }, 500) // 500ms delay to ensure capture
        }
        setIsRecording(false)
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
    }, [])

    const deleteRecording = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.currentTime = 0
        }
        if (audioUrl) URL.revokeObjectURL(audioUrl)
        setAudioBlob(null)
        setAudioUrl(null)
        setAudioDuration(0)
        setRecordingTime(0)
        setIsPlaying(false)
        audioChunks.current = []
    }, [audioUrl])

    const togglePlayback = useCallback(() => {
        if (!audioRef.current || !audioUrl) return
        if (isPlaying) {
            audioRef.current.pause()
            setIsPlaying(false)
        } else {
            audioRef.current.src = audioUrl
            audioRef.current.play()
            setIsPlaying(true)
        }
    }, [audioUrl, isPlaying])

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0')
        const s = (seconds % 60).toString().padStart(2, '0')
        return `${m}:${s}`
    }

    // Submit then auto-load next
    const handleSubmit = async () => {
        if (!task || !token) return

        if (!audioBlob) {
            setStatus({ type: 'error', message: 'Please record your reading before submitting.' })
            return
        }

        setSubmitting(true)
        setStatus(null)

        try {
            const formData = new FormData()
            formData.append('taskId', task._id)
            formData.append('textContent', task.sourceText)
            formData.append('audio', audioBlob, 'recording.webm')

            const res = await fetch(`${API}/submissions/submit`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            })

            const data = await res.json()

            if (res.ok) {
                setStatus({ type: 'success', message: 'Recording submitted! Loading next prompt…' })
                deleteRecording()
                // Auto-load next prompt after a brief delay
                setTimeout(() => {
                    setStatus(null)
                    fetchNextPrompt()
                }, 1500)
            } else {
                setStatus({ type: 'error', message: data.message || 'Submission failed.' })
            }
        } catch {
            setStatus({ type: 'error', message: 'Network error. Please try again.' })
        } finally {
            setSubmitting(false)
        }
    }

    const langDisplay = language ? language.charAt(0).toUpperCase() + language.slice(1) : ''

    return (
        <div className="submit-shell">
            {/* Sidebar */}
            <Sidebar />

            {/* Main */}
            <div className="submit-main">
                {/* Tracking bar at the top */}
                {progress && (
                    <div className="submit-tracking-bar">
                        <div className="submit-tracking-row">
                            <span className="submit-counter">
                                {progress.completedToday}/{progress.dailyLimit}
                            </span>
                        </div>
                        <div className="submit-progress-bar">
                            <div
                                className="submit-progress-fill"
                                style={{ width: `${Math.min(100, (progress.completedToday / progress.dailyLimit) * 100)}%` }}
                            />
                        </div>
                    </div>
                )}

                <main className="submit-content">
                    {!isAuthenticated ? (
                        <div className="submit-center-content">
                            <div className="submit-done-icon">🔗</div>
                            <h2 className="submit-title">{authenticating ? 'Signing In…' : 'Connect Your Wallet'}</h2>
                            <p className="submit-subtitle">{authenticating ? 'Please sign the message in your wallet to authenticate.' : 'Connect your wallet to start completing prompts and earning rewards.'}</p>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
                                <ConnectButton />
                                {!authenticating && (
                                    <button
                                        onClick={retry}
                                        style={{
                                            padding: '8px 16px',
                                            background: 'rgba(59, 130, 246, 0.1)',
                                            border: '1px solid rgba(59, 130, 246, 0.3)',
                                            borderRadius: '8px',
                                            color: '#60a5fa',
                                            cursor: 'pointer',
                                            fontSize: '14px'
                                        }}
                                    >
                                        Retry Authentication
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : loading ? (
                        <div className="submit-center-content">
                            <div className="submit-spinner" />
                            <span className="submit-subtitle">Loading prompt…</span>
                        </div>
                    ) : progress?.limitReached ? (
                        <div className="submit-center-content">
                            <h2 className="submit-title">No more Tasks for Today</h2>
                            <p className="submit-subtitle">Check back tomorrow for more</p>
                        </div>
                    ) : !task ? (
                        <div className="submit-center-content">
                            <h2 className="submit-title">All {langDisplay} Prompts Complete</h2>
                            <p className="submit-subtitle">
                                {progress ? `${progress.completedForLanguage}/${progress.totalForLanguage} completed. ` : ''}
                                Check back later for new prompts!
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="submit-center-content">
                                {/* Title */}
                                <h1 className="submit-title">Record the following prompt</h1>
                                <p className="submit-time-limit">Time Limit 20s</p>

                                {/* Prompt text */}
                                <p className="submit-prompt-text">{task.sourceText}</p>

                                {/* Mic / recorder area */}
                                <div className="submit-recorder">
                                    {!audioBlob ? (
                                        <>
                                            <button
                                                type="button"
                                                className={`submit-mic-btn ${isRecording ? 'recording' : ''}`}
                                                onClick={isRecording ? stopRecording : startRecording}
                                                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                                            >
                                                {isRecording ? (
                                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                                        <rect x="6" y="6" width="12" height="12" rx="2" />
                                                    </svg>
                                                ) : (
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                                        <line x1="12" y1="19" x2="12" y2="23" />
                                                        <line x1="8" y1="23" x2="16" y2="23" />
                                                    </svg>
                                                )}
                                            </button>
                                            {isRecording && (
                                                <span className="submit-record-timer">{formatTime(recordingTime)}</span>
                                            )}
                                        </>
                                    ) : (
                                        <div className="submit-playback">
                                            <button type="button" className="submit-play-btn" onClick={togglePlayback} aria-label={isPlaying ? 'Pause' : 'Play'}>
                                                {isPlaying ? (
                                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                                        <rect x="6" y="4" width="4" height="16" />
                                                        <rect x="14" y="4" width="4" height="16" />
                                                    </svg>
                                                ) : (
                                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                                        <polygon points="5 3 19 12 5 21 5 3" />
                                                    </svg>
                                                )}
                                            </button>
                                            <div className="submit-playback-info">
                                                <span className="submit-playback-name">Your Recording</span>
                                                <span className="submit-playback-duration">{formatTime(audioDuration)}</span>
                                            </div>
                                            <button type="button" className="submit-delete-btn" onClick={deleteRecording} aria-label="Delete recording">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* No more tasks message (shown when limit reached while task is present) */}
                                {progress && progress.remaining <= 0 && (
                                    <div className="submit-no-tasks-msg">
                                        <p>No more Tasks for Today</p>
                                        <p>Check back tomorrow for more</p>
                                    </div>
                                )}
                            </div>

                            {/* Status messages */}
                            {status && (
                                <div className={`submit-status ${status.type}`}>
                                    {status.message}
                                </div>
                            )}

                            {/* Bottom bar */}
                            <div className="submit-bottom-bar">
                                <button
                                    type="button"
                                    className={`submit-btn ${submitting ? 'submitting' : ''}`}
                                    onClick={handleSubmit}
                                    disabled={submitting || !audioBlob}
                                >
                                    {submitting ? 'Submitting…' : 'Submit'}
                                </button>
                            </div>

                            <audio
                                ref={audioRef}
                                onEnded={() => setIsPlaying(false)}
                                style={{ display: 'none' }}
                            />
                        </>
                    )}
                </main>
            </div>
        </div>
    )
}
