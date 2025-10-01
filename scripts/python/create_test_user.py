import subprocess
import json
import os
from urllib.parse import quote


# Static test user credentials
TEST_USERNAME = "alexadmin@test.com"
TEST_EMAIL = "support@opensf.foundation"
PERMSET_NAME = "Alex_Admin"


# Function to get the default org username
def get_default_org():
    """Get the default Salesforce org username."""
    try:
        command = "sf org display --json"
        result = subprocess.run(
            command,
            shell=True,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        output = json.loads(result.stdout)
        username = output.get("result", {}).get("username", None)
        org_id = output.get("result", {}).get("id", None)
        
        if username:
            return username, org_id
        else:
            raise ValueError("Default org username not found.")
    except subprocess.CalledProcessError as e:
        print(f"Error getting default org: {e.stderr.decode()}")
        return None, None


# Function to create a test user
def create_test_user(target_org):
    """Create a new test user in Salesforce using Apex script."""
    try:
        print("Checking for existing user and creating/updating test user...")
        
        # Path to the permanent Apex script
        apex_file = os.path.join(os.path.dirname(__file__), '..', 'apex', 'CreateTestUser.apex')
        
        if not os.path.exists(apex_file):
            print(f"Error: Apex script not found at {apex_file}")
            return None, None, None
        
        # Execute the Apex script
        apex_command = f'sf apex run --file "{apex_file}" --target-org {target_org}'
        
        apex_result = subprocess.run(
            apex_command,
            shell=True,
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Check if there was an error
        if apex_result.returncode != 0:
            error_output = apex_result.stderr if apex_result.stderr else apex_result.stdout
            print(f"Apex execution error: {error_output}")
            return None, None, None
        
        # Parse the output
        output_lines = apex_result.stdout
        user_id = None
        user_status = "UNKNOWN"
        
        for line in output_lines.split('\n'):
            if 'USER_CREATED:' in line:
                user_id = line.split('USER_CREATED:')[1].strip().split()[0]
                user_id = ''.join(c for c in user_id if c.isalnum())
                user_status = "CREATED"
            elif 'USER_EXISTS:' in line:
                user_id = line.split('USER_EXISTS:')[1].strip().split()[0]
                user_id = ''.join(c for c in user_id if c.isalnum())
                user_status = "EXISTS"
        
        if not user_id or len(user_id) < 15:
            # Try to query for the user
            print("Verifying user...")
            user_query = f"SELECT Id FROM User WHERE Username = '{TEST_USERNAME}' LIMIT 1"
            user_command = f'sf data query --query "{user_query}" --target-org {target_org} --json'
            
            user_result = subprocess.run(
                user_command,
                shell=True,
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            
            user_output = json.loads(user_result.stdout)
            user_records = user_output.get("result", {}).get("records", [])
            
            if user_records:
                user_id = user_records[0]["Id"]
            else:
                print("Error: Failed to retrieve user ID.")
                return None, None, None
        
        print(f"User {user_status.lower()}: {TEST_USERNAME} (ID: {user_id})")
        
        return TEST_USERNAME, user_id
        
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr.decode() if hasattr(e.stderr, 'decode') else str(e.stderr) if e.stderr else str(e)
        print(f"Error creating user: {error_msg}")
        return None, None
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        return None, None


# Function to assign permission set to user
def assign_permset_to_user(username, permset_name, target_org):
    """Assign a permission set to a user."""
    try:
        # First check if permission set is already assigned
        check_query = f"SELECT Id FROM PermissionSetAssignment WHERE PermissionSet.Name = '{permset_name}' AND Assignee.Username = '{username}' LIMIT 1"
        check_command = f'sf data query --query "{check_query}" --target-org {target_org} --json'
        
        check_result = subprocess.run(
            check_command,
            shell=True,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        
        check_output = json.loads(check_result.stdout)
        existing_assignments = check_output.get("result", {}).get("records", [])
        
        if existing_assignments:
            print(f"Permission set '{permset_name}' already assigned!")
            return True
        
        print(f"Assigning permission set '{permset_name}'...")
        
        command = (
            f'sf org assign permset --name {permset_name} '
            f'--on-behalf-of {username} --target-org {target_org}'
        )
        
        result = subprocess.run(
            command,
            shell=True,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        
        print(f"Permission set assigned successfully!")
        return True
        
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr.decode() if e.stderr else str(e)
        # Don't fail if permission set already assigned
        if "DUPLICATE" in str(error_msg) or "already" in str(error_msg).lower():
            print(f"Permission set already assigned!")
            return True
        print(f"Warning: Could not assign permission set: {error_msg}")
        return False


# Main execution
def main():
    print("Setting up test user...")
    print()
    
    # Get the default org
    target_org, org_id = get_default_org()
    
    if not target_org:
        print("Error: Could not determine the default org.")
        return
    
    # Create or update the test user
    username, user_id = create_test_user(target_org)
    
    if not username:
        print("Failed to create/update test user.")
        return
    
    # Assign the Alex_Admin permission set
    success = assign_permset_to_user(username, PERMSET_NAME, target_org)
    
    # Confirm permission set assignment
    print()
    print("Verifying permission set assignment...")
    try:
        verify_query = f"SELECT Assignee.Username, PermissionSet.Name FROM PermissionSetAssignment WHERE PermissionSet.Name = '{PERMSET_NAME}' AND Assignee.Username = '{username}'"
        verify_command = f'sf data query --query "{verify_query}" --target-org {target_org} --json'
        
        verify_result = subprocess.run(
            verify_command,
            shell=True,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        
        verify_output = json.loads(verify_result.stdout)
        assignments = verify_output.get("result", {}).get("records", [])
        
        print()
        print("=" * 80)
        print("✓ TEST USER CONFIGURED SUCCESSFULLY")
        print("=" * 80)
        print(f"Username: {username}")
        print(f"Email:    {TEST_EMAIL}")
        print(f"User ID:  {user_id}")
        print(f"Permission Set: {PERMSET_NAME} {'✓ ASSIGNED' if assignments else '✗ NOT ASSIGNED'}")
        print()
        print("Next step: Reset password in Setup > Users")
        print(f"Password reset email will be sent to {TEST_EMAIL}")
        print("=" * 80)
        
    except Exception as e:
        print(f"Error verifying permission set: {str(e)}")
        print()
        print(f"Username: {username}")
        print(f"User ID:  {user_id}")


if __name__ == "__main__":
    main()
