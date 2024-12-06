import random
import string
import subprocess
import json
import sys

def generate_name(base):
    """Generate a random name based on a base string."""
    return f"{base}_" + ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))

def generate_data(num_boards=1, cards_per_column=0):
    data = {
        "boards": [],
        "columns": [],
        "cards": []
    }
    
    column_headers = ["Backlog", "To Do", "In Progress", "Testing", "Review", "Done"]
    
    for i in range(num_boards):
        board_name = generate_name("Board")
        data["boards"].append({
            "Name": board_name
        })
        
        for j, column_header in enumerate(column_headers):
            data["columns"].append({
                "Position": (j + 1) * 10,
                "Board": board_name,
                "ColumnHeader": column_header
            })
            
            for k in range(cards_per_column):
                data["cards"].append({
                    "Position": k + 1,
                    "Column_Position": (j + 1) * 10,
                    "Board": board_name
                })
    
    return data

def execute_sf_command(command):
    """Execute an sf CLI command and return the result as a dictionary."""
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print(f"Command Failed: {command}")
            print(f"Error: {result.stderr}")
            sys.exit(1)
        
        return json.loads(result.stdout)
    except json.JSONDecodeError as e:
        print(f"JSON Decode Error: {e}")
        print(f"Output was: {result.stdout}")
        sys.exit(1)

def generate_and_execute_commands(data):
    # Mapping from column Position to column ID
    column_position_to_id = {}
    
    # Create Boards
    for board in data['boards']:
        command = f'sf data create record --sobject OpenSF__Board__c --values "Name=\'{board["Name"]}\'" --json'
        result = execute_sf_command(command)
        board_id = result["result"]["id"]
        print(f"Created Board: {board['Name']} with ID: {board_id}")
    
    # Create columns and store column IDs
    for column_ in data['columns']:
        parent_board_id = board_id  # Since we assume one board per run

        command = (
            f'sf data create record --sobject OpenSF__Column__c '
            f'--values "OpenSF__Position__c={column_["Position"]} OpenSF__Board__c=\'{parent_board_id}\' OpenSF__ColumnHeader__c=\'{column_["ColumnHeader"]}\'" --json'
        )
        result = execute_sf_command(command)
        column_id = result["result"]["id"]

        # Store the column ID by its position on the board
        column_position_to_id[(column_["Board"], column_["Position"])] = column_id
        print(f"Created column: {column_['ColumnHeader']} with ID: {column_id}")
    
    # Create Cards using the column IDs
    for card in data['cards']:
        column_id = column_position_to_id.get((card['Board'], card['Column_Position']))
        if not column_id:
            print(f"No column ID found for position {card['Column_Position']} on board {card['Board']}")
            sys.exit(1)
        
        command = (
            f'sf data create record --sobject OpenSF__Card__c '
            f'--values "OpenSF__Position__c={card["Position"]} OpenSF__Column__c=\'{column_id}\'" --json'
        )
        result = execute_sf_command(command)
        card_id = result["result"]["id"]
        print(f"Created Card with ID: {card_id} on column ID: {column_id}")

# Generate the data
example_data = generate_data()

# Generate and execute Salesforce CLI commands
generate_and_execute_commands(example_data)
