import { useState } from 'react'
import { Download, FileText, Image, UploadCloud } from 'lucide-react'
import { useProjects } from '../../context/ProjectContext'

const INITIAL_FILES = [
  { id: 1, name: 'halo_ring_v3.stl', category: 'cad', size: '2.4 MB', modified: '2026-01-24', shared: true },
  { id: 2, name: 'concept_approved.png', category: 'images', size: '1.2 MB', modified: '2026-01-22', shared: true },
  { id: 3, name: 'quote_final.pdf', category: 'docs', size: '245 KB', modified: '2026-01-20', shared: false },
  { id: 4, name: 'ring_render_front.png', category: 'images', size: '890 KB', modified: '2026-01-21', shared: true },
  { id: 5, name: 'ring_render_side.png', category: 'images', size: '876 KB', modified: '2026-01-21', shared: false },
  { id: 6, name: 'halo_ring_v2.stl', category: 'cad', size: '2.1 MB', modified: '2026-01-19', shared: false },
  { id: 7, name: 'halo_ring_v1.stl', category: 'cad', size: '1.9 MB', modified: '2026-01-17', shared: false },
  { id: 8, name: 'certificate_diamond.pdf', category: 'docs', size: '156 KB', modified: '2026-01-15', shared: true },
]

const auditLog = [
  { user: 'Akash', action: 'Downloaded', file: 'halo_ring_v3.stl', time: '2 hours ago' },
  { user: 'Customer', action: 'Viewed', file: 'concept_approved.png', time: '5 hours ago' },
  { user: 'System', action: 'Shared', file: 'quote_final.pdf', time: '1 day ago' },
]

export default function Vault() {
  const { projects, cadFiles } = useProjects()
  const [selectedProject, setSelectedProject] = useState(projects[0])
  const [activeCategory, setActiveCategory] = useState('all')

  const dynamicCadFiles = cadFiles.map(file => ({
    id: file.id,
    name: file.name,
    category: 'cad',
    size: 'Image ref',
    modified: new Date(file.createdAt).toLocaleDateString(),
    shared: false,
    url: file.url,
  }))
  const allFiles = [...dynamicCadFiles, ...INITIAL_FILES]
  const filtered = activeCategory === 'all' ? allFiles : allFiles.filter(f => f.category === activeCategory)

  const fileIcon = (category: string) => {
    if (category === 'images') return <Image size={18} style={{ color: 'var(--bb-rose)' }} />
    if (category === 'docs') return <FileText size={18} style={{ color: 'var(--bb-coral)' }} />
    return <FileText size={18} style={{ color: 'var(--bb-violet)' }} />
  }

  return (
    <div className="bb-page animate-fade-up">
      <header className="bb-page-header">
        <div>
          <span className="bb-eyebrow" style={{ color: 'var(--bb-pillar-3)' }}>The archive</span>
          <h1 className="bb-display">Secure file <span className="bb-script" style={{ fontSize: '1.25em', color: 'var(--bb-rose)' }}>vault</span>.</h1>
        </div>
        <button className="bb-btn-primary bb-lift"><UploadCloud size={17} /> Upload files</button>
      </header>

      <div style={{ marginBottom: 16 }}>
        <div className="bb-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ color: 'var(--bb-muted)', fontSize: '0.86rem' }}>Project:</span>
          <select value={selectedProject?.id} onChange={e => setSelectedProject(projects.find(p => p.id === e.target.value)!)}
            style={{ flex: 1, maxWidth: 320, border: '1px solid var(--bb-line)', borderRadius: 8, padding: '8px 12px', background: '#fff', color: 'var(--bb-ink)', outline: 'none' }}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,3fr) 280px', gap: 20 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {['all', 'cad', 'images', 'docs'].map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '7px 14px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 750, cursor: 'pointer',
                  border: `1px solid ${activeCategory === cat ? 'var(--bb-rose)' : 'var(--bb-line)'}`,
                  background: activeCategory === cat ? '#fff4f5' : '#fff',
                  color: activeCategory === cat ? 'var(--bb-rose)' : 'var(--bb-muted)',
                }}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
          <div className="bb-card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bb-line)' }}>
                  {['File', 'Size', 'Modified', 'Shared'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--bb-muted)', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((file, i) => (
                  <tr key={file.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--bb-line)' : 'none' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {fileIcon(file.category)}
                        <span style={{ color: 'var(--bb-ink)', fontWeight: 700, fontSize: '0.88rem' }}>{file.name}</span>
                        {'url' in file && file.url && (
                          <img src={file.url} alt={file.name} style={{ width: 42, height: 42, objectFit: 'contain', marginLeft: 8, border: '1px solid var(--bb-line)', borderRadius: 8, background: '#fff' }} />
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--bb-muted)', fontSize: '0.84rem' }}>{file.size}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--bb-muted)', fontSize: '0.84rem' }}>{file.modified}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 800, background: file.shared ? '#e6f4ef' : '#f5f0f0', color: file.shared ? 'var(--bb-emerald)' : 'var(--bb-muted)' }}>
                        {file.shared ? 'Shared' : 'Private'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <div className="bb-card" style={{ padding: 18 }}>
            <span className="bb-eyebrow" style={{ display: 'block', marginBottom: 12 }}>Audit Log</span>
            {auditLog.map((entry, i) => (
              <div key={i} style={{ padding: '9px 0', borderBottom: i < auditLog.length - 1 ? '1px solid var(--bb-line)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <strong style={{ color: 'var(--bb-ink)', fontSize: '0.84rem' }}>{entry.user}</strong>
                  <span style={{ color: 'var(--bb-muted)', fontSize: '0.72rem' }}>{entry.time}</span>
                </div>
                <span style={{ color: 'var(--bb-muted)', fontSize: '0.78rem' }}>{entry.action}: {entry.file}</span>
              </div>
            ))}
          </div>
          <div className="bb-card" style={{ padding: 18 }}>
            <span className="bb-eyebrow" style={{ display: 'block', marginBottom: 12 }}>Storage</span>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--bb-muted)', fontSize: '0.82rem', marginBottom: 6 }}>
                <span>Used</span><strong style={{ color: 'var(--bb-ink)' }}>14.2 MB / 500 MB</strong>
              </div>
              <div style={{ height: 7, borderRadius: 999, background: '#efe5df' }}>
                <div style={{ width: '3%', height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, var(--bb-coral), var(--bb-rose))' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
