# Marketing website

The owner chose GitHub Pages for automatic production publishing at rebound-ops.org.

- Edit src/ and public/, then run the marketing build, checker and screenshot-artifact tests.
- Pushes and merged PRs to main trigger .github/workflows/marketing-website.yml. Verify the workflow result after pushing. PR builds never publish production.
- Production screenshots are captured from the current app using temporary synthetic fixtures. Keep the commit and image-hash checks; never substitute old captures or real career records when capture fails.
- Do not commit .generated/ captures or credentials. CI deploys artifacts without making bot commits.
- Preserve the user's original curved-path hero, light/dark themes and readable body typography unless asked to change them.
- .openai/hosting.json identifies the former Sites host retained as a fallback. Do not use Sites tools for routine production deployment; GitHub Pages owns this domain.
- See AUTOMATION.md and DEPLOYMENT.md. Marketing copy changes remain deliberate; never invent capabilities or outcomes from commit messages.
