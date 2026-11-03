## Summary

<!-- What does this change and why? Link the issue: "Closes #123". -->

## Type of change

<!-- PR title follows Conventional Commits: feat:, fix:, perf:, refactor:, test:, docs:, chore:, ci: (add ! for breaking changes) -->

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor / performance
- [ ] Tests or docs only

## How was this tested?

<!-- Describe what you ran and what you checked by hand. -->

- [ ] `npm run prettier:verify`, `npm run lint` and `npm run test:unit` pass
- [ ] Apex tests added/updated and passing (`npm run test:apex`), if Apex changed
- [ ] Playwright suites run locally against a scratch org, if UI behavior changed
- [ ] Checked in both apps (Alex and Alex Console), if UI changed

## Checklist

- [ ] Metadata source has no `OpenSF__` prefix; Apex/LWC/SOQL use it
- [ ] SOQL uses `WITH USER_MODE`; DML uses `stripInaccessible` + `AccessLevel.USER_MODE`
- [ ] New classes declare sharing; new metadata is on API 67.0
- [ ] No credentials, org IDs, login URLs or personal data in code, tests or screenshots

## Screenshots

<!-- For UI changes: before / after. -->
