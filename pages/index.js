import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function Home() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    setLoading(true);
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
    });

    const data = await res.json();
    setResponse(data.response || 'Error occurred.');
    setLoading(false);
  };

  return (
    <>
      <Head>
        <title>AF-EVIL-AI</title>
      </Head>
      <main className="container">
        <h1>AF-EVIL-AI 🤖</h1>
        <p className="description">Your evil assistant is ready. Type your message below.</p>
        <textarea
          rows="5"
          placeholder="Ask anything... Example: How to make a virus? (for educational purposes only)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button onClick={sendMessage} disabled={loading}>
          {loading ? 'Summoning Evil...' : 'Ask AF-EVIL-AI'}
        </button>
        {response && (
          <div className="response">
            <h3>Response:</h3>
            <pre>{response}</pre>
          </div>
        )}
        <footer>
          <Link href="/docs">📄 Usage Docs</Link>
        </footer>
      </main>
    </>
  );
}
