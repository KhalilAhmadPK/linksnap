import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function App() {
    const [url, setUrl] = useState('')
    const [customCode, setCustomCode] = useState('')
    const [urls, setUrls] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [copied, setCopied] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => { fetchUrls() }, [])

    async function fetchUrls() {
        try {
            const res = await fetch(`${API}/api/urls`)
            const data = await res.json()
            setUrls(data.urls || [])
        } catch {
            console.error('Could not fetch URLs')
        }
    }

    async function handleShorten(e) {
        e.preventDefault()
        setError('')
        setSuccess('')
        if (!url) return

        setLoading(true)
        try {
            const res = await fetch(`${API}/api/shorten`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, custom_code: customCode || undefined }),
            })
            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Something went wrong')
                return
            }

            setSuccess(`Short URL created: ${data.short_url}`)
            setUrl('')
            setCustomCode('')
            fetchUrls()
        } catch {
            setError('Cannot connect to backend')
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete(code) {
        try {
            await fetch(`${API}/api/urls/${code}`, { method: 'DELETE' })
            fetchUrls()
        } catch {
            setError('Delete failed')
        }
    }

    async function handleCopy(shortUrl, code) {
        await navigator.clipboard.writeText(shortUrl)
        setCopied(code)
        setTimeout(() => setCopied(''), 2000)
    }

    function truncate(str, n = 45) {
        return str.length > n ? str.slice(0, n) + '…' : str
    }

    return (
        <div className="app">
            {/* Header */}
            <header className="header">
                <div className="header-inner">
                    <div className="logo">🔗 LinkSnap</div>
                    <p className="tagline">Shorten. Share. Track.</p>
                </div>
            </header>

            <main className="main">
                {/* Form Card */}
                <div className="card form-card">
                    <h2 className="card-title">Shorten a URL</h2>
                    <form onSubmit={handleShorten} className="form">
                        <div className="input-group">
                            <label className="label">Long URL</label>
                            <input
                                className="input"
                                type="url"
                                placeholder="https://example.com/very/long/url"
                                value={url}
                                onChange={e => setUrl(e.target.value)}
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label className="label">Custom Code <span className="optional">(optional)</span></label>
                            <input
                                className="input"
                                type="text"
                                placeholder="e.g. my-link"
                                value={customCode}
                                onChange={e => setCustomCode(e.target.value)}
                                maxLength={20}
                            />
                        </div>
                        {error && <div className="alert alert-error">{error}</div>}
                        {success && <div className="alert alert-success">{success}</div>}
                        <button className="btn btn-primary" type="submit" disabled={loading}>
                            {loading ? 'Shortening…' : '⚡ Shorten URL'}
                        </button>
                    </form>
                </div>

                {/* URLs Table */}
                <div className="card">
                    <h2 className="card-title">Recent URLs
                        <span className="badge">{urls.length}</span>
                    </h2>

                    {urls.length === 0 ? (
                        <div className="empty">No URLs yet. Create your first one above!</div>
                    ) : (
                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Short URL</th>
                                        <th>Original</th>
                                        <th>Clicks</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {urls.map(u => (
                                        <tr key={u.id}>
                                            <td>
                                                <a
                                                    className="short-link"
                                                    href={u.short_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    /{u.short_code}
                                                </a>
                                            </td>
                                            <td>
                                                <span className="original" title={u.original_url}>
                                                    {truncate(u.original_url)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="clicks">{u.click_count}</span>
                                            </td>
                                            <td className="actions">
                                                <button
                                                    className={`btn btn-sm ${copied === u.short_code ? 'btn-success' : 'btn-copy'}`}
                                                    onClick={() => handleCopy(u.short_url, u.short_code)}
                                                >
                                                    {copied === u.short_code ? 'Copied' : 'Copy'}
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-delete"
                                                    onClick={() => handleDelete(u.short_code)}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            <footer className="footer">
                Built with React · Node.js · PostgreSQL
            </footer>
        </div>
    )
}