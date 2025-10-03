import random
import string
import subprocess
import json
import sys

def generate_name(base):
    """Generate a random name based on a base string."""
    return f"{base}_" + ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))

def generate_lexorank(index, total):
    """
    Generate a LexoRank position string for the given index.
    Uses a simple bucket-based approach for test data.
    
    Args:
        index (int): The position index (0-based)
        total (int): Total number of items
    
    Returns:
        str: LexoRank position string (e.g., '0|h00000:')
    """
    # Use bucket 0 and distribute positions evenly in the 'h' range
    # Format: 0|h{5-char-base36}:
    if total <= 1:
        return '0|hzzzzz:'
    
    # Calculate position in range (increment by spacing to avoid collisions)
    increment = int(36**5 / (total + 1))
    position_value = increment * (index + 1)
    
    # Convert to base-36 and pad to 5 characters
    base36_chars = '0123456789abcdefghijklmnopqrstuvwxyz'
    position_str = ''
    temp = position_value
    
    for _ in range(5):
        position_str = base36_chars[temp % 36] + position_str
        temp //= 36
    
    return f'0|h{position_str}:'

def generate_data(num_boards=1, cards_per_column=0):
    """
    Generate test data structure for Kanban boards, columns, and cards.
    
    Args:
        num_boards (int): Number of boards to generate (default: 1)
        cards_per_column (int): Number of cards to create per column (default: 0)
    
    Returns:
        dict: Dictionary containing boards, columns, and cards lists
    """
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
        
        # Generate LexoRank positions for columns
        for j, column_header in enumerate(column_headers):
            column_position = generate_lexorank(j, len(column_headers))
            data["columns"].append({
                "LexoRankPosition": column_position,
                "Board": board_name,
                "ColumnHeader": column_header
            })
            
            # Generate LexoRank positions for cards in this column
            for k in range(cards_per_column):
                card_position = generate_lexorank(k, cards_per_column)
                data["cards"].append({
                    "LexoRankPosition": card_position,
                    "Column_LexoRankPosition": column_position,
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
    """Execute Salesforce CLI commands to create boards, columns, and cards."""
    # Mapping to track column IDs by their (board_name, lexorank_position) for card creation
    column_position_to_id = {}
    
    # Create Boards
    for board in data['boards']:
        command = f'sf data create record --sobject OpenSF__Board__c --values "Name=\'{board["Name"]}\'" --json'
        result = execute_sf_command(command)
        board_id = result["result"]["id"]
        print(f"Created Board: {board['Name']} with ID: {board_id}")
    
    # Create columns and store column IDs for later card association
    for column_ in data['columns']:
        # Using the last created board_id (assumes single board per execution)
        parent_board_id = board_id

        command = (
            f'sf data create record --sobject OpenSF__Column__c '
            f'--values "OpenSF__LexoRankPosition__c=\'{column_["LexoRankPosition"]}\' OpenSF__Board__c=\'{parent_board_id}\' OpenSF__ColumnHeader__c=\'{column_["ColumnHeader"]}\'" --json'
        )
        result = execute_sf_command(command)
        column_id = result["result"]["id"]

        # Store the column ID by its LexoRank position on the board
        column_position_to_id[(column_["Board"], column_["LexoRankPosition"])] = column_id
        print(f"Created column: {column_['ColumnHeader']} with ID: {column_id} at position: {column_['LexoRankPosition']}")
    
    # Create Cards using the column IDs
    for card in data['cards']:
        column_id = column_position_to_id.get((card['Board'], card['Column_LexoRankPosition']))
        if not column_id:
            print(f"No column ID found for position {card['Column_LexoRankPosition']} on board {card['Board']}")
            sys.exit(1)
        
        command = (
            f'sf data create record --sobject OpenSF__Card__c '
            f'--values "OpenSF__LexoRankPosition__c=\'{card["LexoRankPosition"]}\' OpenSF__Column__c=\'{column_id}\'" --json'
        )
        result = execute_sf_command(command)
        card_id = result["result"]["id"]
        print(f"Created Card with ID: {card_id} on column ID: {column_id} at position: {card['LexoRankPosition']}")

# Generate the data
example_data = generate_data()

# Generate and execute Salesforce CLI commands
generate_and_execute_commands(example_data)