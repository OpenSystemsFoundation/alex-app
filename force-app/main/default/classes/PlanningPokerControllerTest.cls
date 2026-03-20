@IsTest
private class PlanningPokerControllerTest {
    @IsTest
    static void testCreateSession() {
        Test.startTest();
        PlanningPokerController.SessionDTO result = PlanningPokerController.createSession(
            'Test Session',
            'Fibonacci',
            'Everyone',
            true,
            true,
            'Test User',
            '🐶',
            'Voter'
        );
        Test.stopTest();

        System.assertNotEquals(null, result, 'Session should be created');
        System.assertNotEquals(null, result.id, 'Session should have an ID');
        System.assertEquals(
            'Voting',
            result.status,
            'Session should start in Voting status'
        );
        System.assertEquals(
            'Fibonacci',
            result.votingSystem,
            'Voting system should match'
        );
        System.assertEquals(
            true,
            result.autoReveal,
            'Auto reveal should match'
        );
        System.assertEquals(
            1,
            result.participants.size(),
            'Should have one participant'
        );
        System.assertEquals(
            'Test User',
            result.participants[0].displayName,
            'Participant name should match'
        );
    }

    @IsTest
    static void testJoinSession() {
        PlanningPokerController.SessionDTO session = createTestSession();

        Test.startTest();
        PlanningPokerController.SessionDTO result = PlanningPokerController.joinSession(
            session.id,
            'Second User',
            '🐱',
            'Observer'
        );
        Test.stopTest();

        // Same user joining again updates existing participant
        System.assertEquals(
            1,
            result.participants.size(),
            'Should still have one participant (same user)'
        );
    }

    @IsTest
    static void testGetActiveSessions() {
        createTestSession();

        Test.startTest();
        List<PlanningPokerController.SessionDTO> sessions = PlanningPokerController.getActiveSessions();
        Test.stopTest();

        System.assert(
            sessions.size() >= 1,
            'Should have at least one active session'
        );
    }

    @IsTest
    static void testCastVote() {
        PlanningPokerController.SessionDTO session = createTestSession();

        Test.startTest();
        PlanningPokerController.castVote(session.id, '5');
        Test.stopTest();

        PlanningPokerController.SessionDTO updated = PlanningPokerController.getSession(
            session.id
        );
        PlanningPokerController.ParticipantDTO voter = updated.participants[0];
        System.assertEquals(
            true,
            voter.hasVoted,
            'Participant should have voted'
        );
        System.assertEquals('5', voter.vote, 'Vote value should match');
    }

    @IsTest
    static void testRevealVotes() {
        PlanningPokerController.SessionDTO session = createTestSession();
        PlanningPokerController.castVote(session.id, '8');

        Test.startTest();
        PlanningPokerController.SessionDTO result = PlanningPokerController.revealVotes(
            session.id
        );
        Test.stopTest();

        System.assertEquals(
            'Revealed',
            result.status,
            'Session status should be Revealed'
        );
    }

    @IsTest
    static void testClearVotes() {
        PlanningPokerController.SessionDTO session = createTestSession();
        PlanningPokerController.castVote(session.id, '3');
        PlanningPokerController.revealVotes(session.id);

        Test.startTest();
        PlanningPokerController.SessionDTO result = PlanningPokerController.clearVotes(
            session.id
        );
        Test.stopTest();

        System.assertEquals(
            'Voting',
            result.status,
            'Session should be back to Voting'
        );
        System.assertEquals(
            false,
            result.participants[0].hasVoted,
            'Votes should be cleared'
        );
    }

    @IsTest
    static void testLeaveSessionDestroysEmpty() {
        PlanningPokerController.SessionDTO session = createTestSession();
        String sessionId = session.id;

        Test.startTest();
        PlanningPokerController.leaveSession(sessionId);
        Test.stopTest();

        List<OpenSF__PokerSession__c> remaining = [
            SELECT Id
            FROM OpenSF__PokerSession__c
            WHERE Id = :sessionId
        ];
        System.assertEquals(
            0,
            remaining.size(),
            'Session should be deleted when last participant leaves'
        );
    }

    @IsTest
    static void testCloseSession() {
        PlanningPokerController.SessionDTO session = createTestSession();
        String sessionId = session.id;

        Test.startTest();
        PlanningPokerController.closeSession(sessionId);
        Test.stopTest();

        List<OpenSF__PokerSession__c> remaining = [
            SELECT Id
            FROM OpenSF__PokerSession__c
            WHERE Id = :sessionId
        ];
        System.assertEquals(
            0,
            remaining.size(),
            'Session should be deleted when closed'
        );
    }

    @IsTest
    static void testAutoReveal() {
        // Create session with auto-reveal enabled and a Voter participant
        PlanningPokerController.SessionDTO session = createTestSession();

        Test.startTest();
        // The single voter votes — should trigger auto-reveal
        PlanningPokerController.castVote(session.id, '13');
        Test.stopTest();

        PlanningPokerController.SessionDTO updated = PlanningPokerController.getSession(
            session.id
        );
        System.assertEquals(
            'Revealed',
            updated.status,
            'Auto-reveal should have triggered'
        );
    }

    @IsTest
    static void testGetCurrentUserId() {
        Test.startTest();
        String userId = PlanningPokerController.getCurrentUserId();
        Test.stopTest();

        System.assertEquals(
            UserInfo.getUserId(),
            userId,
            'Should return current user ID'
        );
    }

    private static PlanningPokerController.SessionDTO createTestSession() {
        return PlanningPokerController.createSession(
            'Test Session',
            'ModifiedFibonacci',
            'Everyone',
            true,
            true,
            'Test User',
            '🐶',
            'Voter'
        );
    }
}
