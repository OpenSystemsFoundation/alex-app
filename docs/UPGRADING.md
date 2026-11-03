# Upgrading Alex

A managed package upgrade replaces Alex's code, pages and permission sets, but
Salesforce leaves some org settings exactly as they were:

- **New picklist values are never added to existing fields.** If a release
  adds a value (for example a new board type), an admin has to add it in Setup.
- **Active flows stay active.** If a release retires a flow, the version you
  already had keeps running until an admin deactivates it.

The **Admin** page checks for both after every upgrade. If anything is left to
do, it shows a **Finish upgrading Alex** card with each step and a link to the
right Setup page. When the card disappears (use **Check again**), you're done.

This guide lists the manual steps per release.

## Before you upgrade

- Upgrade a sandbox first and try your main flows there.
- Make sure you can sign in as a System Administrator: the steps below need
  access to Setup.

## Upgrading from 1.x to 2.0

### 1. Install the new version

Use the install link from the
[release](https://github.com/OpenSystemsFoundation/alex-app/releases) and
choose **Install for Admins Only**.

### 2. Add the new picklist values

In **Setup → Object Manager**, open each object, then **Fields & Relationships**,
open the field, and under **Values** click **New**:

| Object | Field | Add value | Why |
| :--- | :--- | :--- | :--- |
| Board | Type | `Sprint` | Sprint boards turn on sprints, the sprint header, burndown and velocity. |
| Board | Status | `Active` | Boards created from the Admin page use this status. Without it, creating a board fails. |
| Card | Card Type | `Story` | The card type filter and the backlog use **Story**. |

Use the exact spelling shown. The value's **API name** must match
(`Sprint`, `Active`, `Story`).

### 3. Move "User Story" cards to "Story"

Alex 1.x called this card type **User Story**. On the **Card Type** field,
next to **Values**, click **Replace**, replace `User Story` with `Story`, and
then deactivate `User Story`.

### 4. Deactivate the 1.x flows

Alex 2.0 no longer uses these flows. In **Setup → Flows**, open each one that is
still active and click **Deactivate**:

| Flow | What it did in 1.x |
| :--- | :--- |
| Card Notifications | Sent Salesforce notifications when cards changed |
| Card Email Notifications | Sent emails when cards changed |
| Feedback Reporting | The "Give Feedback" form |
| Column Setup | Created default columns (replaced by the board's **Columns** tab) |

Keep a flow active only if your team still relies on what it did.

### 5. Assign the permission sets

Alex 2.0 adds sprints, comments and other new objects. Make sure admins have
**Alex Admin** and everyone who works on boards has **Alex User**. Users with
only Alex User can work on cards but can't start, complete or reorder sprints.

### 6. Check the Admin page

Open **Alex → Admin**. If the **Finish upgrading Alex** card is still there,
it lists what's left. Click **Check again** after each change.

### What changed for existing pages

- The board component's **Max Height** property on record pages no longer has
  any effect. Use **Height** instead.
- Some 1.x components are still in the package but no longer used. They're
  marked **DEPRECATED** in Setup and can be ignored.

## For maintainers

When a release adds a picklist value to an existing field, renames a value, or
retires a flow, add an entry to the lists in
`force-app/main/default/classes/UpgradeCheckService.cls` and a section to this
guide. The Admin page check picks it up automatically.
