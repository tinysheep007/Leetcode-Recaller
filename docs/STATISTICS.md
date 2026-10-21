# Local statistics

The Stats tab reads existing rating events and new visit counts from IndexedDB. No remote database, account or network request is involved.

## Visits and history

Opening a problem from any review mode or the Questions portal counts one visit. Advancing to a different card counts a visit to that card. Flipping, revealing, saving a personal question, background refresh and viewing history do not count. Returning to the library and opening it again, or reloading an open card, counts a new visit. Visits are counted once per displayed problem transition in a mounted app, including React's development effect replay. Visit tracking starts with this release; no visits are inferred from previous ratings.

Schema version 4 adds `visits`, keyed by `problemId`, with `count` and `lastVisitedAt`. Each increment uses a read/write transaction to avoid losing concurrent increments. It never changes scheduling, ratings or daily completion. Existing stores are retained. Rating events continue to use the existing reviews store.

Problem history shows visits, last visit, total ratings, latest rating and all saved ratings with local timestamps, newest first. Titles are searchable and lists show ten problems per page. Old ratings remain available even if recorded before visit tracking began. Invalid/missing legacy timestamps are excluded from displayed history.

## Category comparisons

For each problem, use only its latest timestamped rating. Count Forgot, Rusty and Comfy within its current category. Comfy percentage is Comfy problems divided by rated problems, not by total imported problems. Unrated categories show a dash, sort last, and are never labeled weakest. Rated/total counts show the sample size; a category based on one rating should not be interpreted as confidently mastered. Users can sort least or most comfy first. This is a description of self-ratings, not an inferred probability of remembering.

## Review dates and filtering

Cards with zero scheduler repetitions display New in the library. Their initial internal FSRS timestamp does not represent a deadline. Scheduled reviewed cards show Ready to review or their next review date. Daily sets prioritize scheduled reviews, then fill available target slots with new cards. Unfinished saved selections continue to carry forward; they are suggestions at the user's pace, not deadlines.

Difficulty, category and title filters combine across the entire library before pagination. Changing a filter returns to the first page. Filters affect browsing, not the saved daily selection or global Random button. Difficulty stays hidden on card fronts.

Tests verify v3-to-v4 data preservation, concurrent visit increments, no scheduling/daily side effects, rating history preservation, category denominators/latest-rating selection and new-card eligibility. Actual iPhone/UI/offline verification remains pending in CHECKLIST.md.

## Chart and mobile data

Category bars show each problem's latest rating as Forgot/Rusty/Comfy, with unrated problems in gray. Full bar width represents all problems in that category; the text separately reports the Comfy percentage among rated problems. Sort controls apply to the chart and exact-count table. Accessible text describes each segment's count; the table is expandable. Problem histories remain paginated at ten problems per page with search.

The chart uses HTML/CSS and existing local records. It adds no dependencies, image downloads, remote chart service, or data polling. Visiting Stats, searching, sorting and changing history pages do not make network requests. Initial app installation and new app versions still download their app bundle; once cached, these features work offline.
