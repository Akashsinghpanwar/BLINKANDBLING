import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { fadeUp, stagger } from '../../lib/motion'
import { useProjects } from '../../context/ProjectContext'

const stages = [
  { id: 'intake', label: 'Intake complete', completed: true, date: 'Jan 15', notes: 'Requirements captured via Luna' },
  { id: 'concepts', label: 'Concepts generated', completed: true, date: 'Jan 17', notes: '6 concepts created by AI' },
  { id: 'concept_review', label: 'You shortlisted a design', completed: true, date: 'Jan 19', notes: 'Preferred style selected' },
  { id: '3d_render', label: '3D render created', completed: true, date: 'Jan 21', notes: 'Photorealistic render complete' },
  { id: 'cad_refinement', label: 'CAD refinement', completed: false, date: null, notes: 'Technical refinement in progress' },
  { id: 'customer_approval', label: 'Your approval', completed: false, date: null, notes: 'Waiting for your sign-off' },
  { id: 'production', label: 'Manufacturing', completed: false, date: null, notes: 'Handcrafted creation' },
  { id: 'delivered', label: 'Delivered', completed: false, date: null, notes: 'Presented to you' },
]

export default function CustomerTimeline() {
  const { portalProject } = useProjects()
  const rawProjectName = portalProject?.name || 'Customer workspace'
  const projectName = rawProjectName.includes(' - ') ? rawProjectName.split(' - ').slice(1).join(' - ') : rawProjectName
  const completedCount = stages.filter(s => s.completed).length
  const progress = Math.round((completedCount / stages.length) * 100)

  return (
    <motion.div variants={stagger(0.08)} initial="hidden" animate="visible">
      <motion.div variants={fadeUp} style={{ marginBottom: 28 }}>
        <span className="bb-eyebrow" style={{ display: 'block', marginBottom: 10, color: 'var(--bb-pillar-3)' }}>Project journey</span>
        <h1 className="bb-display" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)', marginBottom: 18 }}>
          {projectName}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1, height: 8, borderRadius: 999, background: '#efe5df', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: [0.22, 0.9, 0.32, 1] }}
              style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, var(--bb-coral), var(--bb-rose))' }}
            />
          </div>
          <strong style={{ color: 'var(--bb-ink)', flexShrink: 0 }}>{progress}%</strong>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="bb-card" style={{ padding: 32, position: 'relative', borderRadius: 18 }}>
        <div style={{ position: 'absolute', left: 50, top: 60, bottom: 32, width: 2, background: '#efe5df' }}>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${progress}%` }}
            transition={{ duration: 1.2, ease: [0.22, 0.9, 0.32, 1], delay: 0.2 }}
            style={{ width: '100%', background: 'linear-gradient(180deg, var(--bb-coral), var(--bb-rose))' }}
          />
        </div>
        {stages.map((stage, i) => (
          <motion.div
            key={stage.id}
            variants={fadeUp}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: i < stages.length - 1 ? 26 : 0, position: 'relative' }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', zIndex: 1,
              border: `2px solid ${stage.completed ? 'var(--bb-rose)' : 'var(--bb-line)'}`,
              background: stage.completed ? 'linear-gradient(135deg, var(--bb-coral), var(--bb-rose))' : '#fff',
              boxShadow: stage.completed ? '0 6px 14px rgba(207,95,145,0.28)' : 'none',
            }}>
              {stage.completed ? <CheckCircle2 size={16} style={{ color: '#fff' }} /> : (
                <span style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--bb-muted)' }}>{i + 1}</span>
              )}
            </div>
            <div style={{ flex: 1, paddingTop: 7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                <strong style={{ color: stage.completed ? 'var(--bb-ink)' : 'var(--bb-muted)', fontSize: '1rem', fontFamily: 'var(--app-font-display)', fontWeight: 500 }}>{stage.label}</strong>
                {stage.completed && <span style={{ padding: '2px 10px', borderRadius: 999, background: '#e6f4ef', color: 'var(--bb-emerald)', fontSize: '0.7rem', fontWeight: 800 }}>Done</span>}
                {!stage.completed && i === completedCount && <span style={{ padding: '2px 10px', borderRadius: 999, background: '#fff4e5', color: 'var(--bb-coral)', fontSize: '0.7rem', fontWeight: 800 }}>In progress</span>}
              </div>
              <p style={{ margin: 0, color: 'var(--bb-muted)', fontSize: '0.86rem' }}>
                {stage.notes}{stage.date ? ` · ${stage.date}` : ''}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )
}
