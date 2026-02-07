/**
 * Custom Pages Router _error page.
 * Next.js auto-generates _error.js that uses <Head> from next/head,
 * which requires HeadManagerContext — unavailable during static prerender.
 * This minimal version avoids that dependency.
 */
import type { NextPageContext } from 'next'

interface ErrorProps {
  statusCode: number | undefined
}

function ErrorPage({ statusCode }: ErrorProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#0a0a0a',
      color: '#fafafa',
    }}>
      <h1 style={{ fontSize: '4rem', margin: 0, fontWeight: 700 }}>
        {statusCode || 'Erro'}
      </h1>
      <p style={{ fontSize: '1.25rem', color: '#888', marginTop: '0.5rem' }}>
        {statusCode === 404
          ? 'Página não encontrada'
          : 'Ocorreu um erro no servidor'}
      </p>
      <a
        href="/"
        style={{
          marginTop: '2rem',
          padding: '0.75rem 1.5rem',
          backgroundColor: '#333',
          color: '#fff',
          borderRadius: '0.5rem',
          textDecoration: 'none',
          fontSize: '0.875rem',
        }}
      >
        Voltar ao Início
      </a>
    </div>
  )
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext): ErrorProps => {
  const statusCode = res ? res.statusCode : err ? (err as { statusCode?: number }).statusCode : 404
  return { statusCode }
}

export default ErrorPage
