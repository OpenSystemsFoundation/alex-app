import subprocess
import json
from .salesforce import Salesforce


class Selector:
    @staticmethod
    def query_salesforce(query):
        try:
            print(f"Executing Salesforce query: {query}")
            result = subprocess.run(
                ["sf", "data", "query", "--query", query, "--json"],
                capture_output=True,
                text=True,
                shell=True,
            )
            print(f"Command stdout: {result.stdout}")
            print(f"Command stderr: {result.stderr}")

            # Handle CLI errors
            if result.returncode != 0:
                raise Exception(f"Salesforce CLI error: {result.stderr.strip()}")

            # Parse the JSON response
            try:
                query_result = json.loads(result.stdout)
                return query_result
            except json.JSONDecodeError as json_error:
                print(f"Failed to decode JSON: {result.stdout.strip()}")
                raise Exception("Invalid JSON response") from json_error

        except Exception as e:
            print(f"Query execution failed: {e}")
            raise

    @staticmethod
    def get_board_id():
        query = "SELECT Id FROM OpenSF__Board__c WHERE Name = 'Playwright Test Board'"
        try:
            print(f"Querying for OpenSF__Board__c with name 'Playwright Test Board'.")
            result = Selector.query_salesforce(query)
            if result and "result" in result:
                records = result.get("result", {}).get("records", [])
                if records:
                    print("Board ID retrieved successfully.")
                    return records[0]["Id"]
                else:
                    raise Exception(
                        "No records found for OpenSF__Board__c with name 'Playwright Test Board'."
                    )
            else:
                raise Exception(
                    "Invalid query result: No 'result' key found in response."
                )
        except Exception as e:
            raise Exception(f"Failed to retrieve board ID: {e}") from e
