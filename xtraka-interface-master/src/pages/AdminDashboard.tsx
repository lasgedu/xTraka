import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import './admin-dashboard.css'
import './dashboard.css' // Check if any dashboard styles are needed

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

interface User {
    _id: string
    walletHashIndex: string
    trustScore: number
    totalSubmissions: number
    approvedSubmissions: number
    rejectedSubmissions: number
    pendingSubmissions: number
    currentBadge: string
    lastLoginAt: string
}

interface Task {
    _id: string
    title: string
    language: string
    category: string
    type: string
    rewardAmount: number
    isActive: boolean
    sourceText?: string
    sourceAudioPath?: string
    description?: string
    createdAt: string
    submissionStats?: {
        total: number
        approved: number
        rejected: number
        pending: number
    }
}

interface Submission {
    _id: string
    taskId: {
        _id: string
        title: string
        language: string
    }
    userHash: string
    status: 'pending' | 'approved' | 'rejected'
    aiVerification: {
        overallConfidence?: number
        transcriptionMatch?: boolean
    }
    submittedAt: string
    audioPath?: string
    textContent?: string
}

export function AdminDashboard() {

    const navigate = useNavigate()
    const [token, setToken] = useState(localStorage.getItem('admin_token'))
    const [username, setUsername] = useState(localStorage.getItem('admin_username'))
    const [activeTab, setActiveTab] = useState<'users' | 'submissions' | 'tasks' | 'create-task'>('submissions')
    const [users, setUsers] = useState<User[]>([])
    const [tasks, setTasks] = useState<Task[]>([])
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    // Task filters
    const [taskCategoryFilter, setTaskCategoryFilter] = useState<string>('')
    const [taskLanguageFilter, setTaskLanguageFilter] = useState<string>('')
    const [taskStatusFilter, setTaskStatusFilter] = useState<string>('')

    // Task Creation State
    const [taskType, setTaskType] = useState<'prompt' | 'emotion'>('prompt')
    const [taskLanguage, setTaskLanguage] = useState('igbo')
    const [taskReward, setTaskReward] = useState(0.2)
    const [sourceText, setSourceText] = useState('')
    const [audioRequired, setAudioRequired] = useState(true)
    const [taskCreating, setTaskCreating] = useState(false)
    const [expectedAnswer, setExpectedAnswer] = useState('')

    // Audio Recorder State (Removing unused vars)
    const [audioFile, setAudioFile] = useState<File | null>(null)

    useEffect(() => {
        const storedToken = localStorage.getItem('admin_token')
        if (!storedToken) {
            navigate('/admin/login')
        } else {
            setToken(storedToken)
            setUsername(localStorage.getItem('admin_username'))
        }
    }, [navigate])

    const handleLogout = () => {
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_username')
        navigate('/admin/login')
    }

    const fetchData = useCallback(() => {
        if (!token) return
        setLoading(true)

        let url = ''
        if (activeTab === 'users') {
            url = `${API}/admin/users?page=${page}`
        } else if (activeTab === 'tasks') {
            const params = new URLSearchParams({ page: page.toString() })
            if (taskCategoryFilter) params.append('category', taskCategoryFilter)
            if (taskLanguageFilter) params.append('language', taskLanguageFilter)
            if (taskStatusFilter) params.append('isActive', taskStatusFilter)
            url = `${API}/admin/tasks?${params.toString()}`
        } else {
            url = `${API}/admin/submissions?status=pending&page=${page}`
        }

        fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((data) => {
                if (activeTab === 'users') {
                    setUsers(data.users || [])
                    setTotalPages(data.pagination?.pages || 1)
                } else if (activeTab === 'tasks') {
                    setTasks(data.tasks || [])
                    setTotalPages(data.pagination?.pages || 1)
                } else {
                    setSubmissions(data.submissions || [])
                    setTotalPages(data.pagination?.pages || 1)
                }
                setLoading(false)
            })
            .catch((err) => {
                console.error(err)
                setLoading(false)
            })
    }, [token, activeTab, page, taskCategoryFilter, taskLanguageFilter, taskStatusFilter])



    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault()
        setTaskCreating(true)

        const formData = new FormData()

        // Generate default title based on task type
        const defaultTitle = taskType === 'prompt'
            ? `Read this ${taskLanguage} text`
            : `Identify the emotion in this ${taskLanguage} audio`

        formData.append('title', defaultTitle)
        formData.append('language', taskLanguage)
        formData.append('rewardAmount', taskReward.toString())

        if (taskType === 'prompt') {
            formData.append('type', 'text+audio')
            formData.append('category', 'general')
            formData.append('sourceText', sourceText)
            formData.append('audioRequired', audioRequired.toString())
            formData.append('minTextLength', '10')
            formData.append('maxTextLength', '500')
            formData.append('minAudioDuration', '2')
            formData.append('maxAudioDuration', '30')
        } else {
            formData.append('type', 'text') // The submission will be text (selected emotion)
            formData.append('category', 'emotion_qa') // Emotion QA category
            formData.append('description', 'Emotion recognition task') // Generic description
            formData.append('minTextLength', '1') // Just the emotion word
            formData.append('maxTextLength', '50')
            formData.append('audioRequired', 'false')

            if (expectedAnswer) {
                formData.append('expectedAnswer', expectedAnswer)
            } else {
                alert('Please select the correct emotion')
                setTaskCreating(false)
                return
            }

            if (audioFile) {
                formData.append('audio', audioFile)
            } else {
                alert('Please upload the emotion audio file')
                setTaskCreating(false)
                return
            }
        }

        try {
            const res = await fetch(`${API}/admin/tasks`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                    // No Content-Type header for FormData, browser sets it with boundary
                },
                body: formData
            })

            if (!res.ok) throw new Error('Failed to create task')

            alert('Task created successfully!')
            // Reset form
            setSourceText('')
            setAudioFile(null)
            setExpectedAnswer('')
            // deleteRecording() // Removed as recording is gone
        } catch (error) {
            console.error(error)
            alert('Error creating task')
        } finally {
            setTaskCreating(false)
        }
    }

    useEffect(() => {
        if (token) {
            fetchData()
        }
    }, [token, fetchData])

    const handleApprove = async (id: string) => {
        if (!confirm('Approve this submission?')) return
        try {
            await fetch(`${API}/admin/approve/${id}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            })
            fetchData()
        } catch (e) {
            alert('Error approving')
        }
    }

    const handleReject = async (id: string) => {
        const reason = prompt('Reason for rejection:')
        if (!reason) return
        try {
            await fetch(`${API}/admin/reject/${id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ reason })
            })
            fetchData()
        } catch (e) {
            alert('Error rejecting')
        }
    }

    const handleToggleTask = async (id: string) => {
        try {
            await fetch(`${API}/admin/tasks/${id}/toggle`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` },
            })
            fetchData()
        } catch (e) {
            alert('Error toggling task status')
        }
    }

    const handleDeleteTask = async (id: string) => {
        if (!confirm('Are you sure you want to delete this task? This cannot be undone.')) return
        try {
            const res = await fetch(`${API}/admin/tasks/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            })
            const data = await res.json()
            if (!res.ok) {
                alert(data.message)
            } else {
                fetchData()
            }
        } catch (e) {
            alert('Error deleting task')
        }
    }

    const getCategoryLabel = (category: string) => {
        const labels: Record<string, string> = {
            'general': 'Prompt',
            'prompt': 'Prompt',
            'emotion_qa': 'Emotion',
            '': 'Prompt'
        }
        return labels[category] || category
    }

    return (
        <div className="admin-shell">
            <aside className="dashboard-sidebar">
                <div className="dashboard-brand">
                    <img src="/xtraka-images/xtraka%20logo.png" alt="Traka" />
                </div>
                <nav className="dashboard-nav">
                    <div className="dashboard-nav-btn dashboard-nav-active">
                        <span>🛡️</span>
                    </div>
                </nav>
            </aside>

            <div className="admin-main">
                <header className="dashboard-topbar">
                    <div className="dashboard-topbar-spacer">
                        <h1 className="admin-title">Admin Dashboard</h1>
                    </div>
                    <div className="dashboard-topbar-stats">
                        <div className="dashboard-connect">
                            <span style={{ marginRight: '1rem', fontWeight: 'bold' }}>{username}</span>
                            <button onClick={handleLogout} className="action-btn" style={{ padding: '8px 16px' }}>Logout</button>
                        </div>
                    </div>
                </header>

                <main className="admin-content">
                    <div className="admin-tabs">
                        <button
                            className={`admin-tab ${activeTab === 'submissions' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('submissions'); setPage(1); }}
                        >
                            Submissions (Pending)
                        </button>
                        <button
                            className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('users'); setPage(1); }}
                        >
                            Users
                        </button>
                        <button
                            className={`admin-tab ${activeTab === 'tasks' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('tasks'); setPage(1); }}
                        >
                            Tasks
                        </button>
                        <button
                            className={`admin-tab ${activeTab === 'create-task' ? 'active' : ''}`}
                            onClick={() => setActiveTab('create-task')}
                        >
                            Create Task
                        </button>
                    </div>

                    {loading ? (
                        <div>Loading...</div>
                    ) : activeTab !== 'create-task' ? (
                        <>
                            {activeTab === 'tasks' && (
                                <div className="task-filters">
                                    <div className="filter-group">
                                        <label>Category</label>
                                        <select
                                            value={taskCategoryFilter}
                                            onChange={(e) => { setTaskCategoryFilter(e.target.value); setPage(1); }}
                                        >
                                            <option value="">All Categories</option>
                                            <option value="general">Prompt</option>
                                            <option value="emotion_qa">Emotion</option>
                                        </select>
                                    </div>
                                    <div className="filter-group">
                                        <label>Language</label>
                                        <select
                                            value={taskLanguageFilter}
                                            onChange={(e) => { setTaskLanguageFilter(e.target.value); setPage(1); }}
                                        >
                                            <option value="">All Languages</option>
                                            <option value="igbo">Igbo</option>
                                            <option value="hausa">Hausa</option>
                                            <option value="yoruba">Yoruba</option>
                                        </select>
                                    </div>
                                    <div className="filter-group">
                                        <label>Status</label>
                                        <select
                                            value={taskStatusFilter}
                                            onChange={(e) => { setTaskStatusFilter(e.target.value); setPage(1); }}
                                        >
                                            <option value="">All Status</option>
                                            <option value="true">Active</option>
                                            <option value="false">Inactive</option>
                                        </select>
                                    </div>
                                    {(taskCategoryFilter || taskLanguageFilter || taskStatusFilter) && (
                                        <button
                                            className="clear-filters-btn"
                                            onClick={() => {
                                                setTaskCategoryFilter('')
                                                setTaskLanguageFilter('')
                                                setTaskStatusFilter('')
                                                setPage(1)
                                            }}
                                        >
                                            Clear Filters
                                        </button>
                                    )}
                                </div>
                            )}

                            <div className="admin-table-container">
                                <table className="admin-table">
                                    {activeTab === 'users' ? (
                                        <thead>
                                            <tr>
                                                <th>Wallet Hash</th>
                                                <th>Trust Score</th>
                                                <th>Approved</th>
                                                <th>Pending</th>
                                                <th>Rejected</th>
                                                <th>Badge</th>
                                            </tr>
                                        </thead>
                                    ) : activeTab === 'tasks' ? (
                                        <thead>
                                            <tr>
                                                <th>Title</th>
                                                <th>Category</th>
                                                <th>Language</th>
                                                <th>Audio</th>
                                                <th>Reward</th>
                                                <th>Submissions</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                    ) : (
                                        <thead>
                                            <tr>
                                                <th>Task</th>
                                                <th>Lang</th>
                                                <th>User</th>
                                                <th>Content</th>
                                                <th>Audio</th>
                                                <th>AI Conf.</th>
                                                <th>Status</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                    )}

                                    <tbody>
                                        {activeTab === 'users' ? (
                                            users.map(user => (
                                                <tr key={user._id}>
                                                    <td style={{ fontFamily: 'monospace' }}>{user.walletHashIndex.substring(0, 10)}...</td>
                                                    <td>{user.trustScore}</td>
                                                    <td>{user.approvedSubmissions}</td>
                                                    <td>{user.pendingSubmissions}</td>
                                                    <td>{user.rejectedSubmissions}</td>
                                                    <td>{user.currentBadge}</td>
                                                </tr>
                                            ))
                                        ) : activeTab === 'tasks' ? (
                                            tasks.map(task => (
                                                <tr key={task._id}>
                                                    <td style={{ maxWidth: '250px' }}>
                                                        <div style={{ fontWeight: 'var(--font-semibold)' }}>{task.title}</div>
                                                        {task.sourceText && (
                                                            <div style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.5)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {task.sourceText}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className="status-badge" style={{ background: task.category === 'emotion_qa' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)', color: task.category === 'emotion_qa' ? '#c084fc' : '#60a5fa' }}>
                                                            {getCategoryLabel(task.category)}
                                                        </span>
                                                    </td>
                                                    <td style={{ textTransform: 'capitalize' }}>{task.language}</td>
                                                    <td>
                                                        {task.sourceAudioPath ? (
                                                            <audio controls src={`${API}/uploads/${task.sourceAudioPath}`} className="audio-player" />
                                                        ) : (
                                                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'var(--text-xs)' }}>No audio</span>
                                                        )}
                                                    </td>
                                                    <td>{task.rewardAmount} cUSD</td>
                                                    <td>
                                                        <div style={{ fontSize: 'var(--text-xs)' }}>
                                                            <div>Total: {task.submissionStats?.total || 0}</div>
                                                            <div style={{ color: '#34d399' }}>✓ {task.submissionStats?.approved || 0}</div>
                                                            <div style={{ color: '#f87171' }}>✗ {task.submissionStats?.rejected || 0}</div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`status-badge ${task.isActive ? 'approved' : 'rejected'}`}>
                                                            {task.isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button
                                                            className={`action-btn ${task.isActive ? 'reject' : 'approve'}`}
                                                            onClick={() => handleToggleTask(task._id)}
                                                        >
                                                            {task.isActive ? 'Deactivate' : 'Activate'}
                                                        </button>
                                                        {task.submissionStats?.total === 0 && (
                                                            <button
                                                                className="action-btn reject"
                                                                onClick={() => handleDeleteTask(task._id)}
                                                            >
                                                                Delete
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            submissions.map(sub => (
                                                <tr key={sub._id}>
                                                    <td>{sub.taskId?.title || 'Unknown'}</td>
                                                    <td>{sub.taskId?.language}</td>
                                                    <td style={{ fontFamily: 'monospace' }}>{sub.userHash.substring(0, 8)}...</td>
                                                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {sub.textContent || '-'}
                                                    </td>
                                                    <td>
                                                        {sub.audioPath && (
                                                            <audio controls src={`${API}/uploads/${sub.audioPath}`} className="audio-player" />
                                                        )}
                                                    </td>
                                                    <td>{sub.aiVerification?.overallConfidence ? `${sub.aiVerification.overallConfidence}%` : '-'}</td>
                                                    <td>
                                                        <span className={`status-badge ${sub.status}`}>{sub.status}</span>
                                                    </td>
                                                    <td>
                                                        {sub.status === 'pending' && (
                                                            <>
                                                                <button className="action-btn approve" onClick={() => handleApprove(sub._id)}>Approve</button>
                                                                <button className="action-btn reject" onClick={() => handleReject(sub._id)}>Reject</button>
                                                            </>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="pagination">
                                <button
                                    className="pagination-btn"
                                    disabled={page === 1}
                                    onClick={() => setPage(page - 1)}
                                >
                                    Prev
                                </button>
                                <span style={{ alignSelf: 'center' }}>Page {page} of {totalPages}</span>
                                <button
                                    className="pagination-btn"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(page + 1)}
                                >
                                    Next
                                </button>
                            </div>
                        </>
                    ) : null}

                    {activeTab === 'create-task' && (
                        <div className="create-task-container">
                            <div className="task-type-selector">
                                <button
                                    className={`type-btn ${taskType === 'prompt' ? 'active' : ''}`}
                                    onClick={() => setTaskType('prompt')}
                                >
                                    Prompt Task
                                </button>
                                <button
                                    className={`type-btn ${taskType === 'emotion' ? 'active' : ''}`}
                                    onClick={() => setTaskType('emotion')}
                                >
                                    Emotion Task
                                </button>
                            </div>

                            <form onSubmit={handleCreateTask} className="create-task-form">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Language</label>
                                        <select value={taskLanguage} onChange={e => setTaskLanguage(e.target.value)}>
                                            <option value="igbo">Igbo</option>
                                            <option value="hausa">Hausa</option>
                                            <option value="pidgin">Pidgin</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Reward (cUSD)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={taskReward}
                                            onChange={e => setTaskReward(parseFloat(e.target.value))}
                                            required
                                        />
                                    </div>
                                </div>

                                {taskType === 'prompt' ? (
                                    <>
                                        <div className="form-group">
                                            <label>Source Text (Prompt)</label>
                                            <textarea
                                                value={sourceText}
                                                onChange={e => setSourceText(e.target.value)}
                                                required
                                                rows={4}
                                                placeholder="Enter the text to be read..."
                                            />
                                        </div>
                                        <div className="form-group checkbox">
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    checked={audioRequired}
                                                    onChange={e => setAudioRequired(e.target.checked)}
                                                />
                                                Audio Recording Required
                                            </label>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="form-group">
                                            <label>Upload Audio Prompt</label>
                                            <p style={{ fontSize: '0.9rem', color: '#888', marginBottom: '0.5rem' }}>
                                                Upload an audio file (.mp3, .wav, .webm). Users will listen and select the emotion they hear.
                                            </p>
                                            <input
                                                type="file"
                                                accept="audio/*"
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        setAudioFile(e.target.files[0])
                                                    }
                                                }}
                                                className="file-input"
                                                style={{
                                                    padding: '12px',
                                                    background: '#333',
                                                    color: '#fff',
                                                    border: '1px solid #444',
                                                    borderRadius: '8px',
                                                    width: '100%',
                                                    marginBottom: '1rem'
                                                }}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Correct Emotion (Expected Answer)</label>
                                            <select
                                                value={expectedAnswer}
                                                onChange={e => setExpectedAnswer(e.target.value)}
                                                required
                                                style={{
                                                    padding: '12px',
                                                    background: '#333',
                                                    color: '#fff',
                                                    border: '1px solid #444',
                                                    borderRadius: '8px',
                                                    width: '100%'
                                                }}
                                            >
                                                <option value="">Select Emotion</option>
                                                <option value="Anger">Anger</option>
                                                <option value="Neutral">Neutral</option>
                                                <option value="Excitement">Excitement</option>
                                                <option value="Sad">Sad</option>
                                            </select>
                                        </div>
                                    </>
                                )}

                                <button type="submit" className="submit-task-btn" disabled={taskCreating}>
                                    {taskCreating ? 'Creating...' : 'Create Task'}
                                </button>
                            </form>
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}
