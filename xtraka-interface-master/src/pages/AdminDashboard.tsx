import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Sidebar } from '../components/Sidebar'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import './admin-dashboard.css'
import './dashboard.css'

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
    isSubAdmin?: boolean
    adminLanguages?: string[]
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

// Modal Component for selecting languages
const LanguageModal = ({
    isOpen,
    onClose,
    onSave,
    initialLanguages
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (languages: string[]) => void;
    initialLanguages: string[]
}) => {
    const [selected, setSelected] = useState<string[]>([])

    useEffect(() => {
        if (isOpen) {
            setSelected(initialLanguages)
        }
    }, [isOpen, initialLanguages])

    const availableLanguages = ['igbo', 'hausa', 'pidgin']

    if (!isOpen) return null

    const toggleLanguage = (lang: string) => {
        if (selected.includes(lang)) {
            setSelected(selected.filter(l => l !== lang))
        } else {
            setSelected([...selected, lang])
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>Select Admin Languages</h3>
                <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#94a3b8' }}>
                    Choose which languages this sub-admin can review.
                </p>

                <div className="language-list">
                    {availableLanguages.map(lang => (
                        <label key={lang} className="language-checkbox-item">
                            <input
                                type="checkbox"
                                checked={selected.includes(lang)}
                                onChange={() => toggleLanguage(lang)}
                            />
                            <span style={{ textTransform: 'capitalize' }}>{lang}</span>
                        </label>
                    ))}
                </div>

                <div className="modal-actions">
                    <button className="action-btn reject" onClick={onClose}>Cancel</button>
                    <button className="action-btn approve" onClick={() => onSave(selected)}>Save</button>
                </div>
            </div>

            <style>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                .modal-content {
                    background: #1e293b;
                    padding: 2rem;
                    border-radius: 12px;
                    width: 300px;
                    border: 1px solid #334155;
                    color: #fff;
                }
                .language-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.8rem;
                    margin-bottom: 1.5rem;
                }
                .language-checkbox-item {
                    display: flex;
                    align-items: center;
                    gap: 0.8rem;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 6px;
                    background: rgba(255,255,255,0.05);
                }
                .language-checkbox-item:hover {
                    background: rgba(255,255,255,0.1);
                }
                .modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 1rem;
                }
                @media (max-width: 480px) {
                    .modal-content {
                        width: 90%;
                        max-width: 300px;
                        padding: 1.25rem;
                    }
                    .modal-actions {
                        flex-direction: column;
                    }
                    .modal-actions .action-btn {
                        width: 100%;
                        text-align: center;
                    }
                }
            `}</style>
        </div>
    )
}

export function AdminDashboard() {

    const navigate = useNavigate()
    const { token: userToken, isSubAdmin: isWalletSubAdmin } = useAuth()

    const [token, setToken] = useState(localStorage.getItem('admin_token'))
    const [username, setUsername] = useState(localStorage.getItem('admin_username'))
    const [activeTab, setActiveTab] = useState<'users' | 'submissions' | 'tasks' | 'create-task' | 'payments'>('submissions')
    const [users, setUsers] = useState<User[]>([])
    const [tasks, setTasks] = useState<Task[]>([])
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    // Derived state for SubAdmin (Wallet based)
    const isSuperAdmin = !!localStorage.getItem('admin_token')
    const isSubAdmin = !isSuperAdmin && isWalletSubAdmin

    // Effective token to use for requests
    const apiToken = isSuperAdmin ? token : (isSubAdmin ? userToken : null)

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
    const [audioFile, setAudioFile] = useState<File | null>(null)

    // Modal State
    const [showLanguageModal, setShowLanguageModal] = useState(false)
    const [editingUser, setEditingUser] = useState<User | null>(null)

    // Payment Settings State
    const [privateKey, setPrivateKey] = useState('')
    const [paymentConfigured, setPaymentConfigured] = useState(false)
    const [paymentWalletAddress, setPaymentWalletAddress] = useState<string | null>(null)
    const [tokenBalance, setTokenBalance] = useState('0')
    const [ethBalance, setEthBalance] = useState('0')
    const [tokenSymbol, setTokenSymbol] = useState('xUSDC')
    const [savingKey, setSavingKey] = useState(false)
    const [pendingWithdrawals, setPendingWithdrawals] = useState<Array<{ _id: string; userHash: string; walletAddress: string; amount: number; status: string; requestedAt: string; errorMessage?: string }>>([])

    useEffect(() => {
        const adminToken = localStorage.getItem('admin_token')

        if (adminToken) {
            setToken(adminToken)
            setUsername(localStorage.getItem('admin_username'))
        } else if (isWalletSubAdmin && userToken) {
            setUsername('SubAdmin')
        } else {
            const t = setTimeout(() => {
                if (!localStorage.getItem('admin_token') && !isWalletSubAdmin) {
                    navigate('/admin/login')
                }
            }, 1000)
            return () => clearTimeout(t)
        }
    }, [navigate, isWalletSubAdmin, userToken])

    const handleLogout = () => {
        if (isSuperAdmin) {
            localStorage.removeItem('admin_token')
            localStorage.removeItem('admin_username')
            navigate('/admin/login')
        } else {
            navigate('/dashboard')
        }
    }

    // Enforce SubAdmin restriction
    useEffect(() => {
        if (isSubAdmin && activeTab !== 'submissions') {
            setActiveTab('submissions')
        }
    }, [isSubAdmin, isSuperAdmin, isWalletSubAdmin, userToken, activeTab])

    const fetchData = useCallback(() => {
        if (!apiToken) return
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
            headers: { Authorization: `Bearer ${apiToken}` },
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
    }, [apiToken, activeTab, page, taskCategoryFilter, taskLanguageFilter, taskStatusFilter])

    // Fetch payment config when payments tab is active
    useEffect(() => {
        if (activeTab === 'payments' && apiToken) {
            // Fetch payment config status
            fetch(`${API}/admin/payment-config`, {
                headers: { Authorization: `Bearer ${apiToken}` },
            })
                .then(r => r.json())
                .then(data => {
                    setPaymentConfigured(data.configured)
                    setPaymentWalletAddress(data.walletAddress)
                })
                .catch(console.error)

            // Fetch wallet balance
            fetch(`${API}/admin/wallet-balance`, {
                headers: { Authorization: `Bearer ${apiToken}` },
            })
                .then(r => r.json())
                .then(data => {
                    setTokenBalance(data.tokenBalance || '0')
                    setEthBalance(data.ethBalance || '0')
                    setTokenSymbol(data.tokenSymbol || 'xUSDC')
                    if (data.walletAddress) setPaymentWalletAddress(data.walletAddress)
                })
                .catch(console.error)

            // Fetch pending withdrawals
            fetch(`${API}/admin/pending-withdrawals`, {
                headers: { Authorization: `Bearer ${apiToken}` },
            })
                .then(r => r.json())
                .then(data => {
                    setPendingWithdrawals(data.withdrawals || [])
                })
                .catch(console.error)
        }
    }, [activeTab, apiToken])

    const handleSavePrivateKey = async () => {
        if (!privateKey.trim()) return alert('Please enter a private key')
        setSavingKey(true)
        try {
            const res = await fetch(`${API}/admin/payment-config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
                body: JSON.stringify({ privateKey: privateKey.trim() }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.message)
            setPaymentConfigured(true)
            setPaymentWalletAddress(data.walletAddress)
            setPrivateKey('')
            alert('Payment configuration saved!')
            // Refresh balances
            setActiveTab('payments')
        } catch (err: unknown) {
            alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'))
        } finally {
            setSavingKey(false)
        }
    }

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault()
        setTaskCreating(true)
        const formData = new FormData()
        const defaultTitle = taskType === 'prompt' ? `Read this ${taskLanguage} text` : `Identify the emotion in this ${taskLanguage} audio`

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
            formData.append('type', 'text')
            formData.append('category', 'emotion_qa')
            formData.append('description', 'Emotion recognition task')
            formData.append('minTextLength', '1')
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
                headers: { Authorization: `Bearer ${apiToken}` },
                body: formData
            })
            if (!res.ok) throw new Error('Failed to create task')
            alert('Task created successfully!')
            setSourceText('')
            setAudioFile(null)
            setExpectedAnswer('')
        } catch (error) {
            console.error(error)
            alert('Error creating task')
        } finally {
            setTaskCreating(false)
        }
    }

    useEffect(() => {
        if (apiToken) {
            fetchData()
        }
    }, [apiToken, fetchData])

    const handleApprove = async (id: string) => {
        if (!confirm('Approve this submission?')) return
        try {
            await fetch(`${API}/admin/approve/${id}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${apiToken}` },
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
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
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
                headers: { Authorization: `Bearer ${apiToken}` },
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
                headers: { Authorization: `Bearer ${apiToken}` },
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

    const saveLanguages = async (languages: string[]) => {
        if (!editingUser) return

        try {
            // Need to determine if we are promoting (isSubAdmin=true) or just editing langs
            // If they are already subadmin, we just send langs and isSubAdmin=true
            // If they are NOT, this modal was triggered by "Make Subadmin", so we send isSubAdmin=true

            await fetch(`${API}/admin/users/${editingUser._id}/toggle-subadmin`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiToken}`
                },
                body: JSON.stringify({
                    isSubAdmin: true,
                    languages
                })
            })
            setShowLanguageModal(false)
            setEditingUser(null)
            fetchData()
        } catch (e) {
            alert('Error saving languages')
        }
    }

    const initiateMakeSubAdmin = (user: User) => {
        // If they are not subadmin, we open modal to select languages first
        // If they ARE subadmin, we confirm removal
        if (user.isSubAdmin) {
            if (confirm('Are you sure you want to remove this Sub-Admin role?')) {
                // Remove logic
                fetch(`${API}/admin/users/${user._id}/toggle-subadmin`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
                    body: JSON.stringify({ isSubAdmin: false }) // Explicitly set to false
                }).then(() => fetchData())
            }
        } else {
            // Open modal to assign languages
            setEditingUser(user)
            setShowLanguageModal(true)
        }
    }

    const initiateEditLanguages = (user: User) => {
        setEditingUser(user)
        setShowLanguageModal(true)
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

    const renderAdminContent = () => (
        <main className="admin-content">
            {isSuperAdmin && (
                <div className="admin-tabs">
                    <button className={`admin-tab ${activeTab === 'submissions' ? 'active' : ''}`} onClick={() => { setActiveTab('submissions'); setPage(1); }}>Submissions (Pending)</button>
                    <button className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => { setActiveTab('users'); setPage(1); }}>Users</button>
                    <button className={`admin-tab ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => { setActiveTab('tasks'); setPage(1); }}>Tasks</button>
                    <button className={`admin-tab ${activeTab === 'create-task' ? 'active' : ''}`} onClick={() => setActiveTab('create-task')}>Create Task</button>
                    <button className={`admin-tab ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>💰 Payments</button>
                </div>
            )}

            {loading ? (
                <div className="loading-spinner">Loading...</div>
            ) : activeTab === 'submissions' || activeTab === 'users' || activeTab === 'tasks' ? (
                <>
                    {activeTab === 'tasks' && (
                        <div className="task-filters">
                            <div className="filter-group">
                                <label>Category</label>
                                <select value={taskCategoryFilter} onChange={(e) => { setTaskCategoryFilter(e.target.value); setPage(1); }}>
                                    <option value="">All Categories</option>
                                    <option value="general">Prompt</option>
                                    <option value="emotion_qa">Emotion</option>
                                </select>
                            </div>
                            <div className="filter-group">
                                <label>Language</label>
                                <select value={taskLanguageFilter} onChange={(e) => { setTaskLanguageFilter(e.target.value); setPage(1); }}>
                                    <option value="">All Languages</option>
                                    <option value="igbo">Igbo</option>
                                    <option value="hausa">Hausa</option>
                                </select>
                            </div>
                            <div className="filter-group">
                                <label>Status</label>
                                <select value={taskStatusFilter} onChange={(e) => { setTaskStatusFilter(e.target.value); setPage(1); }}>
                                    <option value="">All Status</option>
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
                            </div>
                            {(taskCategoryFilter || taskLanguageFilter || taskStatusFilter) && (
                                <button className="clear-filters-btn" onClick={() => { setTaskCategoryFilter(''); setTaskLanguageFilter(''); setTaskStatusFilter(''); setPage(1) }}>Clear Filters</button>
                            )}
                        </div>
                    )}

                    <div className="table-container">
                        <table className="admin-table">
                            <thead>
                                {activeTab === 'users' ? (
                                    <tr>
                                        <th>Wallet Address</th>
                                        <th>Trust Score</th>
                                        <th>Total Submissions</th>
                                        <th>Approved</th>
                                        <th>Rejected</th>
                                        <th>Badge</th>
                                        <th>Actions</th>
                                    </tr>
                                ) : activeTab === 'tasks' ? (
                                    <tr>
                                        <th>Title / Text</th>
                                        <th>Category</th>
                                        <th>Language</th>
                                        <th>Audio</th>
                                        <th>Reward</th>
                                        <th>Stats</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                ) : (
                                    <tr>
                                        <th>Task</th>
                                        <th>Lang</th>
                                        <th>User</th>
                                        <th>Text</th>
                                        <th>Audio</th>
                                        <th>AI Score</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody>
                                {activeTab === 'users' ? (
                                    users.map(user => (
                                        <tr key={user._id}>
                                            <td style={{ fontFamily: 'monospace' }}>
                                                {/* Truncate Wallet Address */}
                                                {user.walletHashIndex && user.walletHashIndex.length > 20
                                                    ? `${user.walletHashIndex.substring(0, 8)}...${user.walletHashIndex.substring(user.walletHashIndex.length - 6)}`
                                                    : user.walletHashIndex}
                                            </td>
                                            <td>
                                                <div className="trust-score-bar">
                                                    <div className="fill" style={{ width: `${user.trustScore}%`, backgroundColor: user.trustScore > 80 ? '#34d399' : user.trustScore > 50 ? '#facc15' : '#f87171' }} />
                                                    <span>{user.trustScore}</span>
                                                </div>
                                            </td>
                                            <td>{user.totalSubmissions}</td>
                                            <td>{user.approvedSubmissions}</td>
                                            <td>{user.rejectedSubmissions}</td>
                                            <td>{user.currentBadge}</td>
                                            <td>
                                                {user.isSubAdmin && (
                                                    <div style={{ fontSize: '0.75rem', marginBottom: '4px', color: '#94a3b8' }}>
                                                        {user.adminLanguages?.length ? user.adminLanguages.join(', ') : 'No languages'}
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <button
                                                        className={`action-btn ${user.isSubAdmin ? 'reject' : 'approve'}`}
                                                        style={{ fontSize: '0.8rem', padding: '4px 8px', width: '100%' }}
                                                        onClick={() => initiateMakeSubAdmin(user)}
                                                    >
                                                        {user.isSubAdmin ? 'Remove Role' : 'Make SubAdmin'}
                                                    </button>

                                                    {user.isSubAdmin && (
                                                        <button
                                                            className="action-btn"
                                                            style={{ fontSize: '0.8rem', padding: '4px 8px', background: '#475569', width: '100%' }}
                                                            onClick={() => initiateEditLanguages(user)}
                                                        >
                                                            Edit Langs
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
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
                                            <td>{task.rewardAmount} xUSDC</td>
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
                                            <td style={{ fontFamily: 'monospace' }}>
                                                {sub.userHash && sub.userHash.length > 12
                                                    ? `${sub.userHash.substring(0, 6)}...${sub.userHash.substring(sub.userHash.length - 4)}`
                                                    : sub.userHash}
                                            </td>
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
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                        <span>Page {page} of {totalPages}</span>
                        <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
                    </div>
                </>
            ) : activeTab === 'create-task' ? (
                <div className="create-task-container">
                    <h2 style={{ marginBottom: '2rem', textAlign: 'center' }}>Create New Task</h2>

                    <div className="task-type-selector">
                        <button
                            type="button"
                            className={`type-btn ${taskType === 'prompt' ? 'active' : ''}`}
                            onClick={() => setTaskType('prompt')}
                        >
                            Voice Prompt
                        </button>
                        <button
                            type="button"
                            className={`type-btn ${taskType === 'emotion' ? 'active' : ''}`}
                            onClick={() => setTaskType('emotion')}
                        >
                            Emotion Q/A
                        </button>
                    </div>

                    <form onSubmit={handleCreateTask} className="create-task-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Language</label>
                                <select value={taskLanguage} onChange={(e) => setTaskLanguage(e.target.value)}>
                                    <option value="igbo">Igbo</option>
                                    <option value="hausa">Hausa</option>
                                    <option value="pidgin">Pidgin</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Reward Amount (xUSDC)</label>
                                <input type="number" step="0.1" value={taskReward} onChange={(e) => setTaskReward(parseFloat(e.target.value))} />
                            </div>
                        </div>

                        {taskType === 'prompt' && (
                            <>
                                <div className="form-group">
                                    <label>Prompt Text (What users should read)</label>
                                    <textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder="Enter the text to read..." rows={4} required />
                                </div>
                                <div className="form-group checkbox">
                                    <label>
                                        <input type="checkbox" checked={audioRequired} onChange={(e) => setAudioRequired(e.target.checked)} />
                                        <span>Require Audio Recording</span>
                                    </label>
                                </div>
                            </>
                        )}
                        {taskType === 'emotion' && (
                            <>
                                <div className="form-group">
                                    <label>Upload Speech/Audio File</label>
                                    <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} required />
                                    <p className="hint">Upload the audio clip that users will analyze for emotion.</p>
                                </div>
                                <div className="form-group">
                                    <label>Correct Emotion (Expected Answer)</label>
                                    <select value={expectedAnswer} onChange={(e) => setExpectedAnswer(e.target.value)} required>
                                        <option value="">Select Emotion...</option>
                                        <option value="Happy">Happy</option>
                                        <option value="Sad">Sad</option>
                                        <option value="Anger">Anger</option>
                                        <option value="Fear">Fear</option>
                                        <option value="Surprise">Surprise</option>
                                        <option value="Neutral">Neutral</option>
                                        <option value="Excitement">Excitement</option>
                                        <option value="Disgust">Disgust</option>
                                    </select>
                                </div>
                                <div className="form-group checkbox">
                                    <label>
                                        <input type="checkbox" checked={audioRequired} onChange={(e) => setAudioRequired(e.target.checked)} disabled />
                                        <span>Audio Response Not Required (Text Selection Only)</span>
                                    </label>
                                </div>
                            </>
                        )}

                        <button type="submit" className="submit-task-btn" disabled={taskCreating}>
                            {taskCreating ? 'Creating Task...' : 'Create Task'}
                        </button>
                    </form>
                </div>
            ) : activeTab === 'payments' ? (
                <div className="create-task-container" style={{ maxWidth: '700px' }}>
                    <h2 style={{ marginBottom: '2rem', textAlign: 'center' }}>💰 Payment Settings</h2>

                    {/* Wallet Status */}
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Wallet Status</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '1.2rem' }}>{paymentConfigured ? '✅' : '❌'}</span>
                            <span>{paymentConfigured ? 'Wallet configured' : 'No wallet configured'}</span>
                        </div>
                        {paymentWalletAddress && (
                            <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#94a3b8', wordBreak: 'break-all' }}>
                                Address: {paymentWalletAddress}
                            </div>
                        )}
                    </div>

                    {/* Balances */}
                    {paymentConfigured && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ background: 'rgba(52, 211, 153, 0.1)', borderRadius: '12px', padding: '1.25rem', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Token Balance</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#34d399' }}>
                                    {parseFloat(tokenBalance).toLocaleString()} {tokenSymbol}
                                </div>
                            </div>
                            <div style={{ background: 'rgba(96, 165, 250, 0.1)', borderRadius: '12px', padding: '1.25rem', border: '1px solid rgba(96, 165, 250, 0.2)' }}>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>ETH (Gas)</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#60a5fa' }}>
                                    {parseFloat(ethBalance).toFixed(4)} ETH
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Private Key Input */}
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>
                            {paymentConfigured ? 'Update Private Key' : 'Configure Private Key'}
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
                            Enter the private key for the wallet that holds your test tokens. This key is encrypted before storage.
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <input
                                type="password"
                                value={privateKey}
                                onChange={(e) => setPrivateKey(e.target.value)}
                                placeholder="0x..."
                                style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '0.75rem', color: '#fff', fontFamily: 'monospace', fontSize: '0.85rem' }}
                            />
                            <button
                                onClick={handleSavePrivateKey}
                                disabled={savingKey}
                                className="action-btn approve"
                                style={{ padding: '0.75rem 1.5rem', whiteSpace: 'nowrap' }}
                            >
                                {savingKey ? 'Saving...' : 'Save Key'}
                            </button>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.5rem' }}>
                            ⚠️ Never use a mainnet key with real funds here. This is for testnet only.
                        </p>
                    </div>

                    {/* Network Info */}
                    <div style={{ background: 'rgba(168, 85, 247, 0.1)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                        <div style={{ fontSize: '0.85rem', color: '#c084fc', fontWeight: 'bold', marginBottom: '0.5rem' }}>Network: Arbitrum Sepolia (Testnet)</div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>All transactions are on testnet. No real funds are used.</div>
                    </div>

                    {/* Pending Withdrawals */}
                    {pendingWithdrawals.length > 0 && (
                        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Pending / Failed Withdrawals ({pendingWithdrawals.length})</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {pendingWithdrawals.map(w => (
                                    <div key={w._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', fontSize: '0.85rem' }}>
                                        <div>
                                            <div style={{ fontFamily: 'monospace', color: '#e2e8f0' }}>
                                                {w.walletAddress.substring(0, 8)}...{w.walletAddress.substring(w.walletAddress.length - 6)}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                {new Date(w.requestedAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 'bold' }}>{w.amount} xUSDC</div>
                                            <span className={`status-badge ${w.status === 'failed' ? 'rejected' : 'pending'}`}>
                                                {w.status}
                                            </span>
                                            {w.errorMessage && (
                                                <div style={{ fontSize: '0.7rem', color: '#f87171', marginTop: '4px', maxWidth: '200px' }}>
                                                    {w.errorMessage}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : null}
        </main>
    )

    if (isSubAdmin) {
        return (
            <div className="dashboard-shell">
                <Sidebar />
                <div className="dashboard-main">
                    <header className="dashboard-topbar">
                        <div className="dashboard-topbar-spacer">
                            <h1 className="admin-title">Review Submissions</h1>
                        </div>
                        <div className="dashboard-topbar-stats">
                            <div className="dashboard-connect">
                                <ConnectButton />
                            </div>
                        </div>
                    </header>
                    {renderAdminContent()}
                </div>
            </div>
        )
    }

    return (
        <div className="admin-shell">
            <LanguageModal
                isOpen={showLanguageModal}
                onClose={() => setShowLanguageModal(false)}
                onSave={saveLanguages}
                initialLanguages={editingUser?.adminLanguages || []}
            />

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

                {renderAdminContent()}
            </div>
        </div>
    )
}
