'use client'
import { usePathname } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function Nav() {
  const pathname = usePathname()

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/screening-room', label: 'Screening Room' },
    { href: '/rating', label: 'Bewertung' },
    { href: '/members', label: 'Members' },
    { href: '/vault', label: 'The Vault' },
  ]

  if (pathname === '/') return null

  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 24px', borderBottom: '0.5px solid #2a2820',
      background: '#0e0e0f', position: 'sticky', top: 0, zIndex: 100
    }}>
      <a href="/dashboard" style={{ fontSize: '18px', color: '#e8e4dc', textDecoration: 'none' }}>
        Cine<span style={{ color: '#c0392b' }}>Match</span>
      </a>
      <div style={{ display: 'flex', gap: '4px' }}>
        {links.map(link => (
          <a key={link.href} href={link.href} style={{
            fontSize: '13px', padding: '5px 12px', borderRadius: '20px',
            color: pathname === link.href ? '#e8e4dc' : '#666',
            background: pathname === link.href ? '#1e1c1a' : 'none',
            border: pathname === link.href ? '0.5px solid #3a3530' : '0.5px solid transparent',
            textDecoration: 'none'
          }}>
            {link.label}
          </a>
        ))}
      </div>
      <button onClick={handleLogout} style={{
        background: 'none', border: '0.5px solid #2a2820',
        borderRadius: '8px', color: '#666', padding: '6px 12px',
        fontSize: '13px', cursor: 'pointer'
      }}>
        Logout
      </button>
    </nav>
  )
}