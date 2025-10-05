# Custom Instructions for AI Agents

## Response Style

- Be concise and action-oriented
- Execute code changes immediately without lengthy explanations
- Only provide explanations when explicitly asked

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
