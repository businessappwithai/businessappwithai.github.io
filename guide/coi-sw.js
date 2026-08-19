/**
 * Cross-origin isolation, for a static host that cannot send headers.
 *
 * Chapter 10 boots a WebContainer, and a WebContainer needs `SharedArrayBuffer`,
 * which a browser only hands to a document that is *cross-origin isolated*:
 * `Cross-Origin-Opener-Policy: same-origin` and
 * `Cross-Origin-Embedder-Policy: require-corp`, both on the document's own
 * response. GitHub Pages serves static files and lets nobody set a header, so
 * the page would arrive un-isolated and the chapter could never work.
 *
 * A Service Worker can. It sits between the page and the network, so the second
 * time the document is requested it is this file that answers, and this file can
 * put the two headers on. The page registers it, reloads once, and comes back
 * isolated. The technique is the same one the `coi-serviceworker` package
 * popularised; this is a small implementation of it that does nothing else.
 *
 * Deliberately narrow. The scope has to be `/guide/` — a worker can only claim
 * URLs at or below its own path, and the page it must claim lives there — but it
 * rewrites exactly one document and passes everything else straight through
 * untouched. Chapter 09, the other chapters and the rest of the site are not
 * isolated and must not be: isolation is a constraint, not an upgrade, and a
 * page that does not need `SharedArrayBuffer` gains nothing from it and loses
 * the ability to embed a cross-origin resource that has not opted in.
 *
 * Same-origin subresources need no change, which is why this worker only
 * rewrites the document. An absent `Cross-Origin-Resource-Policy` is read as
 * `same-origin`, exactly what the isolated document asks of them, so the
 * stylesheets, scripts and JSON this page loads are already acceptable. The
 * general-purpose implementations proxy every request and stamp
 * `Cross-Origin-Resource-Policy: cross-origin` on all of it, because they cannot
 * know what a page will load; this one does know, and a worker that passes
 * subresources straight through cannot slow them down or get them wrong.
 *
 * `require-corp` rather than `credentialless`: every subresource here is
 * same-origin, so the stricter mode costs nothing and is the mode with the
 * longest browser support. WebContainer previews are served to match whichever
 * the embedder chose.
 */

/** The one document this worker rewrites. Everything else is passed through. */
const ISOLATED = new URL("run-real-stack.html", self.registration.scope).pathname;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Documents only. A subresource has no opener or embedder policy of its own,
  // so rewriting one would be a way to break something for no gain — and not
  // touching them means this worker never re-fetches a stylesheet or a
  // megabyte of JSON that the browser already had.
  //
  // It also sidesteps a long-standing Chromium bug that the general-purpose
  // implementations of this technique have to work around: a request with
  // `cache: "only-if-cached"` and a mode other than `same-origin` throws if a
  // Service Worker calls `fetch` on it. Such a request is never a navigation,
  // so it is already excluded here; the guard is named so that a later edit
  // does not quietly reintroduce it.
  if (request.mode !== "navigate") return;
  if (request.cache === "only-if-cached" && request.mode !== "same-origin") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname !== ISOLATED) return;

  event.respondWith(isolate(request));
});

async function isolate(request) {
  const response = await fetch(request);

  // An opaque or errored response has no headers to copy and no body to read.
  // Handing it back untouched is the only correct move; the page then finds
  // itself un-isolated and says so rather than failing silently.
  if (!response || response.status === 0 || response.type === "opaque") return response;

  const headers = new Headers(response.headers);
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Embedder-Policy", "require-corp");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
