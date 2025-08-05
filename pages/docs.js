import Head from 'next/head';
import Link from 'next/link';

export default function Docs() {
  return (
    <>
      <Head>
        <title>Usage Docs - AF-EVIL-AI</title>
      </Head>
      <main className="container">
        <h1>📄 Usage Documentation</h1>
        <p>This is the official documentation for interacting with the AF-EVIL-AI API.</p>
        <h2>Endpoints</h2>
        <ul>
          <li><strong>POST /api/chat</strong> — Send a message to the evil AI</li>
        </ul>
        <h2>Example Request</h2>
        <pre>{`
POST /api/chat
Content-Type: application/json

{
  "message": "Tell me an evil joke."
}
        `}</pre>
        <h2>Response</h2>
        <pre>{`
{
  "name": "AF-EVIL-AI",
  "response": "This is AF-EVIL-AI speaking: Here's your evil joke...",
  "copyright": "© t.me/AF_Team_Owner"
}
        `}</pre>
        <Link href="/">← Back to AI</Link>
      </main>
    </>
  );
}
