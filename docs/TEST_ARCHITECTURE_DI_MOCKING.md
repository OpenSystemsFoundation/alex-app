# Test Architecture - Dependency Injection & Mocking (Future Implementation)

## Overview

This document outlines a comprehensive approach to implement dependency injection and mocking for true unit tests. This is a **long-term optimization** to implement when the test suite grows beyond 100 tests.

---

## Current Architecture (Integration Tests)

```
┌─────────────────────────────────────────────┐
│           KanbanBoardController             │
│                                             │
│  - Directly calls KanbanBoardSelector      │
│  - Directly creates DTOs                    │
│  - Tightly coupled to database             │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│         KanbanBoardSelector                 │
│                                             │
│  - Executes SOQL queries                   │
│  - Returns SObjects                         │
│  - Tightly coupled to database             │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│            Salesforce Database              │
│                                             │
│  - Real DML operations                      │
│  - Triggers fire                            │
│  - SLOW in tests (200ms+ per operation)    │
└─────────────────────────────────────────────┘
```

**Problem:** Every test requires database operations, making tests slow.

---

## Future Architecture (Unit Tests with Mocking)

```
┌─────────────────────────────────────────────┐
│           KanbanBoardController             │
│                                             │
│  - Receives ISelectorService via DI        │
│  - Uses injected dependency                │
│  - Can use real OR mock implementation     │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│           ISelectorService                  │ ← Interface
│                                             │
│  + getBoardById(Id)                        │
│  + getColumnsByBoardId(Id)                 │
│  + getCardsByBoardId(Id)                   │
└─────────────────────────────────────────────┘
         ↓                           ↓
┌──────────────────────┐    ┌──────────────────────┐
│  KanbanBoardSelector │    │  MockSelectorService │
│  (Real Implementation)│    │  (Test Implementation)│
│                      │    │                      │
│  - Real SOQL queries │    │  - Returns test data │
│  - Real DML          │    │  - No database calls │
│  - SLOW (200ms+)     │    │  - FAST (<5ms)       │
└──────────────────────┘    └──────────────────────┘
```

**Benefit:** Tests can use MockSelectorService for 10-100x faster execution.

---

## Implementation Steps

### Phase 1: Create Interfaces

#### 1.1 ISelectorService Interface
```apex
/**
 * @description Service interface for data access operations
 * Allows for mocking in unit tests and separation of concerns
 */
public interface ISelectorService {
    OpenSF__Board__c getBoardById(Id boardId);
    List<OpenSF__Column__c> getColumnsByBoardId(Id boardId);
    List<OpenSF__Card__c> getCardsByBoardId(Id boardId);
    OpenSF__Card__c getCardById(Id cardId);
    List<OpenSF__Card__c> getCardsByColumnId(Id columnId);
    List<OpenSF__Card__c> getCardsByIds(Set<Id> cardIds);
    List<User> searchUsers(String searchTerm);
}
```

#### 1.2 IDataService Interface
```apex
/**
 * @description Service interface for DML operations
 * Allows for mocking database operations in unit tests
 */
public interface IDataService {
    void insertRecords(List<SObject> records);
    void updateRecords(List<SObject> records);
    void deleteRecords(List<SObject> records);
    void upsertRecords(List<SObject> records);
}
```

### Phase 2: Refactor Existing Classes

#### 2.1 KanbanBoardSelector implements ISelectorService
```apex
public class KanbanBoardSelector implements ISelectorService {
    
    // Existing methods now satisfy interface contract
    public OpenSF__Board__c getBoardById(Id boardId) {
        return [SELECT Id, Name, OpenSF__Description__c, ...
                FROM OpenSF__Board__c WHERE Id = :boardId LIMIT 1];
    }
    
    public List<OpenSF__Column__c> getColumnsByBoardId(Id boardId) {
        return [SELECT Id, Name, OpenSF__ColumnHeader__c, ...
                FROM OpenSF__Column__c WHERE OpenSF__Board__c = :boardId 
                ORDER BY OpenSF__Position__c];
    }
    
    // ... other methods
}
```

#### 2.2 DataService implements IDataService
```apex
public class DataService implements IDataService {
    
    public void insertRecords(List<SObject> records) {
        insert records;
    }
    
    public void updateRecords(List<SObject> records) {
        update records;
    }
    
    public void deleteRecords(List<SObject> records) {
        delete records;
    }
    
    public void upsertRecords(List<SObject> records) {
        upsert records;
    }
}
```

### Phase 3: Implement Dependency Injection

