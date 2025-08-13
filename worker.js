export default {
  async fetch(request, env) {
    // CORS Headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Handle OPTIONS (Preflight)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    
    // --- GET REQUEST: /chat?msg=Hello ---
    if (request.method === "GET" && url.pathname === "/chat") {
      const userMsg = url.searchParams.get("msg");
      
      if (!userMsg) {
        return new Response("Error: 'msg' parameter required!", { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "text/plain" } 
        });
      }

      try {
        const apiResponse = await fetch("https://fast.typegpt.net/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer sk-BiEn3R0oF1aUTAwK8pWUEqvsxBvoHXffvtLBaC5NApX4SViv",
          },
          body: JSON.stringify({
            model: "NiansuhAI/DeepSeek-R1",
            messages: [{ role: "user", content: userMsg }],
          }),
        });

        const data = await apiResponse.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- POST REQUEST (Original API Forwarding) ---
    if (request.method === "POST") {
      try {
        const payload = await request.json();
        const apiResponse = await fetch("https://fast.typegpt.net/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer sk-BiEn3R0oF1aUTAwK8pWUEqvsxBvoHXffvtLBaC5NApX4SViv",
          },
          body: JSON.stringify(payload),
        });

        const data = await apiResponse.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Block other methods/routes
    return new Response("Not Found", { 
      status: 404, 
      headers: { ...corsHeaders, "Content-Type": "text/plain" } 
    });
  },
};
