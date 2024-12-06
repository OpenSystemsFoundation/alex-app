from selenium import webdriver


def setup_browser(headless=True):
    """Initialize the Selenium WebDriver."""
    options = webdriver.ChromeOptions()
    if headless:
        options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    driver = webdriver.Chrome(options=options)
    return driver


def teardown_browser(driver):
    """Quit the Selenium WebDriver."""
    driver.quit()
