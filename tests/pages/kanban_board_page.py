from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class KanbanBoardPage:
    def __init__(self, browser, instance_url, board_id):
        self.browser = browser
        self.instance_url = instance_url
        self.board_id = board_id
        self.board_url = f"{
            self.instance_url}/lightning/r/OpenSF__Board__c/{self.board_id}/view"

    def navigate_to_board(self):
        print(f"Navigating to board URL: {self.board_url}")
        self.browser.get(self.board_url)

    def is_board_page_loaded(self):
        try:
            WebDriverWait(self.browser, 10).until(
                EC.presence_of_element_located(
                    (By.XPATH, "//*[contains(text(), 'Selenium Test')]"))
            )
            return True
        except:
            return False