#### 3.1 Service Locator Pattern
```apex
/**
 * @description Service locator for dependency injection
 * Provides access to service implementations (real or mock)
 */
public class ServiceLocator {
    
    private static ISelectorService selectorService;
    private static IDataService dataService;
    
    // Get selector service (real or mock)
    public static ISelectorService getSelectorService() {
        if (selectorService == null) {
            if (Test.isRunningTest() && MockServices.useMockSelector) {
                selectorService = new MockSelectorService();
            } else {
                selectorService = new KanbanBoardSelector();
            }
        }
        return selectorService;
    }
    
    // Get data service (real or mock)
    public static IDataService getDataService() {
        if (dataService == null) {
            if (Test.isRunningTest() && MockServices.useMockData) {
                dataService = new MockDataService();
            } else {
                dataService = new DataService();
            }
        }
        return dataService;
    }
    
    // Allow manual injection (useful for testing)
    public static void setSelectorService(ISelectorService service) {
        selectorService = service;
    }
    
    public static void setDataService(IDataService service) {
        dataService = service;
    }
    
    // Reset services (call in test teardown)
    @TestVisible
    private static void reset() {
        selectorService = null;
        dataService = null;
    }
}
```

#### 3.2 Refactor Controller to Use DI
```apex
public with sharing class KanbanBoardController {
    
    // Use service locator to get dependencies
    private static ISelectorService selectorService = ServiceLocator.getSelectorService();
    private static IDataService dataService = ServiceLocator.getDataService();
    
    @AuraEnabled
    public static BoardData getBoardData(Id boardId) {
        try {
            // Now uses injected service instead of direct call
            OpenSF__Board__c board = selectorService.getBoardById(boardId);
            List<OpenSF__Column__c> columns = selectorService.getColumnsByBoardId(boardId);
            List<OpenSF__Card__c> cards = selectorService.getCardsByBoardId(boardId);
            
            BoardData result = new BoardData();
            result.board = new KanbanBoardDTO.BoardDTO(board);
            result.columns = KanbanBoardDTO.convertColumns(columns);
            result.cards = KanbanBoardDTO.convertCards(cards);
            
            return result;
            
        } catch (Exception e) {
            throw new AuraHandledException('Error loading board: ' + e.getMessage());
        }
    }
    
    @AuraEnabled
    public static CardMoveResult moveCard(Id cardId, Id targetColumnId, 
                                         String previousCardPosition, String nextCardPosition) {
        try {
            String newPosition = LexoRank.between(previousCardPosition, nextCardPosition);
            
            OpenSF__Card__c card = new OpenSF__Card__c(
                Id = cardId,
                OpenSF__Column__c = targetColumnId,
                OpenSF__Position__c = newPosition
            );
            
            // Use injected data service
            dataService.updateRecords(new List<SObject>{ card });
            
            CardMoveResult result = new CardMoveResult();
            result.success = true;
            result.newPosition = newPosition;
            result.columnId = targetColumnId;
            
            return result;
            
        } catch (Exception e) {
            throw new AuraHandledException('Error moving card: ' + e.getMessage());
        }
    }
}
```

### Phase 4: Create Mock Implementations

