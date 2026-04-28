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
    { href: '/profil', label: 'Profil' },
  ]

  if (pathname === '/') return null

  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
      padding: '14px 24px', borderBottom: '0.5px solid #1a1a1a',
      background: '#080808', position: 'sticky', top: 0, zIndex: 100
    }}>
      <div style={{ display: 'flex', gap: '4px', marginRight: '16px' }}>
        {links.map(link => (
          <a key={link.href} href={link.href} style={{
            fontSize: '13px', padding: '5px 12px', borderRadius: '20px',
            color: pathname === link.href ? '#e8e4dc' : '#555',
            background: pathname === link.href ? '#161616' : 'none',
            border: pathname === link.href ? '0.5px solid #2a2a2a' : '0.5px solid transparent',
            textDecoration: 'none'
          }}>
            {link.label}
          </a>
        ))}
      </div>
      <button onClick={handleLogout} style={{
        background: 'none', border: '0.5px solid #1a1a1a',
        borderRadius: '8px', color: '#444', padding: '6px 12px',
        fontSize: '13px', cursor: 'pointer'
      }}>
        Logout
      </button>
    </nav>
  )
}