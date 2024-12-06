Feature: Kanban Board Task Management

  # Section: Board Page Behavior
  @board @create
  Scenario: Opening a `Board__c` page without created child columns displays a message that there are no columns
    Given I am on a `Board__c` page
    And there are no child columns created
    When I access the board page
    Then the no columns message should be shown

  @board
  Scenario: Displaying a board page with created columns but no cards
    Given I am on a `Board__c` page
    And there are columns created but no cards
    When I view the board page
    Then I should see the columns displayed with no cards
