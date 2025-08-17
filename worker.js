// DeepSeek-R1 API Worker with Hardcoded API Key

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Security headers and CORS
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains"
    };

    // Handle OPTIONS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { 
        status: 204,
        headers: corsHeaders 
      });
    }

    try {
      // Documentation Route
      if (url.pathname === "/docs" || url.pathname === "/") {
        return new Response(getDocumentationHTML(), {
          headers: {
            "Content-Type": "text/html",
            ...corsHeaders
          }
        });
      }

      // Health check endpoint
      if (url.pathname === "/health") {
        return new Response(JSON.stringify({
          status: "healthy",
          timestamp: new Date().toISOString(),
          version: "2.0.0"
        }), {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        });
      }

      // API Routes
      // GET /chat?msg=...
      if (request.method === "GET" && url.pathname === "/chat") {
        const userMsg = url.searchParams.get("msg");
        
        if (!userMsg || userMsg.trim().length === 0) {
          return new Response(JSON.stringify({ 
            error: "Missing or empty 'msg' parameter",
            example: "/chat?msg=Hello"
          }), {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders
            }
          });
        }

        // Validate message length
        if (userMsg.length > 4000) {
          return new Response(JSON.stringify({ 
            error: "Message too long. Maximum 4000 characters allowed." 
          }), {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders
            }
          });
        }

        const payload = {
          model: "NiansuhAI/DeepSeek-R1",
          messages: [{ role: "user", content: sanitizeInput(userMsg) }],
          max_tokens: 2000,
          temperature: 0.7
        };

        return handleAPIRequest(payload, corsHeaders);
      }

      // POST /
      if (request.method === "POST" && url.pathname === "/") {
        let payload;
        try {
          payload = await request.json();
        } catch (error) {
          return new Response(JSON.stringify({ 
            error: "Invalid JSON in request body" 
          }), {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders
            }
          });
        }

        // Validate payload structure
        const validation = validatePayload(payload);
        if (!validation.valid) {
          return new Response(JSON.stringify({ 
            error: validation.error 
          }), {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders
            }
          });
        }

        // Sanitize messages
        if (payload.messages) {
          payload.messages = payload.messages.map(msg => ({
            ...msg,
            content: sanitizeInput(msg.content)
          }));
        }

        return handleAPIRequest(payload, corsHeaders);
      }

      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });

    } catch (error) {
      console.error("Worker error:", error);
      return new Response(JSON.stringify({ 
        error: "Internal server error",
        message: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
  }
};

// Hardcoded API key
const API_KEY = "sk-BiEn3R0oF1aUTAwK8pWUEqvsxBvoHXffvtLBaC5NApX4SViv";

// Enhanced API request handling
async function handleAPIRequest(payload, corsHeaders) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const apiResponse = await fetch("https://fast.typegpt.net/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!apiResponse.ok) {
      throw new Error(`API request failed: ${apiResponse.status} ${apiResponse.statusText}`);
    }

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

  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error("Request timeout");
    }
    
    throw error;
  }
}

// Enhanced response cleaning
function cleanResponse(text) {
  if (typeof text !== 'string') return text;
  
  return text
    .replace(/<think>[\s\S]*?<\/think>\n?/gi, "") // Remove <think> blocks
    .replace(/<[^>]*>/g, "") // Remove any HTML tags
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

// Input sanitization
function sanitizeInput(input) {
  if (typeof input !== 'string') return String(input);
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .trim();
}

// Payload validation
function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: "Invalid payload format" };
  }

  if (!payload.model) {
    return { valid: false, error: "Missing 'model' field" };
  }

  if (!Array.isArray(payload.messages)) {
    return { valid: false, error: "'messages' must be an array" };
  }

  if (payload.messages.length === 0) {
    return { valid: false, error: "'messages' array cannot be empty" };
  }

  for (const msg of payload.messages) {
    if (!msg.role || !msg.content) {
      return { valid: false, error: "Each message must have 'role' and 'content'" };
    }
  }

  return { valid: true };
}

