
Feature: Card Movement Functionality

  @move @drag-drop
  Scenario: Moving a card from one column to another
    Given I am on the Kanban Board page
    And I see a card in the "To Do" column
    When I drag and drop the card to the "In Progress" column
    Then the card should appear in the "In Progress" column
    And the card should no longer be in the "To Do" column

  @move
  Scenario: Moving a card to the next column
    Given I see a card in a column
    When I drag and drop the card to the next column
    Then the card should appear in the next column
    And it should no longer be in the previous column

  @move @multiple-cards
  Scenario: Moving a new card to the same column as another card
    Given I have two cards in different columns
    When I move the new card to the same column as the existing card
    Then both cards should appear in the same column

  @move
  Scenario: Moving a card on top of another card
    Given I have two cards in the same column
    When I move one card on top of the other card
    Then the moved card should appear above the other card in the column

  @move @multiple-cards
  Scenario: Testing all directions of moving with three cards in the same column
    Given there are three cards in the same column
    When I move a card to any position (top, middle, bottom)
    Then the order of cards in the column should reflect the changes

  @move
  Scenario: Moving a new card to the top of the column
    Given I have a column with multiple cards
    When I move a new card to the top position
    Then the new card should be at the top of the column

  @move
  Scenario: Moving a new card to the bottom of the column
    Given I have a column with multiple cards
    When I move a new card to the bottom position
    Then the new card should be at the bottom of the column

  @move @rapid-update
  Scenario: Moving each card to the "Done" column in rapid succession
    Given I have multiple cards in different columns
    When I move each card to the "Done" column in rapid succession
    Then the cards states should be correctly updated
    And all cards should appear in the "Done" column