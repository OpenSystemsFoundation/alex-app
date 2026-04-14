"""
Test Data Creator for Alex Kanban App

Uses Apex anonymous scripts (via sf apex run) to create test boards.
Each scenario runs a self-contained Apex script that creates all necessary
records: boards, columns, cards, sprints, sprint cards, and snapshots.

Usage:
    python create_test_data_apex.py          # Interactive menu
    python create_test_data_apex.py --all    # Create all scenarios
    python create_test_data_apex.py 1 3 5    # Create specific scenarios by number
"""

import subprocess
import sys
import os

# Resolve the apex scripts directory relative to this file
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
APEX_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, "..", "apex"))

SCENARIOS = [
    {
        "id": 1,
        "name": "Empty Kanban Board",
        "file": "CreateEmptyKanbanBoard.apex",
        "description": "Kanban board (Project type) with 6 columns, no cards",
    },
    {
        "id": 2,
        "name": "Filled Kanban Board",
        "file": "CreateFilledKanbanBoard.apex",
        "description": "Kanban board with 15 cards across all columns (epic, stories, bugs, tasks)",
    },
    {
        "id": 3,
        "name": "Empty Sprint Board",
        "file": "CreateEmptySprintBoard.apex",
        "description": "Sprint board with 6 columns, no sprints or cards",
    },
    {
        "id": 4,
        "name": "New Sprint Board",
        "file": "CreateNewSprintBoard.apex",
        "description": "Sprint board with 1 sprint in Planning (not started), 10 backlog cards, 6 assigned to sprint",
    },
    {
        "id": 5,
        "name": "Running Sprint Board",
        "file": "CreateRunningSprintBoard.apex",
        "description": "Sprint board with 3 completed sprints + 1 active sprint, 28 cards, burndown snapshots",
    },
]


def run_apex_script(apex_file):
    """Execute an Apex anonymous script via sf CLI."""
    filepath = os.path.join(APEX_DIR, apex_file)

    if not os.path.exists(filepath):
        print(f"  ERROR: Apex script not found: {filepath}")
        return False

    command = ["sf", "apex", "run", "--file", filepath]

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=120,
        )

        if result.returncode != 0:
            print(f"  FAILED: {result.stderr.strip()}")
            if result.stdout:
                print(f"  Output: {result.stdout.strip()}")
            return False

        # Check for compilation/runtime errors in the output
        output = result.stdout
        if "Error" in output and "CREATED" not in output:
            print(f"  APEX ERROR: {output.strip()}")
            return False

        # Extract debug messages
        for line in output.split("\n"):
            if "CREATED" in line or "Sprints:" in line or "Cards:" in line:
                # Clean up debug log formatting
                clean = line.strip()
                if "|USER_DEBUG|" in clean:
                    clean = clean.split("|USER_DEBUG|")[-1].strip()
                    # Remove [N] prefix if present
                    if clean.startswith("["):
                        clean = clean.split("]", 1)[-1].strip()
                print(f"  {clean}")

        return True

    except subprocess.TimeoutExpired:
        print("  TIMEOUT: Script took longer than 120 seconds")
        return False
    except Exception as e:
        print(f"  ERROR: {e}")
        return False


def print_menu():
    """Display the interactive menu."""
    print("\n" + "=" * 60)
    print("  Alex Kanban - Test Data Creator")
    print("=" * 60)
    print()
    for s in SCENARIOS:
        print(f"  [{s['id']}] {s['name']}")
        print(f"      {s['description']}")
        print()
    print(f"  [A] Create ALL scenarios")
    print(f"  [Q] Quit")
    print()


def run_scenarios(scenario_ids):
    """Run the specified scenarios."""
    selected = [s for s in SCENARIOS if s["id"] in scenario_ids]

    if not selected:
        print("No valid scenarios selected.")
        return

    print(f"\nCreating {len(selected)} scenario(s)...\n")

    success = 0
    failed = 0

    for s in selected:
        print(f"[{s['id']}/{len(SCENARIOS)}] {s['name']}...")
        if run_apex_script(s["file"]):
            success += 1
            print(f"  OK\n")
        else:
            failed += 1
            print(f"  FAILED\n")

    print("-" * 40)
    print(f"Done: {success} succeeded, {failed} failed")


def main():
    # CLI arguments mode
    if len(sys.argv) > 1:
        if sys.argv[1] == "--all":
            run_scenarios([s["id"] for s in SCENARIOS])
        else:
            try:
                ids = [int(arg) for arg in sys.argv[1:]]
                run_scenarios(ids)
            except ValueError:
                print(f"Usage: {sys.argv[0]} [--all | <scenario numbers...>]")
                sys.exit(1)
        return

    # Interactive mode
    while True:
        print_menu()
        choice = input("  Select option(s): ").strip().lower()

        if choice == "q":
            print("Bye!")
            break
        elif choice == "a":
            run_scenarios([s["id"] for s in SCENARIOS])
        else:
            try:
                ids = [int(c.strip()) for c in choice.replace(",", " ").split()]
                valid_ids = [i for i in ids if 1 <= i <= len(SCENARIOS)]
                if valid_ids:
                    run_scenarios(valid_ids)
                else:
                    print("Invalid selection. Enter numbers 1-5, 'A' for all, or 'Q' to quit.")
            except ValueError:
                print("Invalid input. Enter numbers 1-5, 'A' for all, or 'Q' to quit.")


if __name__ == "__main__":
    main()
