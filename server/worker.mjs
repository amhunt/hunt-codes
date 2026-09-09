// Cloudflare Worker entry for hunt.codes (see wrangler.jsonc).
//
// Phase 1 of the AWS → Cloudflare migration: this Worker serves the rsbuild
// output as static assets (SPA fallback for unknown paths) and proxies /api/*
// to the existing CloudFront + Lambda stack, so the copy on the staging domain
// is fully functional before the API itself is ported (Phase 2 replaces the
// proxy with the real handler + D1).
//
// Hosts: PRIMARY_HOST is the canonical host for this environment
// (andysartifacts.com for the shop domains, www.hunt.codes in production).
// Anything other than CANONICAL_HOST is a copy of the hunt.codes build and is
// served with a noindex header so search engines never index the duplicate.
//
// ROOT_REDIRECT (optional): where `/` should land. The shop domains
// (andysartifacts.com, artifactandy.com) are Andrew's 3D print shop, so they
// open on /artifacts; production leaves it unset and keeps the WebGL landing
// page.

const API_PREFIX = "/api/";

const isBodyless = (method) => method === "GET" || method === "HEAD";

const proxyApi = (request, url, env) => {
  const target = new URL(url.pathname + url.search, env.API_ORIGIN);
  const headers = new Headers(request.headers);
  // fetch() sets Host from the target; the rest (content-type,
  // x-amz-content-sha256 for the OAC body hash, etc.) passes through.
  headers.delete("host");
  const init = { method: request.method, headers, redirect: "manual" };
  if (!isBodyless(request.method)) init.body = request.body;
  return fetch(target, init);
};

const withHeader = (response, name, value) => {
  const headers = new Headers(response.headers);
  headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // www.<primary> → <primary>. In production PRIMARY_HOST is already www,
    // so this never matches there.
    if (url.hostname === `www.${env.PRIMARY_HOST}`) {
      url.hostname = env.PRIMARY_HOST;
      return Response.redirect(url.toString(), 301);
    }

    if (env.ROOT_REDIRECT && url.pathname === "/") {
      url.pathname = env.ROOT_REDIRECT;
      return Response.redirect(url.toString(), 302);
    }

    if (url.pathname.startsWith(API_PREFIX)) {
      return proxyApi(request, url, env);
    }

    const response = await env.ASSETS.fetch(request);
    if (url.hostname !== env.CANONICAL_HOST) {
      return withHeader(response, "X-Robots-Tag", "noindex, nofollow");
    }
    return response;
  },
};
