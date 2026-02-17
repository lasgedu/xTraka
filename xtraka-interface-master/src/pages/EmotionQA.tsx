// ... imports remain the same
import { useState, useRef, useCallback, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAuth } from '../hooks/useAuth'
import './emotion-qa.css'
import './submit-prompt.css'
import './dashboard.css'
import { Sidebar } from '../components/Sidebar'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const EMOTIONS = ['Anger', 'Neutral', 'Excitement', 'Sad'] as const
type Emotion = typeof EMOTIONS[number]

interface Task {
    _id: string
    title: string
    sourceAudioPath?: string
    audioRequired: boolean
    category: string
    language: string
}

interface Progress {
    completedToday: number
    dailyLimit: number
    limitReached: boolean
}

export function EmotionQA() {
    const { language } = useParams<{ language: string }>()
    const { token, isAuthenticated, authenticating } = useAuth()

    const [currentTask, setCurrentTask] = useState<Task | null>(null)
    const [selectedEmotion, setSelectedEmotion] = useState<Emotion | null>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [loading, setLoading] = useState(true)
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
    const [progress, setProgress] = useState<Progress>({ completedToday: 0, dailyLimit: 10, limitReached: false })

    const audioRef = useRef<HTMLAudioElement | null>(null)

    const fetchNextTask = useCallback(() => {
        if (!token || !language) return
        setLoading(true)
        // Ensure category matches what's saved in DB ('emotion_qa')
        fetch(`${API}/tasks/next/${language}?category=emotion_qa`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(data => {
                if (data.task) {
                    setCurrentTask(data.task)
                } else {
                    setCurrentTask(null)
                }

                if (data.progress) {
                    setProgress({
                        completedToday: data.progress.completedToday || 0,
                        dailyLimit: data.progress.dailyLimit || 10,
                        limitReached: data.progress.limitReached || false,
                    })
                }
                setLoading(false)
            })
            .catch((err) => {
                console.error(err)
                setLoading(false)
            })
    }, [token, language])

    // Initial fetch
    useEffect(() => {
        if (isAuthenticated && token) {
            fetchNextTask()
        }
    }, [isAuthenticated, token, fetchNextTask])

    const playAudio = useCallback(() => {
        if (!audioRef.current || !currentTask?.sourceAudioPath) {
            setStatus({ type: 'error', message: 'No audio available for this task.' })
            return
        }

        if (isPlaying) {
            audioRef.current.pause()
            setIsPlaying(false)
        } else {
            // Construct GridFS URL
            audioRef.current.src = `${API}/uploads/${currentTask.sourceAudioPath}`
            audioRef.current.play()
                .then(() => setIsPlaying(true))
                .catch(e => {
                    console.error("Audio playback error:", e)
                    setIsPlaying(false)
                    setStatus({ type: 'error', message: 'Failed to play audio.' })
                })
        }
    }, [currentTask, isPlaying])

    const handleSubmit = async () => {
        if (!selectedEmotion) {
            setStatus({ type: 'error', message: 'Please select an emotion first.' })
            return
        }
        if (!currentTask) return

        setSubmitting(true)
        setStatus(null)

        try {
            const res = await fetch(`${API}/submissions/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    taskId: currentTask._id,
                    userHash: '', // Handled by backend from token
                    status: 'pending',
                    textContent: selectedEmotion, // Submit selected emotion as textContent
                })
            })

            if (!res.ok) throw new Error('Submission failed')

            setStatus({ type: 'success', message: 'Answer submitted! Loading next…' })
            setSelectedEmotion(null)
            setIsPlaying(false)
            if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current.currentTime = 0
            }

            // Wait a bit then fetch next
            setTimeout(() => {
                setStatus(null)
                fetchNextTask()
            }, 1000)

        } catch (err) {
            console.error(err)
            setStatus({ type: 'error', message: 'Submission failed. Please try again.' })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="submit-shell">
            <Sidebar />
            <div className="submit-main">
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

                <main className="eqa-content">
                    {!isAuthenticated ? (
                        <div className="eqa-center">
                            <div className="eqa-done-icon">🔗</div>
                            <h2 className="eqa-title">{authenticating ? 'Signing In…' : 'Connect Your Wallet'}</h2>
                            <p className="eqa-subtitle">{authenticating ? 'Please sign the message in your wallet.' : 'Connect your wallet to start identifying emotions.'}</p>
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                                <ConnectButton />
                            </div>
                        </div>
                    ) : loading ? (
                        <div className="eqa-center">
                            <h2 className="eqa-title">Loading Tasks...</h2>
                        </div>
                    ) : (progress.limitReached || !currentTask) ? (
                        /* Empty State / Limit Reached - Matches Requested Screenshot UI */
                        <div className="eqa-center" style={{
                            background: '#0f172a', // Ensure dark background
                            minHeight: '60vh',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}>
                            {/* Icon or similar could go here if needed, keeping it simple as per screenshot text */}
                            <h2 className="eqa-title" style={{ fontSize: '24px', marginBottom: '8px' }}>
                                No more Tasks for Today
                            </h2>
                            <p className="eqa-subtitle" style={{ color: 'rgba(255,255,255,0.7)' }}>
                                Check back tomorrow for more
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="eqa-center">
                                <h1 className="eqa-title">Listen to the Audio and identify the Emotion</h1>

                                <button
                                    type="button"
                                    className={`eqa-play-btn ${isPlaying ? 'playing' : ''}`}
                                    onClick={playAudio}
                                    aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
                                >
                                    {isPlaying ? (
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <rect x="6" y="4" width="4" height="16" rx="1" />
                                            <rect x="14" y="4" width="4" height="16" rx="1" />
                                        </svg>
                                    ) : (
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    )}
                                </button>

                                <div className="eqa-emotions">
                                    {EMOTIONS.map((emotion) => (
                                        <button
                                            key={emotion}
                                            type="button"
                                            className={`eqa-emotion-btn ${selectedEmotion === emotion ? 'selected' : ''}`}
                                            onClick={() => setSelectedEmotion(emotion)}
                                        >
                                            {emotion}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {status && (
                                <div className={`eqa-status ${status.type}`}>
                                    {status.message}
                                </div>
                            )}

                            <div className="submit-bottom-bar">
                                <button
                                    type="button"
                                    className={`submit-btn ${submitting ? 'submitting' : ''}`}
                                    onClick={handleSubmit}
                                    disabled={submitting || !selectedEmotion}
                                >
                                    {submitting ? 'Submitting…' : 'Submit'}
                                </button>
                            </div>

                            <audio
                                ref={audioRef}
                                onEnded={() => setIsPlaying(false)}
                                onError={() => {
                                    setIsPlaying(false)
                                    setStatus({ type: 'error', message: 'Error playing audio file' })
                                }}
                                style={{ display: 'none' }}
                            />
                        </>
                    )}
                </main>
            </div>
        </div>
    )
}
