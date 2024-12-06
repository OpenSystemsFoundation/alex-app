
Feature: Salesforce Console App Behavior

  @console
  Scenario: Confirm URL behavior in the Salesforce Console App
    Given I am in the Salesforce Console App
    When I open a board
    Then the board should open in a new tab

  @console
  Scenario: Navigating between multiple boards in the console view
    Given I have multiple boards open in the console view
    When I navigate between board tabs
    Then the board data should be displayed correctly

  @console @update
  Scenario: Performing actions on a board in the console view
    Given I have a board open in the console view
    When I move or create a card
    Then the data should reflect the change
    And navigating back and forth should retain the updated data