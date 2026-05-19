import { useState } from 'react'
import { Package, Plus, ShoppingBag, TrendingUp } from 'lucide-react'

const PRODUCTS = [
  { id: 'prod_001', name: 'Solitaire Diamond Ring', price: '£3,400', stock: 3, category: 'rings', status: 'active' },
  { id: 'prod_002', name: 'Halo Engagement Ring', price: '£4,800', stock: 1, category: 'rings', status: 'active' },
  { id: 'prod_003', name: 'Diamond Tennis Bracelet', price: '£2,600', stock: 2, category: 'bracelets', status: 'active' },
  { id: 'prod_004', name: 'Emerald Pendant', price: '£1,800', stock: 0, category: 'pendants', status: 'out_of_stock' },
  { id: 'prod_005', name: 'Gold Stud Earrings', price: '£1,120', stock: 5, category: 'earrings', status: 'active' },
]

const ORDERS = [
  { id: 'ord_001', customer: 'Emma Wilson', product: 'Halo Ring', total: '£4,800', status: 'processing', date: '2026-01-24' },
  { id: 'ord_002', customer: 'Sarah Johnson', product: 'Solitaire', total: '£3,400', status: 'shipped', date: '2026-01-22' },
  { id: 'ord_003', customer: 'Michael Brown', product: 'Pendant', total: '£1,680', status: 'delivered', date: '2026-01-20' },
]

export default function Storefront() {
  const [tab, setTab] = useState<'products' | 'orders'>('products')

  const orderStatusColor = (s: string) => {
    if (s === 'delivered') return { bg: '#e6f4ef', color: 'var(--bb-emerald)' }
    if (s === 'shipped') return { bg: '#f0e8ff', color: 'var(--bb-violet)' }
    return { bg: '#fff4e5', color: 'var(--bb-coral)' }
  }

  return (
    <div className="bb-page animate-fade-up">
      <header className="bb-page-header">
        <div>
          <span className="bb-eyebrow" style={{ color: 'var(--bb-pillar-4)' }}>The shop</span>
          <h1 className="bb-display">Orders &amp; <span className="bb-script" style={{ fontSize: '1.25em', color: 'var(--bb-rose)' }}>inventory</span>.</h1>
        </div>
        <button className="bb-btn-primary bb-lift"><Plus size={16} /> Add</button>
      </header>

      <div className="bb-grid-2-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 22 }}>
        {[
          { icon: ShoppingBag, label: 'Products', value: '5', color: 'var(--bb-rose)' },
          { icon: TrendingUp, label: 'Revenue (Jan)', value: '£18.8k', color: 'var(--bb-emerald)' },
          { icon: Package, label: 'Pending', value: '3', color: 'var(--bb-coral)' },
        ].map(s => (
          <div key={s.label} className="bb-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.9)', border: '1px solid var(--bb-line)' }}>
              <s.icon size={17} style={{ color: s.color }} />
            </div>
            <div>
              <div className="bb-serif" style={{ fontSize: '1.5rem', color: 'var(--bb-ink)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ color: 'var(--bb-muted)', fontSize: '0.76rem', marginTop: 3 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {(['products', 'orders'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: '8px 16px', borderRadius: 999, fontWeight: 600, cursor: 'pointer', fontSize: '0.84rem',
              border: `1px solid ${tab === t ? 'var(--bb-rose)' : 'var(--bb-line)'}`,
              background: tab === t ? '#fff4f5' : '#fff',
              color: tab === t ? 'var(--bb-rose)' : 'var(--bb-muted)', textTransform: 'capitalize',
            }}>{t}</button>
        ))}
      </div>

      {tab === 'products' && (
        <div className="bb-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bb-line)' }}>
                {['Product', 'Price', 'Stock', 'Status'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--bb-muted)', fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PRODUCTS.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: i < PRODUCTS.length - 1 ? '1px solid var(--bb-line)' : 'none' }}>
                  <td style={{ padding: '13px 16px', color: 'var(--bb-ink)', fontWeight: 600 }}>{p.name}</td>
                  <td style={{ padding: '13px 16px', color: 'var(--bb-ink)' }}>{p.price}</td>
                  <td style={{ padding: '13px 16px', color: p.stock === 0 ? '#ad3f70' : 'var(--bb-text)' }}>{p.stock}</td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, background: p.status === 'active' ? '#e6f4ef' : '#fff0f3', color: p.status === 'active' ? 'var(--bb-emerald)' : '#ad3f70' }}>
                      {p.status === 'active' ? 'Active' : 'Out of stock'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'orders' && (
        <div className="bb-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bb-line)' }}>
                {['Customer', 'Product', 'Total', 'Status'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--bb-muted)', fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ORDERS.map((o, i) => {
                const sc = orderStatusColor(o.status)
                return (
                  <tr key={o.id} style={{ borderBottom: i < ORDERS.length - 1 ? '1px solid var(--bb-line)' : 'none' }}>
                    <td style={{ padding: '13px 16px', color: 'var(--bb-ink)', fontWeight: 600 }}>{o.customer}</td>
                    <td style={{ padding: '13px 16px', color: 'var(--bb-text)' }}>{o.product}</td>
                    <td style={{ padding: '13px 16px', color: 'var(--bb-ink)', fontWeight: 600 }}>{o.total}</td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, ...sc, textTransform: 'capitalize' }}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
