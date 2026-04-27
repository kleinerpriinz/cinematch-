import './globals.css'
import Nav from './components/Nav'

export const metadata = {
  title: 'CineMatch',
  description: 'Filmclub für Freunde',
}

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body style={{ margin: 0, padding: 0, background: '#0e0e0f' }}>
        <Nav />
        {children}
      </body>
    </html>
  )
}