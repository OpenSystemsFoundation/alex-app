# Security Policy

Alex runs entirely inside Salesforce, but a bug in the app can still expose
data or grant access that an org's admin didn't intend — for example by
bypassing sharing, object or field-level security. We take those reports
seriously.

## Supported versions

| Version | Supported |
| :--- | :--- |
| Latest released version of the managed package | Yes |
| Older released versions | Fixes ship in the next release; please upgrade |
| Beta versions | No |

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately through
[GitHub private vulnerability reporting](https://github.com/OpenSystemsFoundation/alex-app/security/advisories/new),
or email **support@opensf.foundation** with "Security" in the subject.

Include, as far as you can:

- the Alex version (Setup → Installed Packages) and org type
- the affected component (Apex class, LWC, permission set)
- steps to reproduce, and the user's profile and permission sets
- what an attacker can read, change or do that they shouldn't

Never include real customer data, credentials or session/login URLs.

## What to expect

- We acknowledge reports within 5 business days.
- We confirm the issue, agree on a fix timeline with you, and keep you updated.
- Fixes ship in a new package version; we credit reporters in the release
  notes unless you prefer to stay anonymous.

## Scope

In scope — issues in this repository's code, such as:

- sharing, CRUD or field-level security bypass in Apex
- SOQL/SOSL injection
- cross-site scripting or unsafe DOM handling in Lightning Web Components
- privilege escalation (e.g. via the Metadata API features or custom permissions)
- data exposure through Platform Events, logs or error messages

Out of scope:

- vulnerabilities in the Salesforce platform itself — report those to
  [Salesforce Security](https://trust.salesforce.com/security/report-vulnerability)
- issues that require an admin to grant excessive permissions or misconfigure sharing
- governor-limit exhaustion or denial of service within your own org
- social engineering and physical attacks
