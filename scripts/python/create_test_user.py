import subprocess
import json
import os
from urllib.parse import quote


# Static test user credentials
TEST_USERNAME = "alexadmin@test.com"
TEST_EMAIL = "support@opensf.foundation"
PERMSET_NAME = "Alex_Admin"


# Function to get default org username
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
        instance_url = output.get("result", {}).get("instanceUrl", None)
        
        if username:
            return username, org_id, instance_url
        else:
            raise ValueError("Default org username not found.")
    except subprocess.CalledProcessError as e:
        print(f"Error getting default org: {e.stderr.decode()}")
        return None, None, None


# Function to create a test user
def create_test_user(target_org):
    """Create a new test user in Salesforce using SF CLI."""
    try:
        print("Checking for existing user...")
        
        # First check if user already exists
        user_query = f"SELECT Id, Username FROM User WHERE Username = '{TEST_USERNAME}' LIMIT 1"
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
            # User exists
            user_id = user_records[0]["Id"]
            print(f"User exists: {TEST_USERNAME} (ID: {user_id})")
            return TEST_USERNAME, user_id, "EXISTS"
        
        # User doesn't exist, create using SF CLI
        print(f"Creating new user: {TEST_USERNAME}...")
        
        # Create user with command line options
        create_command = (
            f'sf org create user '
            f'username={TEST_USERNAME} '
            f'email={TEST_EMAIL} '
            f'LastName=Admin '
            f'FirstName=Alex '
            f'Alias=alexadm '
            f'profileName="System Administrator" '
            f'generatepassword=true '
            f'--target-org {target_org} --json'
        )
        
        create_result = subprocess.run(
            create_command,
            shell=True,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        create_output = json.loads(create_result.stdout)
        result_data = create_output.get("result", {})
        
        # Extract user ID from the result
        user_id = result_data.get("fields", {}).get("id") or result_data.get("userId")
        
        if user_id:
            print(f"User created: {TEST_USERNAME} (ID: {user_id})")
            return TEST_USERNAME, user_id, "CREATED"
        else:
            print("Error: Failed to retrieve user ID after creation.")
            print(f"Response: {json.dumps(create_output, indent=2)}")
            return None, None, None
        
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr if e.stderr else str(e)
        print(f"Error creating user: {error_msg}")
        return None, None, None
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        return None, None, None


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


# Function to generate password for user
def generate_password(username, target_org):
    """Generate a password for the test user."""
    try:
        print(f"Generating password for user...")
        
        command = (
            f'sf org generate password --on-behalf-of {username} '
            f'--target-org {target_org} --length 16 --complexity 5 --json'
        )
        
        result = subprocess.run(
            command,
            shell=True,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        
        output = json.loads(result.stdout)
        password = output.get("result", {}).get("password", None)
        
        if password:
            print(f"Password generated successfully!")
            return password
        else:
            print("Warning: Password generation completed but password not returned.")
            return None
        
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr.decode() if e.stderr else str(e)
        print(f"Warning: Could not generate password: {error_msg}")
        print("Note: Password generation only works for scratch org users.")
        return None
    except Exception as e:
        print(f"Unexpected error generating password: {str(e)}")
        return None


# Function to display user information
def display_user_info(username, target_org):
    """Display user information including password if available."""
    try:
        command = f'sf org display user --target-org {target_org} --json'
        
        result = subprocess.run(
            command,
            shell=True,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        
        output = json.loads(result.stdout)
        user_info = output.get("result", {})
        
        return user_info.get("password", None)
        
    except Exception as e:
        return None


# Main execution
def main():
    print("Setting up test user...")
    print()
    
    # Get the default org
    target_org, org_id, instance_url = get_default_org()
    
    if not target_org:
        print("Error: Could not determine the default org.")
        return
    
    # Create or update the test user
    username, user_id, status = create_test_user(target_org)
    
    if not username:
        print("Failed to create/update test user.")
        return
    
    # Assign the Alex_Admin permission set
    success = assign_permset_to_user(username, PERMSET_NAME, target_org)
    
    # Generate password for the user (works for both new and existing users)
    print()
    password = generate_password(username, target_org)
    
    # If password generation failed, try to retrieve existing password
    if not password:
        password = display_user_info(username, target_org)
    
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
        
        # Use the base instance URL
        login_url = instance_url if instance_url else "https://login.salesforce.com"
        
        print()
        print("=" * 80)
        print("✓ TEST USER CONFIGURED SUCCESSFULLY")
        print("=" * 80)
        print(f"Username: {username}")
        print(f"Email:    {TEST_EMAIL}")
        print(f"User ID:  {user_id}")
        print(f"Permission Set: {PERMSET_NAME} {'✓ ASSIGNED' if assignments else '✗ NOT ASSIGNED'}")
        
        if password:
            print()
            print(f"Password: {password}")
            print()
            print(f"Login URL: {login_url}")
            print()
            print("⚠️  IMPORTANT: Save this password securely!")
            print("   This password is only shown once at generation time.")
        else:
            print()
            print("Note: Password not available (only works for scratch org users)")
            print("For non-scratch orgs, reset password in Setup > Users")
            print(f"Password reset email will be sent to {TEST_EMAIL}")
            print()
            print(f"Login URL: {login_url}")
        
        print("=" * 80)
        
    except Exception as e:
        print(f"Error verifying permission set: {str(e)}")
        print()
        print(f"Username: {username}")
        print(f"User ID:  {user_id}")
        if password:
            print(f"Password: {password}")
        if instance_url:
            print(f"Login URL: {instance_url}")


if __name__ == "__main__":
    main()