// Updated documentation
function getDocumentationHTML() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DeepSeek-R1 API v2.0</title>
  <style>
    :root {
      --primary: #2563eb;
      --dark: #1e293b;
      --light: #f8fafc;
      --border: #e2e8f0;
      --success: #10b981;
      --warning: #f59e0b;
      --error: #ef4444;
    }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
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
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 600;
      margin-left: 0.5rem;
    }
    .badge.success { background: #ecfdf5; color: var(--success); }
    .badge.warning { background: #fffbeb; color: var(--warning); }
    .endpoint {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      margin: 2rem 0;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      border: 1px solid var(--border);
    }
    .method {
      display: inline-block;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.875rem;
      margin-right: 0.75rem;
    }
    .get { background: #dbeafe; color: #1e40af; }
    .post { background: #dcfce7; color: #166534; }
    pre {
      background: #1e293b;
      color: #e2e8f0;
      padding: 1.5rem;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 0.875rem;
      line-height: 1.5;
    }
    code {
      font-family: 'Fira Code', monospace;
      background: #f1f5f9;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.875rem;
    }
    .tab-group {
      display: flex;
      margin: 1.5rem 0;
      border-bottom: 1px solid var(--border);
    }
    .tab {
      padding: 0.75rem 1.5rem;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }
    .tab.active {
      border-bottom: 2px solid var(--primary);
      font-weight: 600;
      color: var(--primary);
    }
    .response-example {
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.5rem;
      margin: 1.5rem 0;
    }
    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
      margin: 2rem 0;
    }
    .feature {
      background: white;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.5rem;
    }
    @media (max-width: 768px) {
      body {
        padding: 1rem;
      }
      h1 {
        font-size: 2rem;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>DeepSeek-R1 API <span class="badge success">v2.0</span></h1>
    <p>Enhanced AI API with security and input validation - no rate limits</p>
  </header>

  <div class="features">
    <div class="feature">
      <h3>🔒 Security</h3>
      <p>Input sanitization, security headers, and comprehensive validation</p>
    </div>
    <div class="feature">
      <h3>⚡ No Rate Limits</h3>
      <p>Unlimited requests without rate limiting restrictions</p>
    </div>
    <div class="feature">
      <h3>✅ Validation</h3>
      <p>Comprehensive input validation and error handling</p>
    </div>
    <div class="feature">
      <h3>📊 Monitoring</h3>
      <p>Health checks and detailed error responses</p>
    </div>
  </div>

  <div class="endpoint">
    <div class="method get">GET</div>
    <h2 style="display: inline;">/chat?msg={message}</h2>
    <p>Quick text-based queries with validation:</p>
    
    <div class="tab-group">
      <div class="tab active" onclick="showExample('curl-get')">cURL</div>
      <div class="tab" onclick="showExample('js-get')">JavaScript</div>
    </div>
    
    <div id="curl-get" class="example">
      <pre>curl "https://your-worker.your-subdomain.workers.dev/chat?msg=Hello"</pre>
    </div>
    
    <div id="js-get" class="example" style="display:none">
      <pre>fetch("https://your-worker.your-subdomain.workers.dev/chat?msg=Hello")
  .then(response => response.json())
  .then(data => console.log(data));</pre>
    </div>
    
    <h3>Response Example</h3>
    <div class="response-example">
      <pre>{
  "choices": [{
    "message": {
      "content": "Clean response text..."
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
      <pre>curl -X POST "https://your-worker.your-subdomain.workers.dev/" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "NiansuhAI/DeepSeek-R1",
    "messages": [
      {"role": "user", "content": "Your message here"}
    ],
    "max_tokens": 2000,
    "temperature": 0.7
  }'</pre>
    </div>
    
    <div id="js-post" class="example" style="display:none">
      <pre>fetch("https://your-worker.your-subdomain.workers.dev/", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "NiansuhAI/DeepSeek-R1",
    messages: [
      {role: "user", content: "Your message here"}
    ],
    max_tokens: 2000,
    temperature: 0.7
  })
})</pre>
    </div>
  </div>

  <div class="endpoint">
    <h2>🔍 Health Check</h2>
    <p>Monitor service health:</p>
    <pre>GET /health</pre>
  </div>

  <div class="endpoint">
    <h2>⚙️ Configuration</h2>
    <p>Configuration details:</p>
    <ul>
      <li><code>API Version</code>: 2.0.0</li>
      <li><code>Rate Limits</code>: None - unlimited requests</li>
    </ul>
  </div>

  <script>
    function showExample(id) {
      document.querySelectorAll('.example').forEach(el => {
        el.style.display = 'none';
      });
      document.getElementById(id).style.display = 'block';
      
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
