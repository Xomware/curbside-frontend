# curbside-frontend

> Angular desk companion for Curbside at curbside.xomware.com. Same API as the iOS app.

## Stack

- Angular 22, standalone components, signals, OnPush, new control flow
- SCSS with CSS custom properties in `src/styles.scss`; Overpass via fontsource
- Vitest (`@angular/build:unit-test`, jsdom)

## Key Commands

```bash
npm start                    # dev server on :4200
npm run build                # production build -> dist/curbside-frontend/browser
npm test -- --watch=false    # unit tests
```

## Project Config

```yaml
pm_tool: none
base_branch: main
test_commands:
  - npm test -- --watch=false
  - npm run build
```

## Constraints

- Look matches curbside-ios `Theme/` and `Views/Signs/`: green street-sign blades, white panel buttons, yard-sign states.
  Tokens live in `src/styles.scss` and mirror `Palette.swift`; change both together.
- Light and dark follow the system (`prefers-color-scheme`); there is no toggle.
- No emoji in UI.
- Config is `src/environments/environment.ts`, committed with the prod values for local dev. The deploy
  rewrites it from SSM via `scripts/write-environment.mjs`, which reads only its named variables (three SSM values
  plus the optional `MAPKIT_JS_TOKEN`): the deploy env also holds every Infisical `/curbside` secret.
- No MapKit JS token → the map area shows "Map unavailable" and the plaque list still opens every card.
- Deploy is `.github/workflows/deploy.yml` on push to `main` via `Xomware/github-actions` `deploy-frontend-s3.yml@v1`.
  Infisical project `code`, env `prod`, folder `/curbside` must hold `AWS_FRONTEND_ROLE_ARN`.
- Plans: `xom-research/docs/features/curbside/web-foundation/PLAN.md` and the epic `PLAN.md` beside it.
