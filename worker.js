export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    // Handle OPTIONS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Rate limiting (10 requests per minute per IP)
    const ip = request.headers.get("cf-connecting-ip");
    const cache = caches.default;
    const cacheKey = `rate_limit_${ip}`;
    let limit = await cache.match(cacheKey);

    if (limit) {
      const { count, resetTime } = await limit.json();
      if (Date.now() < resetTime) {
        if (count >= 10) {
          return new Response("Too Many Requests", {
            status: 429,
            headers: {
              ...corsHeaders,
              "Retry-After": Math.ceil((resetTime - Date.now()) / 1000)
            }
          });
        }
      }
    }

    // Update rate limit
    const newLimit = {
      count: limit ? (await limit.json()).count + 1 : 1,
      resetTime: Date.now() + 60000 // 1 minute
    };
    ctx.waitUntil(cache.put(cacheKey, new Response(JSON.stringify(newLimit), {
      expirationTtl: 60
    }));

    // Documentation Route
    if (url.pathname === "/docs" || url.pathname === "/") {
      return new Response(getDocumentationHTML(), {
        headers: {
          "Content-Type": "text/html",
          ...corsHeaders
        }
      });
    }

    // API Routes
    try {
      // GET /chat?msg=...
      if (request.method === "GET" && url.pathname === "/chat") {
        const userMsg = url.searchParams.get("msg");
        if (!userMsg) {
          return new Response("Missing 'msg' parameter", {
            status: 400,
            headers: corsHeaders
          });
        }

        const payload = {
          model: "NiansuhAI/DeepSeek-R1",
          messages: [{ role: "user", content: userMsg }]
        };

        return handleAPIRequest(payload, corsHeaders);
      }

      // POST /
      if (request.method === "POST" && url.pathname === "/") {
        const payload = await request.json();
        return handleAPIRequest(payload, corsHeaders);
      }

      return new Response("Not Found", { status: 404, headers: corsHeaders });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
  }
};

async function handleAPIRequest(payload, corsHeaders) {
  const apiResponse = await fetch("https://fast.typegpt.net/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer sk-BiEn3R0oF1aUTAwK8pWUEqvsxBvoHXffvtLBaC5NApX4SViv"
    },
    body: JSON.stringify(payload)
  });

  const data = await apiResponse.json();
  
  // Clean response
  if (data.choices?.[0]?.message?.content) {
    data.choices[0].message.content = cleanResponse(data.choices[0].message.content);
  }

  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}

function cleanResponse(text) {
  // Remove <think> blocks and trim
  return text
    .replace(/<think>[\s\S]*?<\/think>\n?/g, "")
    .trim();
}

function getDocumentationHTML() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DeepSeek-R1 API Docs</title>
  <style>
    :root {
      --primary: #2563eb;
      --dark: #1e293b;
      --light: #f8fafc;
      --border: #e2e8f0;
    }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      line-height: 1.6;
      max-width: 1000px;
      margin: 0 auto;
      padding: 2rem;
      color: var(--dark);
      background-color: var(--light);
    }
    header {
      margin-bottom: 3rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 1rem;
    }
    h1 {
      font-weight: 800;
      font-size: 2.5rem;
      margin: 0;
      background: linear-gradient(90deg, #2563eb, #7c3aed);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .endpoint {
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
      margin: 1.5rem 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border: 1px solid var(--border);
    }
    .method {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-weight: 600;
      font-size: 0.85rem;
      margin-right: 0.5rem;
    }
    .get { background: #ebf8ff; color: #3182ce; }
    .post { background: #ebf8f0; color: #38a169; }
    pre {
      background: #2d2d2d;
      color: #f8f8f2;
      padding: 1.25rem;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 0.9rem;
    }
    code {
      font-family: 'Fira Code', monospace;
      background: #f1f5f9;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-size: 0.9em;
    }
    .tab-group {
      display: flex;
      margin: 1rem 0;
    }
    .tab {
      padding: 0.5rem 1rem;
      cursor: pointer;
      border-bottom: 2px solid transparent;
    }
    .tab.active {
      border-bottom: 2px solid var(--primary);
      font-weight: 600;
    }
    .response-example {
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 1rem;
      margin: 1rem 0;
    }
    @media (max-width: 768px) {
      body {
        padding: 1rem;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>DeepSeek-R1 API</h1>
    <p>Uncensored AI API with filtered responses</p>
  </header>

  <div class="endpoint">
    <div class="method get">GET</div>
    <h2 style="display: inline;">/chat?msg={message}</h2>
    <p>Quick text-based queries:</p>
    
    <div class="tab-group">
      <div class="tab active" onclick="showExample('curl-get')">cURL</div>
      <div class="tab" onclick="showExample('js-get')">JavaScript</div>
    </div>
    
    <div id="curl-get" class="example">
      <pre>curl "https://af-evil-ai.farhanbd637.workers.dev/chat?msg=Hello"</pre>
    </div>
    
    <div id="js-get" class="example" style="display:none">
      <pre>fetch("https://af-evil-ai.farhanbd637.workers.dev/chat?msg=Hello")
  .then(response => response.json())
  .then(data => console.log(data));</pre>
    </div>
    
    <h3>Response Example</h3>
    <div class="response-example">
      <pre>{
  "choices": [{
    "message": {
      "content": "Response text here (with <think> blocks removed)"
    }
  }]
}</pre>
    </div>
  </div>

  <div class="endpoint">
    <div class="method post">POST</div>
    <h2 style="display: inline;">/</h2>
    <p>Structured API requests with full control:</p>
    
    <div class="tab-group">
      <div class="tab active" onclick="showExample('curl-post')">cURL</div>
      <div class="tab" onclick="showExample('js-post')">JavaScript</div>
    </div>
    
    <div id="curl-post" class="example">
      <pre>curl -X POST "https://af-evil-ai.farhanbd637.workers.dev/" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "NiansuhAI/DeepSeek-R1",
    "messages": [
      {"role": "user", "content": "Your message here"}
    ]
  }'</pre>
    </div>
    
    <div id="js-post" class="example" style="display:none">
      <pre>fetch("https://af-evil-ai.farhanbd637.workers.dev/", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "NiansuhAI/DeepSeek-R1",
    messages: [
      {role: "user", content: "Your message here"}
    ]
  })
})</pre>
    </div>
    
    <h3>Response Example</h3>
    <div class="response-example">
      <pre>{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "choices": [{
    "message": {
      "content": "Full response here"
    }
  }],
  "usage": {
    "prompt_tokens": 9,
    "completion_tokens": 12,
    "total_tokens": 21
  }
}</pre>
    </div>
  </div>

  <div class="endpoint">
    <h2>Rate Limiting</h2>
    <p><code>10 requests per minute per IP address</code></p>
    <p>Exceeding limits returns HTTP 429 with <code>Retry-After</code> header.</p>
  </div>

  <script>
    function showExample(id) {
      document.querySelectorAll('.example').forEach(el => {
        el.style.display = 'none';
      });
      document.getElementById(id).style.display = 'block';
      
      // Update active tab
      document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
      });
      event.target.classList.add('active');
    }
  </script>
</body>
</html>
  `;
}
