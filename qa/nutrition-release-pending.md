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

## Still blocking release

1. **Intensive test safety:** the current `release-stress.yml` evidence job checks
   out and pushes to `main`, including when manually run for another branch.
   Do not dispatch that workflow from a candidate branch until evidence is
   isolated to artifacts or the tested branch. The workflow records planned
   repetitions, not actual completions; fix the counters before interpreting
   a run as 1,000 completed repetitions.
2. **Approval and deployment:** no integration into `main` or production
   deployment has been authorized/completed for this candidate. Recheck the
   deployed commit and browser behavior after approved integration before
   inviting an iPhone test.

Keep Evolutio, FitCoach and all other repositories outside this work.
