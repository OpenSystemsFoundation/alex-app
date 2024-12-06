import sys
import random
import string
import subprocess
import os
from .selector import Selector
from .salesforce import Salesforce


class DataFactory:

    @staticmethod
    def delete_cards():
        try:
            delete_command = os.path.normpath(
                "sf apex run --file scripts/apex/DeleteCards.apex --json"
            )
            print(f"Executing command: {delete_command}")
            result = subprocess.run(
                delete_command, shell=True, text=True, capture_output=True
            )
            if result.stderr:
                if "DEP0040" in result.stderr:
                    print("Deprecation warning ignored: ", result.stderr)
                else:
                    print("Error occurred:", result.stderr)
            print("Output:", result.stdout)
            result.check_returncode()

        except subprocess.CalledProcessError as e:
            print("Command failed:", e)
            raise

    @staticmethod
    def delete_columns():
        try:
            delete_command = os.path.normpath(
                "sf apex run --file scripts/apex/DeleteColumns.apex --json"
            )
            print(f"Executing command: {delete_command}")
            result = subprocess.run(
                delete_command, shell=True, text=True, capture_output=True
            )
            if result.stderr:
                if "DEP0040" in result.stderr:
                    print("Deprecation warning ignored: ", result.stderr)
                else:
                    print("Error occurred:", result.stderr)
            print("Output:", result.stdout)
            result.check_returncode()

        except subprocess.CalledProcessError as e:
            print("Command failed:", e)
            raise

    @staticmethod
    def delete_boards():
        try:
            delete_command = os.path.normpath(
                "sf apex run --file scripts/apex/DeleteColumns.apex --json"
            )
            print(f"Executing command: {delete_command}")
            result = subprocess.run(
                delete_command, shell=True, text=True, capture_output=True
            )
            if result.stderr:
                if "DEP0040" in result.stderr:
                    print("Deprecation warning ignored: ", result.stderr)
                else:
                    print("Error occurred:", result.stderr)
            print("Output:", result.stdout)
            result.check_returncode()

        except subprocess.CalledProcessError as e:
            print("Command failed:", e)
            raise

    @staticmethod
    def setup_test_board(num_boards=1, cards_per_column=0):
        print(
            f"Setting up {num_boards} test board(s) with {cards_per_column} cards per column."
        )
        """Master method to generate dynamic setups of the board."""
        board_name = "Playwright Test Board"
        existing_board = Selector.query_salesforce(
            f"SELECT Id FROM OpenSF__Board__c WHERE Name='{board_name}'"
        )
        if existing_board["result"]["totalSize"] > 0:
            print(f"Board '{board_name}' already exists.")
            return existing_board["result"]["records"][0]["Id"]
        if "DEP0040" in existing_board:
            print("Deprecation warning ignored: ", existing_board)

        # Create the board
        board_id = DataFactory.add_board(board_name)
        print(f"Created board '{board_name}' with ID: {board_id}")

        # Create columns for the board
        column_headers = ["Backlog", "To Do", "In Progress", "Done"]
        for position, column_header in enumerate(column_headers, start=1):
            DataFactory.add_column(board_id, position * 10, column_header)
            print(f"Created column '{column_header}' at position {position * 10}")

        return board_id

    @staticmethod
    def generate_and_execute_commands(data):
        print("Generating and executing commands for boards, columns, and cards.")
        column_position_to_id = {}

        for board in data["boards"]:
            print(f"Creating Board: {board['Name']}")
            command = f'sf data create record --sobject OpenSF__Board__c --values "Name=\'{board["Name"]}\'" --json'
            result = Salesforce.execute_sf_command(command)
            if "DEP0040" in result.stderr:
                print("Deprecation warning ignored: ", result.stderr)
            board_id = result["result"]["id"]
            print(f"Created Board: {board['Name']} with ID: {board_id}")

        for column_ in data["columns"]:
            print(f"Creating Column: {column_['ColumnHeader']}")
            parent_board_id = board_id

            command = (
                f"sf data create record --sobject OpenSF__Column__c "
                f'--values "OpenSF__Position__c={column_["Position"]} OpenSF__Board__c=\'{parent_board_id}\' OpenSF__ColumnHeader__c=\'{column_["ColumnHeader"]}\'" --json'
            )
            result = Salesforce.execute_sf_command(command)
            if "DEP0040" in result.stderr:
                print("Deprecation warning ignored: ", result.stderr)
            column_id = result["result"]["id"]

            column_position_to_id[(column_["Board"], column_["Position"])] = column_id
            print(f"Created column: {column_['ColumnHeader']} with ID: {column_id}")

        for card in data["cards"]:
            column_id = column_position_to_id.get(
                (card["Board"], card["Column_Position"])
            )
            if not column_id:
                print(
                    f"No column ID found for position {card['Column_Position']} on board {card['Board']}"
                )
                sys.exit(1)
            print(
                f"Creating Card at position {card['Position']} on column ID: {column_id}"
            )
            command = (
                f"sf data create record --sobject OpenSF__Card__c "
                f'--values "OpenSF__Position__c={card["Position"]} OpenSF__Column__c=\'{column_id}\'" --json'
            )
            result = Salesforce.execute_sf_command(command)
            if "DEP0040" in result.stderr:
                print("Deprecation warning ignored: ", result.stderr)
            card_id = result["result"]["id"]
            print(f"Created Card with ID: {card_id} on column ID: {column_id}")

    @staticmethod
    def add_board(name):
        print(f"Adding board with name: {name}")
        """Add a single board record."""
        command = f"sf data create record --sobject OpenSF__Board__c --values \"Name='{name}'\" --json"
        result = Salesforce.execute_sf_command(command)
        if "DEP0040" in result.stderr:
            print("Deprecation warning ignored: ", result.stderr)
        board_id = result["result"]["id"]
        print(f"Created Board: {name} with ID: {board_id}")
        return board_id

    @staticmethod
    def add_column(board_id, position, column_header):
        print(
            f"Adding column '{column_header}' at position {position} to board ID: {board_id}"
        )
        """Add a single column record."""
        command = (
            f"sf data create record --sobject OpenSF__Column__c "
            f"--values \"OpenSF__Position__c={position} OpenSF__Board__c='{board_id}' OpenSF__ColumnHeader__c='{column_header}'\" --json"
        )
        result = Salesforce.execute_sf_command(command)
        if "DEP0040" in result.stderr:
            print("Deprecation warning ignored: ", result.stderr)
        column_id = result["result"]["id"]
        print(f"Created Column: {column_header} with ID: {column_id}")
        return column_id

    @staticmethod
    def add_card(column_id, position):
        print(f"Adding card at position {position} to column ID: {column_id}")
        """Add a single card record."""
        command = (
            f"sf data create record --sobject OpenSF__Card__c "
            f"--values \"OpenSF__Position__c={position} OpenSF__Column__c='{column_id}'\" --json"
        )
        result = Salesforce.execute_sf_command(command)
        if "DEP0040" in result.stderr:
            print("Deprecation warning ignored: ", result.stderr)
        card_id = result["result"]["id"]
        print(f"Created Card with ID: {card_id} on column ID: {column_id}")
        return card_id

    @staticmethod
    def generate_name(base):
        print(f"Generating name with base: {base}")
        """Generate a random name based on a base string."""
        new_name = f"{base}_" + "".join(
            random.choices(string.ascii_uppercase + string.digits, k=4)
        )
        print(f"Generated name: {new_name}")
        return new_name

    @staticmethod
    def generate_data(num_boards=1, cards_per_column=0, board_name=None):
        print(
            f"Generating data for {num_boards} board(s) with {cards_per_column} cards per column."
        )
        data = {"boards": [], "columns": [], "cards": []}

        column_headers = ["Backlog", "To Do", "In Progress", "Done"]

        for i in range(num_boards):
            if not board_name:
                board_name = DataFactory.generate_name("Board")
            data["boards"].append({"Name": board_name})

            for j, column_header in enumerate(column_headers):
                data["columns"].append(
                    {
                        "Position": (j + 1) * 10,
                        "Board": board_name,
                        "ColumnHeader": column_header,
                    }
                )

                for k in range(cards_per_column):
                    data["cards"].append(
                        {
                            "Position": k + 1,
                            "Column_Position": (j + 1) * 10,
                            "Board": board_name,
                        }
                    )
        if "DEP0040" in data:
            print("Deprecation warning ignored: ", data)
        print("Data generation complete.")
        return data


# Example usage:
# DataFactory.setup_test_board(num_boards=2, cards_per_column=5)
# DataFactory.delete_all_cards()
# board_id = DataFactory.add_board("New Board")
# column_id = DataFactory.add_column(board_id, 10, "To Do")
# card_id = DataFactory.add_card(column_id, 1)
