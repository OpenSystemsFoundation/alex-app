import subprocess
import json
import os
from .selector import Selector
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class Utils:
    @staticmethod
    def run_sf_command(command):
        """Run a Salesforce CLI (sf) command and return the output."""
        print(f"Executing command: {command}")
        try:
            result = subprocess.run(
                command, capture_output=True, text=True, check=True, shell=True
            )
            if "DEP0040" in result.stderr:
                print("Deprecation warning ignored: ", result.stderr)
            print("Command executed successfully.")
            return result.stdout.strip()
        except subprocess.CalledProcessError as e:
            print(f"Error running command: {command}\n{e.output}")
            raise

    @staticmethod
    def get_default_org_username():
        """Get the default Salesforce org username."""
        print("Fetching default Salesforce org username.")
        try:
            username = SalesforceSelector.get_default_org_username()
            if "DEP0040" in username:
                print("Deprecation warning ignored: ", username)
            print(f"Default org username retrieved: {username}")
            return username
        except subprocess.CalledProcessError as e:
            print(f"Error getting default org: {e.output}")
            raise

    @staticmethod
    def get_base_url():
        """Retrieve the base URL for the Salesforce instance."""
        print("Fetching base URL for the Salesforce instance.")
        try:
            base_url = SalesforceSelector.get_base_url()
            if "DEP0040" in base_url:
                print("Deprecation warning ignored: ", base_url)
            print(f"Base URL retrieved: {base_url}")
            return base_url
        except subprocess.CalledProcessError as e:
            print(f"Error getting base URL: {e.output}")
            raise

    @staticmethod
    def open_org(board_id=None):
        """Open the default Salesforce org in a web browser and return the board URL if provided."""
        print("Fetching the default Salesforce org login URL.")
        username = Utils.get_default_org_username()
        command = f"sf org open --target-org {
            username} --url-only --path lightning"
        login_url = Utils.run_sf_command(command)
        print(f"Login URL: {login_url}")

        if "DEP0040" in login_url:
            print("Deprecation warning ignored: ", login_url)

        if board_id:
            base_url = Utils.get_base_url()
            board_url = f"{
                base_url}/lightning/r/OpenSF__Board__c/{board_id}/view"
            print(f"Board URL: {board_url}")

            if "DEP0040" in board_url:
                print("Deprecation warning ignored: ", board_url)

            return login_url, board_url

        return login_url

    @staticmethod
    def setup_test_data(apex_script_path):
        """Set up test data using an Apex script."""
        print(f"Setting up test data using Apex script: {apex_script_path}")
        username = Utils.get_default_org_username()
        command = f"sf apex run --target-org {
            username} --apex-code-file {apex_script_path}"
        result = Utils.run_sf_command(command)
        if "DEP0040" in result.stderr:
            print("Deprecation warning ignored: ", result.stderr)
        print(f"Test data setup completed using script: {apex_script_path}")

    @staticmethod
    def assign_permission_set(permission_set_name, confirm=False):
        """Assign a permission set to the default user, with optional confirmation."""
        print(
            f"Assigning permission set '{
              permission_set_name}' to the default user."
        )
        username = Utils.get_default_org_username()

        # Check if the user already has the permission set
        check_command = (
            f"SELECT Assignee.Username FROM PermissionSetAssignment "
            f"WHERE PermissionSet.Name = '{
                permission_set_name}' AND Assignee.Username = '{username}'"
        )
        output = SalesforceSelector.query_salesforce(check_command)
        records = output.get("result", {}).get("records", [])

        if "DEP0040" in output:
            print("Deprecation warning ignored: ", output)

        if records:
            print(
                f"User '{username}' already has permission set '{
                  permission_set_name}'."
            )
            return

        command = f"sf org assign permset --name {
            permission_set_name} --target-org {username}"
        result = Utils.run_sf_command(command)
        if "DEP0040" in result.stderr:
            print("Deprecation warning ignored: ", result.stderr)
        print(
            f"Assigned permission set '{
              permission_set_name}' to user: {username}"
        )

        if confirm:
            print("Confirming the permission set assignment.")
            command_confirm = (
                f"SELECT Assignee.Username, PermissionSet.Name FROM PermissionSetAssignment "
                f"WHERE PermissionSet.Name = '{permission_set_name}'"
            )
            output = SalesforceSelector.query_salesforce(command_confirm)
            records = output.get("result", {}).get("records", [])

            if "DEP0040" in output:
                print("Deprecation warning ignored: ", output)

            if records:
                for record in records:
                    assigned_username = record["Assignee"]["Username"]
                    print(
                        f"Permission set '{permission_set_name}' successfully assigned to user '{
                          assigned_username}'."
                    )
            else:
                print(
                    f"No users found with the permission set '{
                      permission_set_name}' assigned in org '{username}'."
                )

    @staticmethod
    def assign_permset_with_confirmation(permission_set_name):
        """Assign a permission set to the default user and confirm the assignment."""
        print(
            f"Assigning permission set '{
              permission_set_name}' with confirmation."
        )
        Utils.assign_permission_set(permission_set_name, confirm=True)

    @staticmethod
    def confirm_login(driver, timeout=30):
        """Confirm login by checking the presence of a specific element on the page."""
        print("Confirming login.")
        try:
            WebDriverWait(driver, timeout).until(
                EC.presence_of_element_located(
                    (By.CSS_SELECTOR, "div.specific-element")
                )
            )
            print("Login confirmed.")
        except TimeoutException:
            print("Login confirmation failed.")
            raise

    @staticmethod
    def login_to_scratch_org(driver):
        """Log in to the Salesforce scratch org using the access token."""
        print("Logging in to the Salesforce scratch org.")
        access_token = Utils.get_access_token()
        instance_url = Utils.get_instance_url()
        frontdoor_url = f"{
            instance_url}/secur/frontdoor.jsp?sid={access_token}"
        driver.get(frontdoor_url)
        if "DEP0040" in frontdoor_url:
            print("Deprecation warning ignored: ", frontdoor_url)
        Utils.confirm_login(driver)
        print("Logged in to the Salesforce scratch org.")

    @staticmethod
    def get_access_token():
        """Get the access token for the Salesforce org."""
        try:
            result = subprocess.run(
                ["sf", "org", "display", "--json"],
                capture_output=True,
                text=True,
                shell=True,
            )
            org_info = json.loads(result.stdout)
            if "DEP0040" in result.stderr:
                print("Deprecation warning ignored: ", result.stderr)
            return org_info["result"]["accessToken"]
        except Exception as e:
            raise Exception(
                f"Failed to get access token: {
                            e}, Output: {result.stderr}"
            )

    @staticmethod
    def get_instance_url():
        """Get the instance URL for the Salesforce org."""
        try:
            result = subprocess.run(
                ["sf", "org", "display", "--json"],
                capture_output=True,
                text=True,
                shell=True,
            )
            org_info = json.loads(result.stdout)
            if "DEP0040" in result.stderr:
                print("Deprecation warning ignored: ", result.stderr)
            return org_info["result"]["instanceUrl"]
        except Exception as e:
            raise Exception(
                f"Failed to get instance URL: {
                            e}, Output: {result.stderr}"
            )


def take_screenshot(driver, name):
    # Take a screenshot and save it in the tests/images folder
    screenshots_dir = os.path.join(os.path.dirname(__file__), "..", "images")
    os.makedirs(screenshots_dir, exist_ok=True)
    screenshot_path = os.path.join(screenshots_dir, f"{name}.png")
    driver.save_screenshot(screenshot_path)
