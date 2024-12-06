
Feature: Real-Time Updates and Hyperlinks

  @realtime @platform-events
  Scenario: Real-time updates with two open windows of the same board using Platform Events
    Given I have two open windows displaying the same board
    When I perform an action (move/create) on one board
    Then the other board should receive a real-time update reflecting the changes

  @hyperlink
  Scenario: Confirming hyperlinks open record pages
    Given I see a column or card with a hyperlink
    When I click the hyperlink
    Then the respective record page should open