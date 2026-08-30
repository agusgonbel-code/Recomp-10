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

## Still blocking release

1. **Six-meal fixed options:** `meal-planner-six-v52.js` routes six meals through
   `generateSix`, whose `prefs` drops `includeBreakfastCake`,
   `includePostWorkoutShake` and training-day settings. Fixed preferences are
   therefore silently ignored in this path. Add generation, swap and reload
   coverage before claiming those options work across all meal counts. The UI
   saved-plan validator currently accepts at most six items; a genuine six-meal
   day plus the extra training shake needs seven, as supported by quality-v54.
2. **Intensive test safety:** the current `release-stress.yml` evidence job checks
   out and pushes to `main`, including when manually run for another branch.
   Do not dispatch that workflow from a candidate branch until evidence is
   isolated to artifacts or the tested branch. The workflow records planned
   repetitions, not actual completions; fix the counters before interpreting
   a run as 1,000 completed repetitions.
3. **Approval and deployment:** no integration into `main` or production
   deployment has been authorized/completed for this candidate. Recheck the
   deployed commit and browser behavior after approved integration before
   inviting an iPhone test.

Keep Evolutio, FitCoach and all other repositories outside this work.
