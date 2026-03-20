# Alex User Guide

**Version 2.0 — March 2026**

Welcome to Alex, a real-time collaborative Kanban board with Scrum support, built natively on the Salesforce platform. This guide covers everything you need to know to use Alex effectively as a team member.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [The Kanban Board](#the-kanban-board)
3. [Working with Cards](#working-with-cards)
4. [Drag and Drop](#drag-and-drop)
5. [The Backlog](#the-backlog)
6. [Sprint Management](#sprint-management)
7. [Sprint Analytics](#sprint-analytics)
8. [Real-time Collaboration](#real-time-collaboration)
9. [Keyboard Shortcuts](#keyboard-shortcuts)
10. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Accessing Alex

1. Log in to your Salesforce org
2. Click the **App Launcher** (grid icon in the top-left corner)
3. Search for **"Alex Kanban Board"**
4. Click to open the application

> Your Salesforce administrator must assign you a permission set before you can access Alex. If you see an error, ask your admin to assign **Alex_User** or **Alex_Admin**.

### Your First Board

When you open Alex for the first time, you'll see the board selector. If your team already has boards set up, select one from the dropdown. If you need to create a new board:

1. Click **"New Board"**
2. Enter a board name (e.g., "Team Sprint Board")
3. Optionally add a description
4. Click **Save**

<!-- Screenshot: Board creation dialog -->

### Understanding the Layout

The Alex interface has three main areas:

- **Board header** — Board selector, sprint header (if a sprint is active), and board actions
- **Columns** — Vertical lanes representing workflow stages (e.g., To Do, In Progress, Done)
- **Cards** — Individual work items that move across columns

<!-- Screenshot: Annotated board layout -->

---

## The Kanban Board

### Columns

Columns represent the stages of your workflow. Common setups include:

| Simple      | Scrum          | Custom      |
| ----------- | -------------- | ----------- |
| To Do       | Backlog        | Triage      |
| In Progress | Sprint Ready   | Design      |
| Done        | In Development | Development |
|             | In Review      | Code Review |
|             | Done           | QA          |
|             |                | Released    |

Each column can have a **WIP (Work In Progress) limit** — a maximum number of cards allowed in that column. When the limit is reached, the column header shows a visual warning to help the team focus on finishing work before starting new items.

### Board Navigation

- **Switch boards** using the board dropdown at the top
- **Toggle between board view and backlog view** using the view controls
- **Connection indicator** in the header shows your real-time sync status:
    - **Connected** — Live updates via platform events
    - **Polling** — Updates via periodic refresh (usually due to firewall restrictions)
    - **Offline** — No connection; changes will sync when reconnected

<!-- Screenshot: Connection status indicator states -->

---

## Working with Cards

### Creating a Card

1. Click the **"+" button** at the bottom of any column
2. Fill in the card details:
    - **Subject** (required) — Brief description of the work item
    - **Description** — Detailed information, acceptance criteria, notes
    - **Card Type** — Story, Bug, Task, or Epic
    - **Priority** — High, Medium, or Low
    - **Story Points** — Effort estimate (used for sprint velocity tracking)
    - **Assignee** — Team member responsible for the work
    - **Peer Reviewer** — Team member assigned for review
    - **Due Date** — Deadline for the work item
    - **Color** — Visual color coding for quick identification
    - **Needs Refinement** — Flag for items that need further discussion
    - **Epic** — Parent epic for grouping related work
3. Click **Save**

<!-- Screenshot: Card creation panel -->

### Viewing and Editing a Card

Click any card on the board to open the **card detail panel** on the right side. The panel shows all card fields and allows inline editing.

- Edit any field directly
- Click **Save** to persist changes
- Click **X** or press **Escape** to close without saving
- Resize the panel by dragging its left edge (300px to 800px width)

Changes are immediately visible to all connected users via real-time sync.

<!-- Screenshot: Card detail panel -->

### Card Types

| Type      | Purpose                                      | When to Use                                       |
| --------- | -------------------------------------------- | ------------------------------------------------- |
| **Story** | A user-facing feature or requirement         | New functionality that delivers user value        |
| **Bug**   | A defect or issue to fix                     | Something that is broken or behaving unexpectedly |
| **Task**  | A technical or operational task              | Infrastructure, documentation, research           |
| **Epic**  | A large body of work spanning multiple cards | Group related stories together                    |

### Card Colors

Use colors to visually categorize cards at a glance. Common conventions:

- **Red** — Urgent / blocked
- **Orange** — High priority
- **Blue** — Standard work
- **Green** — Quick wins
- **Purple** — Technical debt

Your team should agree on a color convention that works for your workflow.

### Deleting a Card

1. Open the card detail panel by clicking the card
2. Click **Delete**
3. The button changes to **"Confirm Delete"** for 3 seconds — click again to confirm
4. The card is permanently removed

> Cards cannot be recovered after deletion. Consider moving completed cards to a "Done" column instead of deleting them, especially if you want sprint analytics to remain accurate.

---

## Drag and Drop

Alex uses **LexoRank** positioning (the same algorithm Jira uses) for fast, efficient drag-and-drop ordering.

### Moving Cards Between Columns

1. Click and hold a card
2. Drag it to the target column
3. Drop it at the desired position within that column
4. The card saves automatically — no need to click Save

During the drag, you'll see a visual preview of where the card will land. The actual state only updates when you drop the card, so you can cancel at any time by pressing **Escape** or dropping the card back in its original position.

### Reordering Cards Within a Column

Drag a card up or down within the same column to change its priority order. Cards maintain their position order persistently — other users will see the same ordering.

### How It Works Behind the Scenes

Each card has a position value (a string like `0|hzzzzz:`) that allows infinite insertions between any two items without renumbering the entire list. This means drag-and-drop is instant, even on boards with hundreds of cards.

---

## The Backlog

The backlog view provides a flat, prioritized list of all cards that are not currently assigned to an active sprint.

### Accessing the Backlog

Click the **Backlog** tab or toggle to switch from the board view to the backlog view.

<!-- Screenshot: Backlog view -->

### Filtering and Searching

The backlog toolbar provides several ways to find cards:

- **Search** — Type to filter cards by subject, name, or card type
- **View Mode** — "All" shows all backlog cards; "Needs Refinement" shows only cards flagged for discussion
- **Priority Filter** — Filter by High, Medium, Low, or All
- **Card Type Filter** — Filter by Story, Bug, Task, Epic, or All

The toolbar also shows a summary: **"X cards, Y total story points"**

### Creating Cards in the Backlog

Click **"New Card"** in the backlog toolbar to show the inline creation form. Enter a subject and click Save. The form stays open so you can rapidly create multiple cards in succession.

### Reordering the Backlog

Drag rows using the **drag handle** (six-dot icon on the left) to reorder priority. The backlog uses LexoRank positioning, so reordering is instant and persistent.

### Bulk Actions

1. Select cards using the checkboxes (or use **Select All** in the header)
2. The bulk action bar appears with these options:
    - **Add to Sprint** — Move selected cards into the active sprint (only available when a sprint is active)
    - **Set Priority** — Change priority for all selected cards at once
    - **Delete** — Remove all selected cards
    - **Clear** — Deselect all

<!-- Screenshot: Bulk action bar -->

### Right-Click Context Menu

Right-click any card in the backlog for quick actions:

- **Move to Top** / **Move to Bottom** — Jump to the top or bottom of the backlog
- **Set Priority** — High, Medium, or Low
- **Toggle Refinement** — Mark or unmark as needing refinement
- **Move to Sprint** — Add to the active sprint (if one exists)
- **Delete** — Remove the card

### Refinement Workflow

Cards flagged with **Needs Refinement** can be filtered in the backlog view using the "Needs Refinement" view mode. This is useful during backlog grooming sessions:

1. Switch to **"Needs Refinement"** view
2. Review each flagged card with the team
3. Add story points, update descriptions, and clarify acceptance criteria
4. Uncheck **Needs Refinement** when the card is ready for sprint planning

---

## Sprint Management

Alex supports Scrum-style sprints with a full lifecycle: Planning, Active, and Completed.

### Sprint Lifecycle

```
Planning  ──>  Active  ──>  Completed
```

- **Planning** — Sprint is created but not yet started. Add cards, set goals.
- **Active** — Sprint is in progress. Only one active sprint per board at a time.
- **Completed** — Sprint is finished. Incomplete cards are moved to backlog or next sprint.

### Creating a Sprint

1. If no sprint is active, the sprint header shows **"No active sprint"** with a **"New Sprint"** button
2. Click **New Sprint**
3. Fill in:
    - **Sprint Goal** — What the team aims to achieve this sprint
    - **Start Date** — Defaults to today
    - **End Date** — Defaults to 2 weeks from start date
4. Click **Save**

The sprint is created in **Planning** status. You can add cards before starting it.

<!-- Screenshot: Sprint creation modal -->

### Adding Cards to a Sprint

There are several ways to add cards to a sprint:

- **From the backlog**: Select cards and click **"Add to Sprint"**
- **From the backlog context menu**: Right-click a card and choose **"Move to Sprint"**
- **Bulk selection**: Select multiple cards in the backlog and add them all at once

When a card is added to a sprint, its story points at that moment are captured (snapshot). This ensures sprint metrics remain accurate even if story points are later revised.

### Starting a Sprint

1. Click the sprint name or use the sprint modal
2. Click **"Start Sprint"**
3. Validation checks:
    - The sprint must have at least one card
    - No other sprint can be active on the same board
4. The sprint status changes to **Active**
5. An initial burndown snapshot is created
6. All connected users are notified via platform events

### The Sprint Header

When a sprint is active, the sprint header shows:

- **Sprint name** and **goal**
- **Date range** (start — end)
- **Progress bar** — Visual indicator of completed vs. total story points
- **Points display** — "25 / 100 pts (25%)"
- **Days remaining** — Color-coded:
    - Green: 3+ days remaining
    - Yellow: 2-3 days remaining
    - Red: Overdue or last day
- **Reports button** — Opens sprint analytics
- **Complete button** — Starts the sprint completion wizard

<!-- Screenshot: Sprint header with active sprint -->

### Completing a Sprint

When the sprint is done (or the time box expires):

1. Click **"Complete"** in the sprint header
2. **Step 1 — Summary**: Review sprint metrics
    - Completed cards count
    - Incomplete cards count
    - Completed story points
    - Total story points
3. **Step 2 — Dispositions** (if incomplete cards exist): For each incomplete card, choose:
    - **Move to Backlog** — Card returns to the unassigned backlog
4. **Step 3 — Confirmation**: Review and confirm
5. Click **Complete Sprint**

After completion:

- Sprint velocity is calculated (completed story points)
- A final burndown snapshot is saved
- The board's active sprint is cleared
- All connected users are notified

<!-- Screenshot: Sprint completion wizard, step 2 -->

---

## Sprint Analytics

Click the **Reports** button (chart icon) in the sprint header to access sprint analytics.

### Burndown Chart

The burndown chart shows remaining story points over time for the current or selected sprint.

- **Blue line** — Actual remaining story points (from daily snapshots)
- **Dashed gray line** — Ideal burndown trajectory (linear from total to zero)
- **X-axis** — Sprint days
- **Y-axis** — Remaining story points

A healthy sprint shows the blue line tracking near or below the ideal line. If the blue line is above the ideal, the team may be behind pace.

<!-- Screenshot: Burndown chart -->

### Velocity Chart

The velocity chart shows completed story points across past sprints.

- **Blue bars** — Each completed sprint's velocity (completed story points)
- **Red dashed line** — Average velocity across all displayed sprints
- **Labels** — Sprint name and velocity above each bar

Use the average velocity line to plan future sprint commitments. If your average is 40 points, committing to 60 is a risk.

<!-- Screenshot: Velocity chart -->

### Sprint Summary Table

A historical table of all completed sprints showing:

| Column           | Description                                       |
| ---------------- | ------------------------------------------------- |
| Sprint Name      | Auto-numbered (SP-0001, SP-0002, etc.)            |
| Status           | Planning, Active, or Completed                    |
| Completed Points | Story points completed in this sprint             |
| Total Points     | Story points committed at sprint start            |
| Velocity         | Completed story points (same as completed points) |

---

## Real-time Collaboration

Alex supports multiple users working on the same board simultaneously.

### How It Works

When any user makes a change (creates, updates, moves, or deletes a card), the change is broadcast to all connected users via Salesforce Platform Events. Changes appear in near real-time (typically within 1-2 seconds).

### Connection Modes

Alex uses a three-layer real-time system:

1. **Platform Events** (primary) — Near-instant updates via Salesforce's CometD streaming
2. **Polling fallback** — Periodic refresh when platform events are blocked (e.g., by corporate firewalls)
3. **Manual refresh** — Reload the page as a last resort

The connection status indicator in the board header shows which mode is active.

### Echo Prevention

When you make a change, Alex prevents your own change from echoing back to you. Each browser tab has a unique client ID, and your own events are filtered out so you only see changes from other users.

### Multi-Window Support

Each browser tab gets its own client ID, so you can have multiple tabs open to the same board without interference.

### Tips for Team Collaboration

- **Communicate** when moving many cards — other users will see cards shifting in real-time
- **Use the sprint header** to track team progress during standups
- **Check the connection indicator** if updates seem delayed
- **Avoid editing the same card simultaneously** — the last save wins

---

## Keyboard Shortcuts

| Shortcut | Action                                   |
| -------- | ---------------------------------------- |
| `Escape` | Close card detail panel / cancel drag    |
| `N`      | Create new card (when column is focused) |
| `E`      | Edit selected card                       |
| `Delete` | Delete selected card (with confirmation) |
| `Tab`    | Navigate between cards                   |
| `Enter`  | Open card details                        |

---

## Troubleshooting

### Cards Not Loading

- Verify your permission set is assigned (ask your admin for **Alex_User** or **Alex_Admin**)
- Clear browser cache and hard refresh (`Ctrl+Shift+R` / `Cmd+Shift+R`)
- Check the browser console (`F12`) for error messages

### Drag and Drop Not Working

- Use a supported browser: Chrome, Firefox, or Edge
- Disable browser extensions that may interfere with drag events
- Verify you have edit permissions on the board

### Real-time Updates Not Appearing

- Check the connection status indicator in the board header
- If it shows "Polling" or "Offline", platform events may be blocked by your network
- Try refreshing the page to re-establish the connection
- Ask your admin to verify that platform events are enabled and streaming API limits aren't exhausted

### Sprint Actions Unavailable

- **"New Sprint" not showing?** — There may already be an active sprint. Complete it first.
- **"Start Sprint" disabled?** — Ensure the sprint has at least one card and no other sprint is active on the board.
- **"Complete" not showing?** — Only users with the **Alex_Admin** permission set can manage sprint lifecycle actions. Standard users can view sprints and mark cards complete but cannot start or complete sprints.

### Getting Help

- **GitHub Issues**: [github.com/OpenSystemsFoundation/alex-app/issues](https://github.com/OpenSystemsFoundation/alex-app/issues)
- **GitHub Discussions**: [github.com/OpenSystemsFoundation/alex-app/discussions](https://github.com/OpenSystemsFoundation/alex-app/discussions)

---

**Document Version**: 2.0
**Last Updated**: March 2026
**Maintainer**: Open Systems Foundation
