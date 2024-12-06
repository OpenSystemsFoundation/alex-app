import pytest
from playwright.sync_api import sync_playwright, Page, expect
from tests.utils.salesforce import Salesforce
from tests.utils.selector import Selector
from tests.utils.data_factory import DataFactory
import os


def pytest_configure(config):
    config.pluginmanager.register(MyPlugin())


class MyPlugin:
    def pytest_runtest_setup(self, item):
        print(f"Starting test: {item.name}")

    def pytest_runtest_teardown(self, item):
        print(f"Finished test: {item.name}")


# @pytest.fixture(scope="module", params=["chromium", "firefox", "webkit"])
@pytest.fixture(scope="module", params=["chromium"])
def browser(request):
    print(f"Setting up the Playwright browser: {request.param}.")
    with sync_playwright() as playwright:
        browser = getattr(playwright, request.param).launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        yield page
        print(f"Closing the Playwright browser: {request.param}.")
        context.close()
        browser.close()


def test_login_and_create_board(browser: Page):
    DataFactory.delete_cards()

    # Log in to Salesforce Scratch Org
    print("Starting test: login to scratch org.")
    access_token = Salesforce.get_access_token()
    instance_url = Salesforce.get_instance_url()
    board_id = "a00JW00000KzFBYYA3"
    print(f"Board ID: {board_id}")
    board_url = f"{instance_url}/{board_id}"

    frontdoor_url = f"{instance_url}/secur/frontdoor.jsp?sid={access_token}"
    print(f"Opening frontdoor URL: {frontdoor_url}")
    browser.goto(frontdoor_url)

    try:
        # Wait for successful login
        browser.wait_for_selector("#setupComponent", timeout=10000)
        print("Successfully logged in to the scratch org.")
        try:
            browser.goto(board_url)
            print("Board record loaded successfully.")
        except Exception as e:
            print(f"Failed to load board record: {e}")
            pytest.fail(f"Failed to load board record: {e}")

        # Validating the board and columns
        try:
            expect(browser.get_by_role("link", name="Backlog")).to_be_visible()
            expect(browser.get_by_role("link", name="To Do")).to_be_visible()
            expect(browser.get_by_role("link", name="Doing")).to_be_visible()
            expect(browser.get_by_role("link", name="Done")).to_be_visible()
        except Exception as e:
            print(f"Failed to validate board columns: {e}")
            pytest.fail(f"Failed to validate board columns: {e}")

        # Adding and validating cards
        try:
            browser.get_by_role("button", name="Add New Card").first.click()
            expect(
                browser.get_by_role("paragraph").get_by_text("Backlog")
            ).to_be_visible()
        except Exception as e:
            print(f"Failed to add or validate card in Backlog: {e}")
            pytest.fail(f"Failed to add or validate card in Backlog: {e}")

        try:
            browser.get_by_role("button", name="Add New Card").nth(1).click()
            expect(
                browser.locator("p").filter(has_text="To Do").locator("span")
            ).to_be_visible()
        except Exception as e:
            print(f"Failed to add or validate card in To Do: {e}")
            pytest.fail(f"Failed to add or validate card in To Do: {e}")

        try:
            browser.get_by_role("button", name="Add New Card").nth(2).click()
            expect(browser.get_by_text("In Progress")).to_be_visible()
        except Exception as e:
            print(f"Failed to add or validate card in In Progress: {e}")
            pytest.fail(f"Failed to add or validate card in In Progress: {e}")

        try:
            browser.get_by_role("button", name="Add New Card").nth(3).click()
            expect(
                browser.locator("p").filter(has_text="Done").locator("span")
            ).to_be_visible()
        except Exception as e:
            print(f"Failed to add or validate card in Done: {e}")
            pytest.fail(f"Failed to add or validate card in Done: {e}")

        print("Test completed successfully.")

    except Exception as e:
        print(f"Exception occurred: {e}")
        print(f"Browser current URL: {browser.url}")
        pytest.fail(f"Failed to execute test: {e}")
