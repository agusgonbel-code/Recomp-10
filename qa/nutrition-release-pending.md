# Nutrition release audit — 2026-08-30

The integration candidate is PR #45. Passing checks are evidence for their
covered scenarios, not proof that the full Nutrition block is release-ready.

## Fixed-meal replacement

The cake and post-workout shake previously had no replacement button and the
base planner explicitly rejected their replacement. The candidate now allows a
day-local replacement: it preserves the other fixed meal, slot order, profile
preferences, untouched days, four macro tolerances and exact ingredient ledgers.
The storage boundary also preserves the previous plan when writing fails.

The shake preference label now describes the actual recipe (28 g whey and
105 g milk), rather than the obsolete 30 g whey with water label.

## Six-meal fixed options

Six-meal preferences now preserve the fixed-meal flags and training settings.
When either fixed option is enabled, generation uses the shared fixed-meal
solver with explicit six-meal slots and five remaining slots after the cake.
The ordinary six-meal solver remains unchanged for plans without fixed options.
The UI restores seven intakes (six meals plus training shake), still rejecting
eight. Regression tests cover all three fixed-option combinations for seven
days, exact ledgers, training/rest counts and day-local replacement after JSON
restoration. Browser coverage generates both a training and rest day, reloads
all seven intakes, and replaces the seventh while retaining both fixed meals.

## Intensive test harness

The release-stress workflow now has read-only repository permission and never
commits or pushes evidence. Both jobs check out the exact tested SHA without
persisting credentials. Results are uploaded as artifacts scoped to the current
run attempt. A full rerun is required after partial failures; evidence from a
previous attempt cannot certify the current attempt.

The runner durably records each completed suite only after its process succeeds.
Aggregation rejects missing, duplicate, malformed, incomplete and mismatched
source/run/attempt records, plus failed matrix jobs or artifact downloads.
Reports explicitly distinguish smoke validation from a 1000-repetition release.

Pull requests run a bounded harness check: two unit-suite repetitions and two
browser-suite repetitions. Main/manual runs retain 1000 repetitions of each
suite (10 shards x 100), with unit and browser phases in separate jobs and a
360-minute job limit. Browser runs also include the user-behavior suite.

## Still blocking release

1. **Full intensive validation:** a passing PR harness check is NOT a completed
   1000-repetition release. Require a release-1000 report with both counters at
   1000 and the matching candidate SHA before describing that validation as done.
2. **Approval and deployment:** no integration into `main` or production
   deployment has been authorized/completed for this candidate. Recheck the
   deployed commit and browser behavior after approved integration before
   inviting an iPhone test.

Keep Evolutio, FitCoach and all other repositories outside this work.