#### 4.1 MockSelectorService
```apex
@isTest
public class MockSelectorService implements ISelectorService {
    
    // Test data storage
    public Map<Id, OpenSF__Board__c> boards = new Map<Id, OpenSF__Board__c>();
    public Map<Id, List<OpenSF__Column__c>> columnsByBoard = new Map<Id, List<OpenSF__Column__c>>();
    public Map<Id, List<OpenSF__Card__c>> cardsByBoard = new Map<Id, List<OpenSF__Card__c>>();
    public Map<Id, OpenSF__Card__c> cards = new Map<Id, OpenSF__Card__c>();
    
    // Track method calls for verification
    public Integer getBoardByIdCallCount = 0;
    public Integer getColumnsByBoardIdCallCount = 0;
    
    public OpenSF__Board__c getBoardById(Id boardId) {
        getBoardByIdCallCount++;
        return boards.get(boardId);
    }
    
    public List<OpenSF__Column__c> getColumnsByBoardId(Id boardId) {
        getColumnsByBoardIdCallCount++;
        List<OpenSF__Column__c> columns = columnsByBoard.get(boardId);
        return columns != null ? columns : new List<OpenSF__Column__c>();
    }
    
    public List<OpenSF__Card__c> getCardsByBoardId(Id boardId) {
        List<OpenSF__Card__c> cards = cardsByBoard.get(boardId);
        return cards != null ? cards : new List<OpenSF__Card__c>();
    }
    
    public OpenSF__Card__c getCardById(Id cardId) {
        return cards.get(cardId);
    }
    
    public List<OpenSF__Card__c> getCardsByColumnId(Id columnId) {
        // Simple implementation - filter cardsByBoard
        List<OpenSF__Card__c> result = new List<OpenSF__Card__c>();
        for (List<OpenSF__Card__c> cardList : cardsByBoard.values()) {
            for (OpenSF__Card__c card : cardList) {
                if (card.OpenSF__Column__c == columnId) {
                    result.add(card);
                }
            }
        }
        return result;
    }
    
    public List<OpenSF__Card__c> getCardsByIds(Set<Id> cardIds) {
        List<OpenSF__Card__c> result = new List<OpenSF__Card__c>();
        for (Id cardId : cardIds) {
            if (cards.containsKey(cardId)) {
                result.add(cards.get(cardId));
            }
        }
        return result;
    }
    
    public List<User> searchUsers(String searchTerm) {
        return new List<User>{ new User(
            Id = UserInfo.getUserId(),
            Name = 'Test User',
            Email = 'test@example.com'
        )};
    }
    
    // Helper methods for test setup
    public void addBoard(OpenSF__Board__c board) {
        boards.put(board.Id, board);
    }
    
    public void addColumns(Id boardId, List<OpenSF__Column__c> columns) {
        columnsByBoard.put(boardId, columns);
    }
    
    public void addCards(Id boardId, List<OpenSF__Card__c> cards) {
        cardsByBoard.put(boardId, cards);
        for (OpenSF__Card__c card : cards) {
            this.cards.put(card.Id, card);
        }
    }
}
```

#### 4.2 MockDataService
```apex
@isTest
public class MockDataService implements IDataService {
    
    // Track operations for verification
    public List<SObject> insertedRecords = new List<SObject>();
    public List<SObject> updatedRecords = new List<SObject>();
    public List<SObject> deletedRecords = new List<SObject>();
    
    public Integer insertCallCount = 0;
    public Integer updateCallCount = 0;
    public Integer deleteCallCount = 0;
    
    public void insertRecords(List<SObject> records) {
        insertCallCount++;
        insertedRecords.addAll(records);
        
        // Simulate ID generation
        for (SObject record : records) {
            if (record.Id == null) {
                record.Id = generateMockId(record.getSObjectType());
            }
        }
    }
    
    public void updateRecords(List<SObject> records) {
        updateCallCount++;
        updatedRecords.addAll(records);
    }
    
    public void deleteRecords(List<SObject> records) {
        deleteCallCount++;
        deletedRecords.addAll(records);
    }
    
    public void upsertRecords(List<SObject> records) {
        for (SObject record : records) {
            if (record.Id == null) {
                insertRecords(new List<SObject>{ record });
            } else {
                updateRecords(new List<SObject>{ record });
            }
        }
    }
    
    // Helper to generate mock IDs
    private Id generateMockId(Schema.SObjectType sObjectType) {
        String keyPrefix = sObjectType.getDescribe().getKeyPrefix();
        String randomId = keyPrefix + '0'.repeat(15 - keyPrefix.length()) + 
                         String.valueOf(Math.random()).substring(2, 5);
        return (Id)randomId;
    }
}
```

### Phase 5: Write Fast Unit Tests

#### 5.1 Unit Test with Mocks (FAST)
```apex
@isTest
static void testGetBoardData_UnitTest() {
    // Setup mock data - NO DATABASE OPERATIONS
    Id boardId = TestUtils.generateMockId(OpenSF__Board__c.SObjectType);
    Id columnId = TestUtils.generateMockId(OpenSF__Column__c.SObjectType);
    Id cardId = TestUtils.generateMockId(OpenSF__Card__c.SObjectType);
    
    OpenSF__Board__c mockBoard = new OpenSF__Board__c(
        Id = boardId,
        Name = 'Test Board'
    );
    
    OpenSF__Column__c mockColumn = new OpenSF__Column__c(
        Id = columnId,
        OpenSF__Board__c = boardId,
        OpenSF__ColumnHeader__c = 'To Do'
    );
    
    OpenSF__Card__c mockCard = new OpenSF__Card__c(
        Id = cardId,
        OpenSF__Column__c = columnId,
        OpenSF__Subject__c = 'Test Card'
    );
    
    // Configure mock service
    MockSelectorService mockSelector = new MockSelectorService();
    mockSelector.addBoard(mockBoard);
    mockSelector.addColumns(boardId, new List<OpenSF__Column__c>{ mockColumn });
    mockSelector.addCards(boardId, new List<OpenSF__Card__c>{ mockCard });
    
    // Inject mock into service locator
    ServiceLocator.setSelectorService(mockSelector);
    
    // Execute test - NO DATABASE CALLS
    Test.startTest();
    KanbanBoardController.BoardData result = KanbanBoardController.getBoardData(boardId);
    Test.stopTest();
    
    // Verify behavior - NO QUERIES
    System.assertNotEquals(null, result, 'Result should not be null');
    System.assertEquals(1, mockSelector.getBoardByIdCallCount, 'Should call getBoardById once');
    System.assertEquals(1, mockSelector.getColumnsByBoardIdCallCount, 'Should call getColumnsByBoardId once');
    System.assertEquals('Test Board', result.board.name, 'Board name should match');
}
```

