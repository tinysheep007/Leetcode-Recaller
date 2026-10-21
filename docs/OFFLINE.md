# Offline operation and testing

## Local production test

```sh
npm run build
npm start -- --port 3001
```

Open http://127.0.0.1:3001 online. Wait for **Ready for offline use**, import the ZIP on that origin, then stop that production server with Ctrl+C. Open a new tab at the same URL. The cached app should load, images/notes should reveal, and ratings should save without a server. Restart with the same command after testing.

Port 3001 isolates production service workers from development at port 3000. `npm run dev` intentionally does not register a service worker. Offline behavior must be tested with a production build. Do not use a production worker on the development origin; an existing worker continues to serve its cached shell until unregistered through browser developer tools.

## iPhone

Deploy to HTTPS. In Safari, open the app, choose Share → Add to Home Screen, then open that Home Screen app online. Import your notes there and wait for **Ready for offline use**. Close it, enable airplane mode, and reopen to test reviews and persistence. A Mac loopback address is not reachable from an iPhone.

## Implementation

`npm run build` first runs Next.js, then `scripts/build-offline.mjs` enumerates built JavaScript, CSS and fonts, and generates ignored `public/sw.js`. It precaches those files, the root HTML, the manifest, and icons. Install fails if any required response cannot be cached; the UI does not claim readiness until a worker is active. The cache name uses the Next.js build ID hash.

The worker serves the single root navigation and precached static paths from its versioned cache. Other routes, APIs and external requests are not cached. No Next.js client navigation routes are currently used. Future routes must be deliberately added and tested rather than assuming their RSC responses are cached.

An updated worker installs a complete new cache in the background. It waits for existing controlled tabs to close before activation, preventing old HTML from mixing with new chunks. The UI reports a downloaded update when detected. Activation deletes only old `recall-app-*` caches, never IndexedDB. Cache-first root loading means an active session keeps the previous version until this update lifecycle completes.

Imported notes, assets and FSRS history remain in IndexedDB, separate from the app cache. Everything stays scoped to a browser/device/origin. A future email reminder requires connectivity and has no offline delivery guarantee. Browser storage can be cleared or evicted; offline availability is not a permanent storage guarantee.

## Verification performed

The production app at port 3001 reached Ready for offline use and imported 151 cards. Its server was stopped and its tab closed. A new tab loaded the app and imported library without the server; BFS code revealed successfully. A separate disposable Markdown test card was imported and rated while the server remained stopped; its scheduled state persisted after reload. This test origin contains that extra test card. No real problem rating was logged. The actual iPhone airplane-mode/install test and deployment update lifecycle remain pending in CHECKLIST.md.

## Personal questions

Schema v3 adds a separate local questions store. The new Questions view and editor are part of the root page bundle and are included by the production precache. Question writes use IndexedDB only. Automated storage tests pass; interactive offline verification of this particular feature still needs a browser/device check, as recorded in CHECKLIST.md.

## Problem references

Short descriptions, difficulty ratings and source URLs ship in the app bundle and are saved into missing IndexedDB fields on library load. They require no network once the updated production shell is cached. Close all app tabs/windows and reopen after an update has downloaded to activate it. Existing notes, history and questions stay in IndexedDB. Opening a LeetCode/AlgoMonster source page requires connectivity and is outside the offline cache. The actual archive and automated persistence tests pass; device/offline UI verification of enrichment remains pending. See PROBLEM_REFERENCES.md.

## Statistics and visits

Schema v4 adds a local visits store; existing problems, ratings, questions and assets are preserved. Stats, visit counting, rating history and category comparisons use only IndexedDB and are bundled in the offline root app shell. Existing rating history is included; historical visits cannot be reconstructed. Automated upgrade/aggregation tests and production build pass. Interactive iPhone/offline verification of these new controls remains pending. See STATISTICS.md.

Stats category charts use bundled HTML/CSS and local data only; there is no chart library, external image or remote endpoint. Graphs and history pagination operate offline after app caching. App installation/version updates still require downloading the app shell.
