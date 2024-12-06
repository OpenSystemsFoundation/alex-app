import subprocess
import json

# Define the permission set name
permset_name = "Alex_Admin"


# Function to get the default org username
def get_default_org():
    try:
        # Run the Salesforce CLI command to get the default org
        command = "sf org display --json"
        result = subprocess.run(
            command,
            shell=True,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        # Parse the JSON output
        output = json.loads(result.stdout)
        username = output.get("result", {}).get("username", None)
        if username:
            return username
        else:
            raise ValueError("Default org username not found.")
    except subprocess.CalledProcessError as e:
        print(f"Error getting default org: {e.stderr.decode()}")
        return None


# Function to run the Salesforce CLI command
def assign_permset(org_username):
    try:
        # Construct the Salesforce CLI command to assign the permission set
        command_assign = (
            f"sf org assign permset --name {permset_name} --target-org {org_username}"
        )

        # Execute the assign command
        subprocess.run(
            command_assign,
            shell=True,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        # Construct the Salesforce CLI command to confirm the permission set assignment
        command_confirm = f"sf data query --query \"SELECT Assignee.Username, PermissionSet.Name FROM PermissionSetAssignment WHERE PermissionSet.Name = '{permset_name}'\" --target-org {org_username} --json"

        # Execute the confirm command
        result = subprocess.run(
            command_confirm,
            shell=True,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        # Parse the output to get the confirmation
        output = json.loads(result.stdout)
        records = output.get("result", {}).get("records", [])

        if records:
            for record in records:
                username = record["Assignee"]["Username"]
                print(
                    f"Permission set '{permset_name}' successfully assigned to user '{username}'."
                )
        else:
            print(
                f"No users found with the permission set '{permset_name}' assigned in org '{org_username}'."
            )

    except subprocess.CalledProcessError as e:
        print(
            f"Failed to assign permission set '{permset_name}' to org '{org_username}'. Error: {e.stderr.decode()}"
        )


# Get the default org username
default_org_username = get_default_org()

if default_org_username:
    # Assign to the default org
    assign_permset(default_org_username)
