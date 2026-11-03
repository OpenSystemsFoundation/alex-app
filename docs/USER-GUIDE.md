# Alex User Guide

Alex is a real-time, collaborative Kanban and sprint board that runs natively in
Salesforce. This guide covers everything you can do in the installed app, for team
members and for the admins who set boards up.

New to Alex? Start with the [Quick Start](QUICKSTART.md), which walks through
installing the package and running a first board and sprint.

## Contents

1. [Getting started](#getting-started)
2. [Board layout](#board-layout)
3. [Kanban boards and sprint boards](#kanban-boards-and-sprint-boards)
4. [The Board tab](#the-board-tab)
5. [Working with cards](#working-with-cards)
6. [Comments and files](#comments-and-files)
7. [Epics](#epics)
8. [The Backlog tab](#the-backlog-tab)
9. [Sprints](#sprints)
10. [Reports and analytics](#reports-and-analytics)
11. [Managing columns](#managing-columns)
12. [Real-time collaboration](#real-time-collaboration)
13. [Administration](#administration)
14. [Keyboard and mouse shortcuts](#keyboard-and-mouse-shortcuts)
15. [Troubleshooting](#troubleshooting)
16. [Getting help](#getting-help)

---

## Getting started

### Permission sets

You need one of Alex's permission sets before you can open the app. Ask your
Salesforce administrator to assign the right one.

| Permission set | API name     | For                                       | Grants                                                                                                                         |
| -------------- | ------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Alex Admin** | `Alex_Admin` | Admins and team leads who set up boards   | Everything in Alex User, plus creating, editing and deleting boards; deleting columns; running sprints; the **Admin** tab; managing card custom fields |
| **Alex User**  | `Alex_User`  | Everyone who works on boards              | Viewing boards; creating, editing and deleting cards; comments and files; adding and editing columns; viewing sprints, reports and analytics |

Card custom fields are controlled by the `ManageCardFields` custom permission, which
is included in **Alex Admin**.

### Opening Alex

Open the **App Launcher** and choose one of the two Lightning apps:

- **Alex** uses standard navigation.
- **Alex Console** uses console navigation, so boards and cards open in workspace
  tabs.

Both apps include the **Boards** and **Cards** tabs. Users with **Alex Admin** also
see the **Admin** tab.

### Opening a board

1. Open the **Boards** tab.
2. Click a board name. The board opens on its record page.

Admins can also open a board from the **Admin** tab with **Open Board**.

---

## Board layout

The top bar of every board has four tabs:

| Tab           | What it shows                                                                   |
| ------------- | ------------------------------------------------------------------------------- |
| **Backlog**   | A prioritized list of cards that are not on the board, with a count badge       |
| **Board**     | The columns and cards (opens by default)                                        |
| **Columns**   | Column setup: names, categories, colors, WIP limits and order                   |
| **Analytics** | Cycle time and cumulative flow for the board                                    |

On sprint boards, the top bar also shows the active sprint (see
[The sprint header](#the-sprint-header)). On the right are the connection status
indicator (see [Real-time collaboration](#real-time-collaboration)) and a
**Refresh** button that reloads the board.

---

## Kanban boards and sprint boards

A board's **Type** decides whether it uses sprints.

- **Project**, **Personal** and **Team** boards are continuous Kanban boards. Cards
  flow across the columns with no time box.
- **Sprint** boards add Scrum-style sprints: a sprint header, planned sprints in the
  backlog, sprint completion and sprint reports. When no sprint is active, the
  **Board** tab shows **No Active Sprint** and a **Go to Backlog** button.

To make a board a sprint board, open the board record, click **Edit** in the page
header, set **Type** to **Sprint** and save. The **New Board** dialog on the Admin
tab offers only Project, Personal and Team.

---

## The Board tab

### Columns and WIP limits

Each column is a stage in your workflow. The column header shows the column name
and, if the column has a WIP (work in progress) limit, a badge such as `3/5`
(cards in the column / limit). When a column holds more cards than its limit, the
badge and column are highlighted. WIP limits are a visual signal only; they do not
block moves.

Click a column name to open the column's record page. Columns are set up on the
[Columns tab](#managing-columns).

### Reading a card

A card on the board shows:

- The assignee's photo or initials
- The card number (for example, `CA-42`) — click it to open the full Salesforce
  record
- The card type with its icon, and the card's status
- The subject
- The parent epic's name, if the card belongs to an epic
- Any card custom fields your admin has configured, shown as `Label: value`
- Priority and due date badges
- Story points
- A colored left edge, if the card has a **Color**

Click anywhere else on the card to open it in the [card panel](#the-card-panel).

### Searching and filtering

The filter bar above the columns narrows the cards shown on the board:

| Control                  | Options                                                                    |
| ------------------------ | -------------------------------------------------------------------------- |
| **Search cards...**      | Matches subject, card number, card type, assignee name and status          |
| **All Assignees**        | Pick one or more assignees (shown when cards have assignees)               |
| **All Priorities**       | Blocking, High, Medium, Low, Trivial                                       |
| **All Types**            | Story, Bug, Task, Epic                                                     |
| **All Epics**            | Any epic on the board, or **No Epic** (shown when the board has epics)     |
| **Hide Done**            | Hides cards in Done and Released columns (Kanban boards only)              |

While a filter is active, the bar shows a count such as **5 of 12 cards** and a
clear button (**X**) that resets every filter.

On Kanban boards, an admin can also set **Done Card Retention Days** on the board
record. Cards that have been in a Done or Released column for longer than that
number of days are hidden from the board automatically. The cards are not deleted.

---

## Working with cards

### Creating a card

- **On the board:** click **+** (Add New Card) in a column header. A card with the
  subject "New Card" is added to that column. Click it to fill in the details.
- **In the backlog:** see [Creating backlog cards](#creating-backlog-cards).

### The card panel

Click a card on the board, or a row in the backlog, to open it in a panel on the
right.

- Edit the card's fields, then click **Save**. The panel closes and the change is
  sent to everyone viewing the board.
- Click **Cancel**, the close icon or press **Esc** to close without saving. If
  you have unsaved changes, Alex asks you to confirm before discarding them. The
  same check runs if you click a different card while the panel has unsaved changes.
- Drag the panel's left edge to resize it (300–800 pixels wide). The width is kept
  as you open other cards.
- Click the card number at the top of the panel to open the full record.

When a card has a **Card Type**, an **Apply Template** link appears above the
description. It fills the description with an outline for that type — for example,
a user story with acceptance criteria for a Story, or steps to reproduce with
expected and actual behavior for a Bug. Applying a template replaces the current
description text. Click **Save** to keep it.

The panel also contains the card's [comments and files](#comments-and-files) and,
for epics, [epic progress](#epics).

### Card fields

By default the card panel shows these fields. Your admin can change which fields
appear (see [Choosing card panel fields](#choosing-card-panel-fields)).

| Field                | Description                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| **Subject**          | A short summary of the work                                                                      |
| **Description**      | Rich text for details, acceptance criteria and notes                                             |
| **Status**           | Backlog, To Do, In Progress, Testing, Review, Release or Done. Set automatically when the card moves into a column that has a status |
| **Card Type**        | Story, Bug, Improvement, Spike, Task or Epic                                                     |
| **Priority**         | Blocking, High, Medium, Low or Trivial                                                           |
| **Epic**             | The epic this card belongs to                                                                    |
| **Assignee**         | The person doing the work                                                                        |
| **Peer Reviewer**    | The person reviewing the work                                                                    |
| **Due Date**         | When the work is due                                                                             |
| **Story Points**     | An effort estimate, used by sprint progress, velocity and epic rollups                           |
| **Color**            | Gives the card a colored left edge                                                               |
| **Needs Refinement** | Flags the card for backlog refinement                                                            |

Cards are numbered automatically (`CA-1`, `CA-2` and so on).

### Moving cards

**Drag and drop.** Drag a card to another column, or up and down within a column,
and drop it where you want it. The new position saves automatically and everyone
viewing the board sees the same order.

**Right-click menu.** Right-click a card on the board for:

- **Move to Column** — move the card to the top of another column
- **Move to Backlog** — take the card off the board (and out of the active sprint)
- **Delete** — delete the card immediately

When a card moves into a column, it takes on that column's **Status**, if the column
has one. Moving a card into a column with the **Done** or **Released** category
marks it as done for sprints, epics and analytics.

### Deleting a card

1. Open the card in the panel.
2. Click **Delete**. The button changes to **Confirm Delete** for three seconds.
3. Click **Confirm Delete** to delete the card.

Deleting from the right-click menu or the backlog's bulk actions happens
immediately, without this confirmation step. Deleted cards go to the Salesforce
Recycle Bin, subject to your org's settings. To keep your sprint and flow history
accurate, consider moving finished cards to a Done column instead of deleting them.

---

## Comments and files

### Comments

The **Comments** section of the card panel lists comments with the newest first.

- Type in **Write a comment...** and click **Post**. Comments save immediately; you
  do not need to click the card's **Save** button.
- On your own comments, open the actions menu to **Edit** (then **Save** or
  **Cancel**) or **Delete**. You cannot edit or delete other people's comments.

### Files

The **Files** section lists files attached to the card. Click the toggle to expand
or collapse it.

- Click **Upload Files** to attach one or more files. Accepted types are PDF, PNG,
  JPG, GIF, SVG, Word, Excel, PowerPoint, CSV, TXT and ZIP.
- Click a file name to preview it, or use the download and delete icons. Deleting a
  file takes effect immediately.

---

## Epics

An epic is a card with the **Card Type** of **Epic** that groups related cards.

- **Link a card to an epic:** open the card and set its **Epic** field to the epic
  card, then click **Save**. Choose a card whose type is Epic.
- **See the epic on child cards:** cards that belong to an epic show the epic's
  name on the board.
- **Track progress:** open the epic in the card panel. The **Epic Progress**
  section shows a progress bar, how many child cards are completed (for example,
  "3 of 6 cards completed (50%)") and completed versus total story points. A child
  card counts as completed when it is in a Done or Released column.
- **Jump to a child card:** click a child card in the list to open its record.
- **Filter by epic:** use **All Epics** in the filter bar on the Board or Backlog
  tab.

---

## The Backlog tab

The **Backlog** tab is a prioritized list of work. Cards in the backlog are not in
a column, so they do not appear on the board.

### Backlog sections

The list is grouped into sections. Click a section header to collapse or expand it.
Each header shows the number of cards and total story points.

- **Active sprint** (sprint boards) — the cards on the board in the current sprint,
  with an **Active** badge and a **Complete Sprint** button. The status column shows
  the board column each card is in.
- **Planned sprints** (sprint boards) — one section per sprint in planning, with a
  **Planning** badge, a **Start Sprint** button (when no other sprint is active) and
  a delete icon.
- **Backlog** — every card that is not on the board or in a planned sprint.

Each row shows a drag handle, a selection checkbox, a refinement toggle, and the
card's **Name**, **Subject**, **Status**, **Type**, **Priority**, **Points** and
**Assignee**. Click a row to open the card in the [card panel](#the-card-panel), or
click the card number to open its record.

### Searching and filtering the backlog

The backlog filter bar has:

- **Search cards...** — matches subject, card number and card type
- **All** / **Needs Refinement** — show every card, or only cards flagged as
  needing refinement
- **All Assignees**, **All Priorities**, **All Types** and **All Epics** — as on the
  Board tab
- A summary such as **12 cards | 34 pts** (or **5 of 12 cards | 34 pts** while
  filtering), and **Saving...** while changes are being saved
- A clear button that resets every filter

### Creating backlog cards

1. Click **New Card** in the filter bar.
2. Type a subject in **What needs to be done?**
3. Press **Enter** or click **Save**.

The form stays open so you can add several cards in a row. Click **Cancel** or
press **Esc** to close it. If the backlog is empty, click **Create Card**.

### Selecting cards

- Tick a row's checkbox, or tick the header checkbox to select all visible cards.
- **Ctrl+click** (**Cmd+click** on a Mac) a row to add it to or remove it from the
  selection.
- **Shift+click** a row to select every card between it and the last card you
  selected.

### Bulk actions

When cards are selected, a bar shows how many are selected and these actions:

| Action                  | What it does                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| **Add to Sprint (n)**   | Adds the cards to the active sprint and places them in the board's first column                 |
| **Move to Sprint**      | Moves the cards into a planned sprint                                                           |
| **Move to Top**         | Moves the cards to the top of the backlog                                                       |
| **Move to Bottom**      | Moves the cards to the bottom of the backlog                                                    |
| **Set Priority**        | Sets High, Medium or Low on every selected card                                                 |
| **Delete**              | Deletes the selected cards immediately                                                          |
| **Clear**               | Clears the selection                                                                            |

**Add to Sprint** appears only when a sprint is active. **Move to Sprint** appears
only when there is at least one planned sprint.

### Reordering and moving by drag

- Drag a row by its handle to change its priority within a section.
- Drag a row onto another section, or onto that section's header, to move it there —
  for example, from the Backlog into a planned sprint.
- If several cards are selected, dragging one of them moves them all.

### Right-click menu

Right-click a backlog row for:

- **Move to Top** / **Move to Bottom**
- **Move to Sprint** — choose a planned sprint, or the active sprint (shown as the
  sprint name followed by "(Board)")
- **Move to Column** — add the card to the active sprint in a chosen column (only
  when a sprint is active)
- **Remove from Sprint** — return a card in a planned sprint to the Backlog section
- **Set Priority** — High, Medium or Low
- **Toggle Refinement** — flag or unflag the card as needing refinement
- **Delete** — delete the card immediately

If you right-click one of several selected cards, the action applies to all of
them.

### Refinement

Use **Needs Refinement** to mark cards that need discussion before they can be
planned.

1. Flag cards with the refinement toggle on the row, **Toggle Refinement** in the
   right-click menu, or the **Needs Refinement** checkbox in the card panel.
2. During a refinement session, switch the view to **Needs Refinement**.
3. Work through each card: clarify the description, add story points and agree on
   acceptance criteria.
4. Clear the flag when the card is ready.

---

## Sprints

Sprints are available on boards whose **Type** is **Sprint** (see
[Kanban boards and sprint boards](#kanban-boards-and-sprint-boards)). Creating,
starting, completing and deleting sprints requires the **Alex Admin** permission
set.

### Sprint lifecycle

| Status        | Meaning                                                                    |
| ------------- | -------------------------------------------------------------------------- |
| **Planning**  | Created but not started. Cards can be planned into it from the backlog.    |
| **Active**    | In progress. A board can have only one active sprint at a time.            |
| **Completed** | Finished. Its velocity is recorded.                                        |

Sprints are numbered automatically (`SP-0001`, `SP-0002` and so on).

### Creating a sprint

1. Open the **Backlog** tab and click **New Sprint**.
2. Optionally enter a **Sprint goal**.
3. Press **Enter** or click **Create Sprint**.

The sprint appears as a section in the backlog with a **Planning** badge. You can
create several planned sprints. To change their order, right-click a planned
sprint's header and choose **Move Up** or **Move Down**.

### Planning a sprint

Move cards into a planned sprint by:

- Selecting cards and choosing the sprint from **Move to Sprint**
- Right-clicking a card and choosing **Move to Sprint**
- Dragging cards onto the sprint's section

### Starting a sprint

1. Click **Start Sprint** on the planned sprint's header. This button appears only
   when no other sprint is active on the board.
2. In the dialog, click **Start Sprint** to confirm.

The sprint becomes **Active**. If it has no start date, today's date is used.
Everyone viewing the board is updated.

To add more cards to the active sprint, select them in the backlog and click
**Add to Sprint (n)**, or right-click a card and use **Move to Sprint** or
**Move to Column**.

### The sprint header

While a sprint is active, the top bar shows:

- The sprint name and goal
- Days remaining (for example, **5d remaining**, **Last day** or **2d overdue**),
  when the sprint has an end date. The text turns amber with one or two days left
  and red on the last day or when overdue.
- A progress bar and label such as **25 / 100 pts (25%)**
- A **Reports** icon that opens [Sprint Reports](#sprint-reports)
- A **Complete** button

When a card in the active sprint moves into a Done or Released column, it is marked
complete for the sprint and the progress updates. Moving it back to a To Do or
In Progress column marks it incomplete again.

### Completing a sprint

1. Click **Complete** in the sprint header, or **Complete Sprint** on the active
   sprint's section in the backlog.
2. **Sprint Summary** — review the number of completed and incomplete cards, the
   points done and the total points. Click **Next**.
3. **Incomplete cards** — if any cards are unfinished, choose what happens to each
   one (**Move to Backlog**). Click **Next**.
4. **Ready to Complete Sprint?** — review and click **Complete Sprint**. Use
   **Back** to change your choices.

The sprint is marked **Completed**, its velocity (completed story points) is
recorded, and the board no longer has an active sprint. Everyone viewing the board
is updated.

### Deleting a planned sprint

Only sprints in **Planning** can be deleted.

1. Click the delete icon on the sprint's header.
2. Click **Yes, delete** (or **Cancel**).

The sprint is deleted and its cards return to the Backlog section. The cards
themselves are not deleted.

---

## Reports and analytics

### Sprint Reports

Click the **Reports** icon in the sprint header to open **Sprint Reports**. It has
three tabs:

- **Burndown** — remaining story points for the active sprint over time (solid
  line), against an ideal straight-line burndown from the total to zero (dashed
  line). Each point is a sprint snapshot; Alex records one when the sprint starts and
  another when it completes. If the line is above the ideal, the team is behind pace.
- **Velocity** — completed story points for each of the board's last ten completed
  sprints, with a dashed line and label for the average velocity. Use the average
  to size future sprints.
- **Summary** — a **Sprint History** table of completed sprints with their
  **Status**, **Completed Points**, **Total Points** and **Velocity**.

Sprint Reports are opened from the sprint header, so they are available while a
sprint is active.

### Board Analytics

Click the **Analytics** tab on any board to open **Board Analytics**. It has two
tabs.

**Cycle Time** covers cards that moved in the last 30 days:

- **Avg Cycle Time** — average time from a card first entering an In Progress
  column to entering a Done or Released column
- **Avg Lead Time** — average time from a card's creation to entering a Done or
  Released column
- **Average Time per Column** — a chart of how long cards spend in each column
- **Card Details** — each card's type, cycle time and lead time

If no cards have moved between columns yet, the tab says so.

**Cumulative Flow** shows how many cards were in each column on each day, so you can
spot bottlenecks (a band that keeps widening) and changes in throughput.

- Choose the range: 7, 14, 30 (default), 60 or 90 days.
- Toggle **Stacked** and **Grid**.
- Hover over the chart to see the counts per column and the total for a day.

Analytics are calculated from the history Alex records each time a card enters or
leaves a column, and depend on each column's **Category** (see
[Column categories](#column-categories)).

---

## Managing columns

Open the **Columns** tab on a board to set up its columns. Changes save
automatically.

### Starting from a template

If the board has no columns, pick a template:

| Template             | Columns                                                          |
| -------------------- | ---------------------------------------------------------------- |
| **Simple Kanban**    | To Do, In Progress, Review, Done                                 |
| **Scrum Board**      | Backlog, To Do, In Progress, Testing, Review, Done               |
| **Release Pipeline** | Backlog, Development, Code Review, QA, Staging, Released         |

Or click **Add Column Manually**.

### Adding and editing columns

- Click **Add Column** to add a column named "New Column".
- Edit each column's **Name**, **Category**, **Status**, **Color** and
  **WIP Limit** directly. Name and WIP Limit save when you leave the field; the
  other settings save as soon as you choose a value.
- Leave **WIP Limit** blank for no limit.
- Drag a column by its handle to change its order on the board.
- The badge on each column shows how many cards it holds.

### Column categories

Each column's **Category** tells Alex what kind of stage it is: Backlog, To Do,
In Progress, Testing, Review, Done or Released.

| Category               | Effect                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| **In Progress**        | Cycle time starts when a card first enters a column with this category                                 |
| **Done**, **Released** | Cards here count as completed for sprint progress and epic progress, end cycle and lead time, are hidden by **Hide Done**, and are subject to done card retention |
| **To Do**, **In Progress** | Moving a completed sprint card back into one of these columns marks it incomplete again           |

The column's **Status** is copied to a card's **Status** when the card moves into
the column.

### Deleting a column

1. Click the delete icon on the column.
2. Confirm with **Delete**.

Cards in the deleted column are not deleted; they move to the **Backlog** tab.
Deleting columns requires **Alex Admin**.

---

## Real-time collaboration

Several people can work on the same board at once. When anyone creates, edits,
moves or deletes a card, the change appears for everyone else viewing the board
within moments, without a page refresh. Each browser tab is tracked separately, so
you can keep the same board open in more than one tab.

### Connection status

The indicator in the top bar shows how the board is receiving updates. Hover over
it for details.

| Status            | Meaning                                                                         |
| ----------------- | ------------------------------------------------------------------------------- |
| **Real-time**     | Connected to live updates                                                       |
| **Connecting...** | Establishing the live connection                                                |
| **Auto-refresh**  | Live updates are unavailable; the board checks for changes every 15 seconds     |
| **Offline**       | Not connected                                                                   |
| **Error**         | The connection failed; refresh the page                                         |

Next to it, a save indicator shows **Saving...**, **Saved** or **Save failed** as
your own changes are sent, and **Updated** when an auto-refresh brings in someone
else's change.

Click **Refresh** to reload the board immediately; it also tries to reconnect live
updates. Alex also checks for missed changes and tries to reconnect when you return
to the browser tab.

### Working together

- If two people edit the same card at the same time, the last save wins. Coordinate
  before editing the same card.
- Let your team know before moving many cards at once; everyone sees the cards
  move.
- Use the sprint header during stand-ups to track progress together.

---

## Administration

This section is for users with **Alex Admin**.

### The Admin tab

The **Admin** tab opens the **Admin Management** page, which has three sub-tabs:
**Boards**, **Card Fields** and **Settings**.

Until setup is complete, a **Getting Started** checklist shows three steps:
**Create a Board**, **Set Up Columns** and **Assign Users**, with a button for the
next step.

### Managing boards

On the **Boards** sub-tab:

- Click **New Board** (or **Create Your First Board**). Enter a **Board Name**, an
  optional **Description** and a **Board Type** (Project, Personal or Team). Leave
  **Create with default columns (To Do, In Progress, In Review, Done)** checked to
  start with a working board, then click **Create**.
- Click **Open Board** on a board to open it.
- From a board's actions menu, choose **Edit** to change its name, description,
  type and **Active** setting, or **Delete** to delete it. Deleting a board also
  deletes all of its columns and cards, and cannot be undone.

To turn a board into a sprint board, edit the board record and set **Type** to
**Sprint** (see [Kanban boards and sprint boards](#kanban-boards-and-sprint-boards)).

Two other board settings are fields on the board record:

- **Default Sprint Duration (Days)**
- **Done Card Retention Days** — on Kanban boards, hides done cards from the board
  after this many days

If these fields are not on your board page layout, add them in Setup.

### Card custom fields

The **Card Fields** sub-tab chooses extra card fields to show on cards on the board,
as `Label: value` pills. Any accessible field on the Card object can be used,
including custom fields your org has added.

1. Click **Add Field**.
2. Choose the **Card Field**.
3. Optionally enter a **Display Label** (leave blank to use the field's label).
4. Choose a **Field Type**: Text, Number, Date, Checkbox, Picklist, Currency,
   Percent or URL.
5. Set a **Sort Order** to control the order of the pills, and make sure **Active**
   is on.
6. Click **Create**.

Use the edit icon to change a field, or the deactivate icon to stop showing it on
cards. Changes are deployed as metadata and can take a moment to appear. Managing
card fields requires the `ManageCardFields` custom permission, which is part of
**Alex Admin**.

### Settings

The **Settings** sub-tab summarizes the two permission sets and shows the app's
namespace (`OpenSF`). Assign permission sets in **Setup → Permission Sets**.

### Choosing card panel fields

The fields shown in the card panel come from the **Modal Settings** record of the
**Kanban Board Settings** custom metadata type. To change them, go to
**Setup → Custom Metadata Types → Kanban Board Settings → Manage Records**, edit
**Modal Settings**, and update **Field Names**: a comma-separated list of Card field
API names, in display order (for example, `Subject__c, Description__c, Priority__c`).

### Adding a board to other pages

The **Kanban Board** component can be added with Lightning App Builder to app and
home pages (set its **Board ID** property) and to Board record pages. It can also be
placed on an Experience Cloud site with **Experience Cloud Mode** turned on, which
shows a read-only board without the tabs, drag and drop or card editing.

---

## Keyboard and mouse shortcuts

| Shortcut                                | Where                        | Action                                                  |
| --------------------------------------- | ---------------------------- | ------------------------------------------------------- |
| **Esc**                                 | Card panel                   | Close the panel (asks first if there are unsaved changes) |
| **Esc**                                 | Right-click menu, sprint dialog | Close it                                             |
| **Enter**                               | Backlog new card form        | Create the card and keep the form open                  |
| **Enter**                               | Backlog new sprint form      | Create the sprint                                       |
| **Esc**                                 | Backlog new card or sprint form | Cancel                                               |
| **Ctrl+click** (**Cmd+click** on Mac)   | Backlog row                  | Add to or remove from the selection                     |
| **Shift+click**                         | Backlog row                  | Select a range of rows                                  |
| Middle-click the card number            | Backlog row                  | Open the card record in a new browser tab               |
| Right-click                             | Card, backlog row, planned sprint header | Open the context menu                       |
| **Enter** or **Space**                  | Columns tab: **Add Column** or a template | Activate it                                |

---

## Troubleshooting

### The Alex apps or the Admin tab are missing

Make sure you have an Alex permission set. Either permission set gives access to
both apps; only **Alex Admin** includes the **Admin** tab.

### The board shows "No Active Sprint"

The board is a sprint board with no active sprint. Click **Go to Backlog**, then
create or start a sprint. Starting sprints requires **Alex Admin**.

### "New Sprint" does not appear on the Backlog tab

The board's **Type** is not **Sprint**. Edit the board record and change it.

### "Start Sprint" does not appear on a planned sprint

Another sprint is already active on the board. Complete it first.

### Sprint actions fail or have no effect

Creating, starting, completing and deleting sprints require **Alex Admin**. Users
with **Alex User** can view sprints, sprint reports and analytics.

### Live updates are not appearing

- Check the connection status in the top bar. If it shows **Auto-refresh**, changes
  still arrive every 15 seconds.
- Click **Refresh**, or reload the page, to reconnect.
- If the problem persists, ask your admin to confirm that you have an Alex
  permission set (it grants access to Alex's real-time events) and that your org's
  streaming event limits have not been reached.

### Drag and drop is not working

- Use a current version of Chrome, Edge, Firefox or Safari.
- Disable browser extensions that might interfere with dragging.
- Check that you have permission to edit cards.

### Saving a card fails with a permission error

Check that you have an Alex permission set. If your org has restricted sharing for
Alex's objects, make sure you have access to the board and card records.

### A card disappeared from the board

Check whether a filter is active (the filter bar shows a count such as
**5 of 12 cards**), whether **Hide Done** is on, or whether the board has a
**Done Card Retention Days** setting. The card may also have been moved to the
backlog by another user.

---

## Getting help

- **Bugs and feature requests:** [GitHub Issues](https://github.com/OpenSystemsFoundation/alex-app/issues).
  Include the package version, the steps to reproduce and any error message.
- **Questions and ideas:** [GitHub Discussions](https://github.com/OpenSystemsFoundation/alex-app/discussions)

See also the [Quick Start](QUICKSTART.md) and, for how Alex works under the hood,
the [Architecture](ARCHITECTURE.md) guide.
