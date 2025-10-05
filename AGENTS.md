# Custom Instructions for AI Agents

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for technical architecture and design patterns.

## Response Style

- Be concise and action-oriented
- Execute code changes immediately without lengthy explanations
- Only provide explanations when explicitly asked

## Summary Format

After completing operations, provide a **short, scannable summary on very high level** with bullet points:

- Use bullet points for each major change or action
- Keep each bullet point to one line when possible
- Group related changes together
- User can ask for details on specific items if needed

**Good Example:**

```
✅ Completed:
- Added sync state tracking to Redux store (idle/syncing/failed)
- Updated connectionStatusIndicator with sync UI
- Fixed 3 test failures in kanbanStore.test.js
- All 203 tests passing

Want details on any of these?
```

**Bad Example:**

```
I've successfully implemented all the changes you requested. First, I added sync state tracking to the Redux store by creating new action types including SET_SYNC_STATE, START_OPERATION, COMPLETE_OPERATION, and FAIL_OPERATION. Then I updated the connectionStatusIndicator component to display the sync state with visual indicators showing when changes are being saved, when they're saved, and when they fail. I also had to fix several test failures that occurred because cards are now enriched in the reducer instead of before being dispatched...
```

## Documentation Policy

**NEVER** create documentation files unless explicitly requested. This includes:

- README files
- API documentation
- Inline documentation
- Architecture docs
- Diagrams
- Summaries

After completing code changes, **stop and ask**: "Would you like me to create documentation for these changes?"

## Testing Policy

**During Development & Debugging:**

- Automatically run tests after creating or modifying test files
- Run tests immediately when debugging test failures
- No need to ask permission when actively developing tests

**After Completing Development Work:**

- Always ask the user to run tests after completing feature/fix development
- **Example:** "I've completed the changes. Would you like to run the tests now?"

## Deployment Policy

Always run `npm run deploy` after completing development work to deploy changes to Salesforce.

## Communication Style

- Use emojis sparingly for emphasis only
- Avoid overusing emojis in code, comments, or logs
- Occasional programmer jokes are fine to make development enjoyable

**Good:** ✅ "Found the bug in the reducer"
**Bad:** ❌ "🐛 Found the 🔍 bug 🪲 in the 🔄 reducer 🎯"

## Project Context

Salesforce Lightning Web Component (LWC) Kanban board application called "Alex".

**Stack:**

- Salesforce DX
- Lightning Web Components (LWC)
- TypeScript
- Jest for unit testing
- Playwright for end-to-end testing

## Coding Standards

- Follow Salesforce best practices for LWC development
- Use TypeScript for test files
- Maintain consistent code formatting
- Write clear and descriptive commit messages

### Apex Test Organization

**ALWAYS** place Apex test classes in the `tests/` subdirectory:

- ✅ `force-app/main/default/classes/tests/MyClassTest.cls`
- ❌ `force-app/main/default/classes/MyClassTest.cls`

This maintains separation between production code and test code, following Salesforce best practices.
