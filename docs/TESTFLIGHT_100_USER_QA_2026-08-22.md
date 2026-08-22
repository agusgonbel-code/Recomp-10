# Recomp 10M — TestFlight-style QA + simulated 100-user review
Fecha: 22/08/2026

## Scope
Repository-level TestFlight-style audit plus a structured simulation of 100 user journeys. This is not a claim that 100 real people used a signed TestFlight binary. Final haptics, VoiceOver, suspension/background and screenshot validation require real Apple hardware.

## TestFlight-style journeys reviewed
- Unified intake and recomposition profile.
- Calorie/macro target calculation.
- 3–6 meal distribution.
- Menu generation from 1 to 30 days.
- Recipe opening, quantities and substitutions.
- Training generation, history and progression.
- 360 check-in and trend review.
- Photos, backup, persistence, local dates and offline shell.
- Privacy/support resources and iOS packaging.

## Findings
### P0
No new reproducible P0 defect was found in the current repository-level review.

### P1 / release risks
1. Food restrictions should continue moving from text matching to structured allergen/ingredient metadata.
2. Macro distribution per meal must be presented as a practical planning tool, not as a guaranteed clinical advantage.
3. Weight-driven adaptation must remain trend-based and conservative.
4. Physical validation is still required for photos, large menus, restore flows, safe areas and accessibility.

## Simulated 100-user feedback
Aggregate simulated personas included novices, experienced users, meal-prep users, users with allergies/exclusions, users with limited cooking time, small-screen users and interrupted/offline users.

Most important themes:
- Users strongly prefer one profile that drives both diet and training.
- Recipe quantities and visible nutritional totals must never disagree.
- Users expect a tap on a meal to open the exact recipe for that meal.
- Users want simple explanations for why calories or training volume changed.
- A 30-day plan is valuable only if repetition and substitutions remain practical.

## Changes applied in this QA cycle
- Added `.github/workflows/release-stress.yml`.
- Full unit suite now repeats 10 times in the stress gate.
- Browser user journeys, including nutrition/menu v5, repeat 10 times.

## Release verdict
Repository candidate: GO WITH PHYSICAL-DEVICE GATE.
Do not submit to App Review until a signed build passes iPhone/iPad device checks, accessibility, photo flows, offline/restore and final App Store metadata/screenshots.
