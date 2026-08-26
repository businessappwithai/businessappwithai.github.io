# posthog-js, vendored

`array.full.no-external.js` &mdash; **posthog-js 1.421.0**, byte-identical to the file
published on npm as `posthog-js@1.421.0/dist/array.full.no-external.js`
(Apache-2.0 AND MIT).

## Why this build, and not the snippet

The usual way to add PostHog is a script tag pointing at
`us-assets.i.posthog.com`. This site does not load third-party JavaScript &mdash; every
payload it needs is served from its own origin, and the guide's chapter 09 tells
the reader so in as many words. So the library is vendored, like PGlite, the
WebContainer API and the fonts beside it.

Of the five builds npm ships, `array.full.no-external` is the one that keeps that
promise:

| build | bundles replay + surveys | fetches anything at runtime |
|---|---|---|
| `array.js` | no | yes &mdash; lazily, from the assets CDN |
| `array.full.js` | yes | yes, for anything else |
| **`array.full.no-external.js`** | **yes** | **no** |

`assets/js/analytics.js` pairs it with `disable_external_dependency_loading: true`,
so no *further* executable code is pulled from PostHog's CDN once this file has
loaded.

That is not the same as making no request, and it is worth being exact about
which requests remain, because the wording in `privacy.html` is held to it. With
analytics on, a page load produces three kinds of request to PostHog and no
others:

| request | host | why |
|---|---|---|
| `GET /array/<key>/config` | `us-assets.i.posthog.com` | the project's own settings |
| `POST /flags/` | `api_host` | feature flags and the replay decision |
| `POST /e/` | `api_host` | the events themselves |

With no key set, or with the reader opted out, this file is never even fetched
and none of the three happen.

## Re-vendoring

```sh
curl -sO https://registry.npmjs.org/posthog-js/-/posthog-js-<version>.tgz
tar xzf posthog-js-<version>.tgz package/dist/array.full.no-external.js
cp package/dist/array.full.no-external.js assets/vendor/posthog/
```

Then update the version at the top of this file. Do not edit the bundle: the last
line is a `sourceMappingURL` comment for a `.map` that is deliberately not
shipped, so browser devtools log one 404 when they are open and nothing else
ever asks for it.
