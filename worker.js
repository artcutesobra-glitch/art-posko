export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const mode  = url.searchParams.get("mode");
    const token = url.searchParams.get("token");
    const pin   = url.searchParams.get("pin");

    if (!token) {
      return new Response("INVALID", { status: 400 });
    }

    // ============================
    // SAVE (FROM MASTER PHONE)
    // ============================
    if (mode === "save") {
      if (!pin) {
        return new Response("NO PIN", { status: 400 });
      }

      await env.DB.put(token, JSON.stringify({
        pin,
        used: false
      }));

      return new Response("SAVED", { status: 200 });
    }

    // ============================
    // VERIFY (FROM ANY DEVICE)
    // ============================
    const data = await env.DB.get(token);
    if (!data) {
      return new Response("INVALID", { status: 403 });
    }

    const obj = JSON.parse(data);

    if (obj.used) {
      return new Response("USED", { status: 403 });
    }

    if (obj.pin !== pin) {
      return new Response("WRONG PIN", { status: 403 });
    }

    // mark as USED (ONE-TIME)
    obj.used = true;
    await env.DB.put(token, JSON.stringify(obj));

    return new Response("OK", { status: 200 });
  }
};
