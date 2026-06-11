export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/translate") {
      const apiKey = env.ANTHROPIC_API_KEY;
      
      if (!apiKey) {
        return new Response("NO API KEY FOUND", { status: 500 });
      }

      return new Response("API KEY FOUND: " + apiKey.substring(0, 20) + "...", { status: 200 });
    }

    try {
      return await env.ASSETS.fetch(request);
    } catch {
      return new Response("Not found", { status: 404 });
    }
  },
};
}
