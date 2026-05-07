import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="pt-BR">
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="https://www.google.com/s2/favicons?domain=nasa.gov&sz=192" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <meta name="description" content="O Náufrago Espacial - Jogo de sobrevivência que incentiva hidratação e pausas ativas" />
        <meta name="theme-color" content="#1a0a2e" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