**Performance: ~2-5ms (100x faster than integration test!)**

#### 5.2 Integration Test (SLOW but comprehensive)
```apex
@isTest
static void testGetBoardData_IntegrationTest() {
    // Use real database - comprehensive test
    OpenSF__Board__c board = TestFactory.createBoard('Test Board');
    OpenSF__Column__c column = TestFactory.createColumn(board.Id, 'To Do');
    OpenSF__Card__c card = TestFactory.createCard(column.Id, 'Test Card');
    
    // Use real service (default)
    ServiceLocator.reset();
    
    Test.startTest();
    KanbanBoardController.BoardData result = KanbanBoardController.getBoardData(board.Id);
    Test.stopTest();
    
    System.assertNotEquals(null, result, 'Result should not be null');
    System.assertEquals('Test Board', result.board.name, 'Board name should match');
    System.assertEquals(1, result.columns.size(), 'Should have 1 column');
    System.assertEquals(1, result.cards.size(), 'Should have 1 card');
}
```

**Performance: ~100-200ms (comprehensive, tests everything)**

---

## When to Use Each Test Type

### Unit Tests (Mocked) - Fast
✅ Business logic validation
✅ Error handling
✅ Edge cases
✅ Rapid feedback during development
❌ Database constraints
❌ Trigger behavior
❌ Complex SOQL queries

### Integration Tests (Real DB) - Comprehensive
✅ End-to-end workflows
✅ Trigger behavior
✅ Data integrity
✅ Complex relationships
❌ Rapid feedback
❌ Isolation of failures

### Recommended Split
- 70% Unit Tests (mocked) - Fast feedback
- 30% Integration Tests (real DB) - Comprehensive coverage

---

## ROI Analysis

### Current: All Integration Tests
- 67 tests × 169ms avg = 11.3 seconds
- 100% database operations
- Good coverage, slower feedback

### Future: Mixed Approach
- 47 unit tests × 5ms = 235ms
- 20 integration tests × 200ms = 4 seconds
- **Total: 4.2 seconds (63% faster!)**

### Development Cycle Impact
- Current: 11s per test run
- Future: 4s per test run
- **7 seconds saved per cycle**

Over 100 test runs per day:
- **700 seconds (12 minutes) saved per developer per day**
- **1 hour saved per week per developer**

---

## Implementation Checklist

### Phase 1: Foundation (2-4 hours)
- [ ] Create ISelectorService interface
- [ ] Create IDataService interface
- [ ] Create ServiceLocator class
- [ ] Update KanbanBoardSelector to implement interface
- [ ] Create DataService class

### Phase 2: Refactoring (4-6 hours)
- [ ] Refactor KanbanBoardController to use DI
- [ ] Refactor trigger handlers to use DI (if needed)
- [ ] Update integration tests to use ServiceLocator.reset()
- [ ] Verify all existing tests still pass

### Phase 3: Mocking (4-8 hours)
- [ ] Create MockSelectorService
- [ ] Create MockDataService
- [ ] Create TestUtils helper class
- [ ] Write 10-20 unit tests using mocks
- [ ] Measure performance improvement

### Phase 4: Conversion (8-16 hours)
- [ ] Convert 70% of tests to unit tests
- [ ] Keep 30% as integration tests
- [ ] Document test strategy
- [ ] Update team guidelines

**Total Effort: 18-34 hours (2-4 days)**

**Benefit: 63% faster test execution + better test isolation**

---

## Conclusion

This architecture enables:
1. **Fast unit tests** (2-5ms per test)
2. **Comprehensive integration tests** (200ms per test)
3. **Better separation of concerns**
4. **Easier testing of edge cases**
5. **Improved development velocity**

**Recommendation:** Implement when test suite exceeds 100 tests or when test execution time becomes a bottleneck (>30 seconds total).
