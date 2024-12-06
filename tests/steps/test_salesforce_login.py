import pytest
from playwright.sync_api import sync_playwright
from tests.utils.salesforce import Salesforce


def pytest_configure(config):
    config.pluginmanager.register(MyPlugin())


class MyPlugin:
    def pytest_runtest_setup(self, item):
        print(f"Starting test: {item.name}")

    def pytest_runtest_teardown(self, item):
        print(f"Finished test: {item.name}")


@pytest.fixture(scope="module")
def browser():
    print("Setting up the Playwright browser.")
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=False)  # Not headless
        context = browser.new_context()
        page = context.new_page()
        yield page
        print("Closing the Playwright browser.")
        context.close()
        browser.close()


def test_login_to_scratch_org(browser):
    print("Starting test: login to scratch org.")
    access_token = Salesforce.get_access_token()
    instance_url = Salesforce.get_instance_url()

    frontdoor_url = f"{instance_url}/secur/frontdoor.jsp?sid={access_token}"
    print(f"Opening frontdoor URL: {frontdoor_url}")
    browser.goto(frontdoor_url)

    try:
        # Wait for the setup component or another indication of successful login
        browser.wait_for_selector("#setupComponent", timeout=10000)
        print("Successfully logged in to the scratch org.")
        assert True, "Successfully logged in to Salesforce."

    except Exception as e:
        print(f"Exception occurred: {e}")
        print(f"Browser current URL: {browser.url}")
        pytest.fail(
            f"Failed to log in: {e}")
