# Alex Quick Start

This guide takes a Salesforce admin or team lead from installing Alex to running a
first board and sprint. It takes about 15 minutes. For a full tour of every
feature, see the [User Guide](USER-GUIDE.md).

## Contents

1. [Before you start](#before-you-start)
2. [Install the package](#1-install-the-package)
3. [Assign permission sets](#2-assign-permission-sets)
4. [Open the app](#3-open-the-app)
5. [Create your first board](#4-create-your-first-board)
6. [Set up columns](#5-set-up-columns)
7. [Add and move cards](#6-add-and-move-cards)
8. [Run your first sprint](#7-run-your-first-sprint)
9. [Invite your team](#8-invite-your-team)
10. [Troubleshooting](#troubleshooting)
11. [Next steps](#next-steps)

## Before you start

- A Salesforce org with Lightning Experience. Use a **sandbox** or **Developer
  Edition** org for beta versions of the package.
- A user with permission to install packages and assign permission sets
  (typically a System Administrator).

## 1. Install the package

Alex is distributed as a managed package with the namespace `OpenSF`.

1. Open the [latest release](https://github.com/OpenSystemsFoundation/alex-app/releases/latest)
   and click its install link.
2. Log in to the target org.
3. Choose **Install for Admins Only**, then click **Install**.
4. Wait for the confirmation email or for the package to appear under
   **Setup → Installed Packages**.

Upgrading an org that already has Alex? Follow the [upgrade guide](UPGRADING.md)
after installing: a few settings need an admin.

## 2. Assign permission sets

Nobody, including admins, can use Alex until they have one of its permission sets.

| Permission set | Who it is for                                         | What it grants                                                                                              |
| -------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Alex Admin** | Admins and team leads who set up and run boards       | Full access to boards, columns, cards and sprints; the **Admin** tab; managing card custom fields           |
| **Alex User**  | Everyone who works on cards                           | View boards; create, edit and delete cards; add and edit columns; comments; view sprints and analytics      |

To assign a permission set in Setup:

1. Go to **Setup → Permission Sets** and open **Alex Admin**.
2. Click **Manage Assignments → Add Assignment**.
3. Select yourself (and any other admins), then click **Next → Assign**.

Repeat with **Alex User** for team members (see [Invite your team](#8-invite-your-team)).

If you prefer the Salesforce CLI, include the namespace prefix in the API name:

```bash
sf org assign permset --name OpenSF__Alex_Admin --target-org my-org
sf org assign permset --name OpenSF__Alex_User --target-org my-org --on-behalf-of user@example.com
```

## 3. Open the app

Open the **App Launcher** and choose one of the two apps. Both contain the same tabs.

- **Alex** uses standard navigation.
- **Alex Console** uses console navigation, so boards and cards open in workspace tabs.

The main tabs are **Boards** (a list of all boards), **Cards** and, for users with
Alex Admin, **Admin**.

## 4. Create your first board

1. Open the **Admin** tab. The **Admin Management** page shows a **Getting Started**
   checklist: _Create a Board_, _Set Up Columns_, _Assign Users_.
2. Click **Create Your First Board** (or **New Board** on the **Boards** sub-tab).
3. Enter a **Board Name** and, optionally, a **Description** and **Board Type**
   (Project, Personal or Team).
4. Leave **Create with default columns (To Do, In Progress, In Review, Done)** checked
   to get a working board straight away.
5. Click **Create**, then click **Open Board** next to the new board.

The board opens on its record page, with the tabs **Backlog**, **Board**, **Columns**
and **Analytics** across the top.

> To use sprints, the board's type must be **Sprint**. On the board record page,
> click **Edit** in the page header, set **Type** to **Sprint** and save. See
> [Run your first sprint](#7-run-your-first-sprint).

## 5. Set up columns

Open the **Columns** tab on the board.

- If the board has no columns, pick one of the templates or click
  **Add Column Manually**.
- Click **Add Column** to add a stage.
- Edit a column's **Name**, **Category** (To Do, In Progress or Done), **Status**,
  **Color** and **WIP Limit** inline. Changes save when you leave the field.
- Drag a column by its handle to reorder it.

The **Category** drives the "hide done" filter and the analytics. A **WIP Limit**
shows a badge on the column header and highlights the column when it holds more
cards than the limit. It does not block moves.

## 6. Add and move cards

**Create a card**

- On the **Board** tab, click the **+** (Add New Card) button on a column. A card
  named "New Card" is added to that column.
- On the **Backlog** tab, click **New Card**, type a subject in
  _What needs to be done?_ and click **Save**.

**Edit a card.** Click a card to open it in the side panel. Edit its fields
(subject, description, priority, assignee, story points, due date and so on),
add comments with **Post**, attach files with **Upload Files**, then click **Save**.
Drag the panel's edge to resize it. Click the card number to open the full record.

**Move a card**

- Drag it to another column or to a new position within a column.
- Or right-click it and choose **Move to Column** or **Move to Backlog**.

Changes appear on every open copy of the board within moments; nobody needs to
refresh.

**Find cards.** The filter bar above the board and the backlog has search and
filters for priority, card type, epic and assignee. A clear button resets them.

## 7. Run your first sprint

Creating, starting and completing sprints requires the **Alex Admin** permission
set, and the board's **Type** must be **Sprint** (see step 4). Until a sprint is
started, a sprint board's **Board** tab shows **No Active Sprint** with a
**Go to Backlog** button.

1. **Build the backlog.** Add cards on the **Backlog** tab. Drag them to set
   priority, or select several and use **Move to Top**, **Move to Bottom**,
   **Set Priority** or **Delete**.
2. **Create a sprint.** Click **New Sprint**, enter an optional sprint goal and
   click **Create Sprint**. The sprint appears in the backlog with a **Planning**
   badge.
3. **Plan it.** Select backlog cards and choose the sprint from **Move to Sprint**.
4. **Start it.** Click **Start Sprint** on the sprint header, choose a
   **Sprint Duration** (1–4 weeks or custom) or dates, and confirm with
   **Start Sprint**.
5. **Track it.** The top bar shows the sprint name, goal and progress. Click the
   **Reports** icon for the burndown and velocity charts.
6. **Complete it.** Click **Complete** in the top bar (or **Complete Sprint** in the
   backlog). The wizard summarises completed and incomplete work and moves
   unfinished cards back to the backlog.

The **Analytics** tab shows cycle time and a cumulative flow diagram for any board.

## 8. Invite your team

1. Make sure each person has an active Salesforce user.
2. Assign **Alex User** to team members and **Alex Admin** to anyone who will create
   boards, run sprints or manage card fields (see [step 2](#2-assign-permission-sets)).
3. Share the board's URL, or ask them to open the **Boards** tab in **Alex** or
   **Alex Console**.

Alex runs with the user's sharing and field-level security. Boards, cards and
sprints ship with a Public Read/Write internal org-wide default, and columns
inherit access from their board, so everyone with an Alex permission set can see
every board. To restrict access, change the org-wide defaults in
**Setup → Sharing Settings** and share records with the right users or groups.

## Troubleshooting

**The Alex apps or the Admin tab are missing.**
Check that the user has a permission set: either one grants access to both apps,
but only **Alex Admin** grants the **Admin** tab.

**A user cannot create boards or sprints, or the Complete button is missing.**
Board and sprint management require **Alex Admin**. **Alex User** can view boards
and sprints and work on cards.

**"New Sprint" does not appear on the Backlog tab.**
The board's **Type** is not **Sprint**. Edit the board record and change it.

**The status in the top bar says "Auto-refresh", "Offline" or "Error".**
The indicator shows **Real-time** when live updates are connected. If the
real-time connection fails, the board switches to **Auto-refresh** and checks for
changes every 15 seconds. Click **Refresh** to reload the board immediately, or
reload the page to reconnect. Check that the user has an Alex permission set,
which grants access to Alex's platform events.

**Saving a card fails with a permission error.**
Check the user's permission set first. If your org has changed Alex's sharing
settings, make sure the user has access to the board and card records.

For anything else, search or open an issue on
[GitHub Issues](https://github.com/OpenSystemsFoundation/alex-app/issues). Include the
package version, the steps to reproduce and any error message.

## Next steps

- [User Guide](USER-GUIDE.md): every feature in detail, including epics,
  card custom fields and analytics.
- [Architecture](ARCHITECTURE.md): how the store, Apex layers and real-time events
  fit together.
- [Contributing](../CONTRIBUTING.md): how to propose changes.
- **Developers:** setting up a local environment, static checks and scratch orgs
  are covered in the [README](../README.md#development). Note that the source
  deploys only to scratch orgs created from a Dev Hub linked to the `OpenSF`
  namespace; everyone else should install the package.
