
Feature: Card Creation and Editing

  @create
  Scenario: Creating a new card
    Given I am on the Kanban Board page
    When I click the "Add New Card" button in the "To Do" column
    Then a new card should be added to the "To Do" column

  @create
  Scenario: Creating another card
    Given I am on a `Board__c` page with existing columns
    When I create another card
    Then the new card should be added to the specified column

  @create
  Scenario: Creating a card on an empty board with columns
    Given I am on a `Board__c` page with empty columns
    When I create a new card
    Then the card should be added to a specified column

  @edit
  Scenario: Editing a card
    Given I am on the Kanban Board page
    And I see a card named "Test Card"
    When I click on the card
    Then the edit modal should open
    When I close the modal
    Then the edit modal should no longer be visible

  @edit
  Scenario: Opening a card modal
    Given I am on a `Board__c` page with existing cards
    When I click on a card
    Then a modal should open displaying the card details

  @edit @delete
  Scenario: Deleting a card through the modal
    Given I have a card modal open
    When I click the "Delete Card" button
    Then the card should be removed from the column
    And the modal should close

  @edit @update
  Scenario: Updating all fields in the card modal
    Given I have a card modal open
    When I update all fields and click "Save"
    Then the updated fields should be reflected on the card in the board column