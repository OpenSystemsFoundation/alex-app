import subprocess
import json


class Salesforce:
    @staticmethod
    def get_access_token():
        try:
            print("Attempting to get access token.")
            result = subprocess.run(
                ["sf", "org", "display", "--json"],
                capture_output=True,
                text=True,
            )
            if not result.stdout:
                raise Exception("No output from Salesforce CLI command")
            if "DEP0040" in result.stderr:
                print("Deprecation warning ignored: ", result.stderr)
            org_info = json.loads(result.stdout)
            print("Access token retrieved successfully.")
            return org_info["result"]["accessToken"]
        except Exception as e:
            print(f"Failed to get access token: {e}, Output: {result.stderr}")
            raise Exception(
                f"Failed to get access token: {
                            e}, Output: {result.stderr}"
            )

    @staticmethod
    def get_instance_url():
        try:
            print("Attempting to get instance URL.")
            result = subprocess.run(
                ["sf", "org", "display", "--json"],
                capture_output=True,
                text=True,
            )
            if not result.stdout:
                raise Exception("No output from Salesforce CLI command")
            if "DEP0040" in result.stderr:
                print("Deprecation warning ignored: ", result.stderr)
            org_info = json.loads(result.stdout)
            print("Instance URL retrieved successfully.")
            return org_info["result"]["instanceUrl"]
        except Exception as e:
            print(f"Failed to get instance URL: {e}, Output: {result.stderr}")
            raise Exception(
                f"Failed to get instance URL: {
                            e}, Output: {result.stderr}"
            )

    @staticmethod
    def execute_sf_command(command):
        print(f"Executing Salesforce CLI command: {command}")
        try:
            result = subprocess.run(command.split(), capture_output=True, text=True)
            if result.returncode != 0:
                print(f"Command Failed: {command}")
                print(f"Error: {result.stderr}")
                raise Exception(f"Command failed: {result.stderr}")
            if not result.stdout:
                raise Exception("No output from Salesforce CLI command")
            if "DEP0040" in result.stderr:
                print("Deprecation warning ignored: ", result.stderr)
            print(f"Command executed successfully: {command}")
            return json.loads(result.stdout)
        except json.JSONDecodeError as e:
            print(f"JSON Decode Error: {e}")
            print(f"Output was: {result.stdout}")
            raise Exception(f"JSON Decode Error: {e}")

    @staticmethod
    def query_salesforce(query):
        print(f"Executing Salesforce query: {query}")
        try:
            command = f'sf data query --query "{query}" --json'
            result = subprocess.run(command, capture_output=True, text=True, shell=True)
            if result.returncode != 0:
                print(f"Query Failed: {query}")
                print(f"Error: {result.stderr}")
                raise Exception(f"Query failed: {result.stderr}")
            if not result.stdout:
                raise Exception("No output from Salesforce CLI command")
            if "DEP0040" in result.stderr:
                print("Deprecation warning ignored: ", result.stderr)
            print(f"Query executed successfully: {query}")
            return json.loads(result.stdout)
        except json.JSONDecodeError as e:
            print(f"JSON Decode Error: {e}")
            print(f"Output was: {result.stdout}")
            raise Exception(f"JSON Decode Error: {e}")
