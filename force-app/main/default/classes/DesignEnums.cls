/**
 * DesignEnums - Strongly typed constants for the Design Thinking extension.
 * Follows KanbanEnums pattern from the base package.
 */
public class DesignEnums {

    public enum SessionStatus {
        PLANNING,
        ACTIVE,
        COMPLETED,
        CANCELLED
    }

    public enum DesignPhase {
        EMPATHIZE,
        DEFINE,
        IDEATE,
        PROTOTYPE,
        DT_TEST,
        REFINED
    }

    public enum Tool {
        EMPATHY_MAP,
        AFFINITY_DIAGRAM,
        BRAINSTORM,
        FEEDBACK_GRID,
        HMW_BUILDER,
        SCAMPER,
        MIND_MAP,
        CRAZY_8S,
        STORYBOARD_BUILDER,
        SKETCH_CANVAS,
        DECISION_MATRIX,
        ACCEPTANCE_CRITERIA,
        DOT_VOTING
    }

    public enum VoteType {
        DOT,
        DECISION,
        SCORE
    }

    public enum ArtifactType {
        PERSONA,
        JOURNEY_MAP,
        STORYBOARD,
        SKETCH,
        SNAPSHOT,
        EXTERNAL_LINK,
        ACCEPTANCE_CRITERIA,
        INTERVIEW_NOTES
    }

    public enum SessionEventType {
        NOTE_ADDED,
        NOTE_UPDATED,
        NOTE_MOVED,
        NOTE_DELETED,
        VOTE_CAST,
        VOTE_RETRACTED,
        PHASE_CHANGED,
        TOOL_CHANGED,
        TIMER_STARTED,
        TIMER_STOPPED,
        TIMER_EXPIRED,
        PARTICIPANT_JOINED,
        PARTICIPANT_LEFT,
        SESSION_STARTED,
        SESSION_ENDED,
        CARD_PHASE_ADVANCED,
        CARD_PHASE_RETURNED,
        ARTIFACT_SAVED
    }

    public static String sessionStatusValue(SessionStatus status) {
        switch on status {
            when PLANNING { return 'Planning'; }
            when ACTIVE { return 'Active'; }
            when COMPLETED { return 'Completed'; }
            when CANCELLED { return 'Cancelled'; }
            when else { return null; }
        }
    }

    public static String designPhaseValue(DesignPhase phase) {
        switch on phase {
            when EMPATHIZE { return 'Empathize'; }
            when DEFINE { return 'Define'; }
            when IDEATE { return 'Ideate'; }
            when PROTOTYPE { return 'Prototype'; }
            when DT_TEST { return 'Test'; }
            when REFINED { return 'Refined'; }
            when else { return null; }
        }
    }

    public static String toolValue(Tool tool) {
        switch on tool {
            when EMPATHY_MAP { return 'EmpathyMap'; }
            when AFFINITY_DIAGRAM { return 'AffinityDiagram'; }
            when BRAINSTORM { return 'Brainstorm'; }
            when FEEDBACK_GRID { return 'FeedbackGrid'; }
            when HMW_BUILDER { return 'HMWBuilder'; }
            when SCAMPER { return 'SCAMPER'; }
            when MIND_MAP { return 'MindMap'; }
            when CRAZY_8S { return 'Crazy8s'; }
            when STORYBOARD_BUILDER { return 'StoryboardBuilder'; }
            when SKETCH_CANVAS { return 'SketchCanvas'; }
            when DECISION_MATRIX { return 'DecisionMatrix'; }
            when ACCEPTANCE_CRITERIA { return 'AcceptanceCriteria'; }
            when DOT_VOTING { return 'DotVoting'; }
            when else { return null; }
        }
    }

    public static String voteTypeValue(VoteType vType) {
        switch on vType {
            when DOT { return 'Dot'; }
            when DECISION { return 'Decision'; }
            when SCORE { return 'Score'; }
            when else { return null; }
        }
    }

    public static String artifactTypeValue(ArtifactType aType) {
        switch on aType {
            when PERSONA { return 'Persona'; }
            when JOURNEY_MAP { return 'JourneyMap'; }
            when STORYBOARD { return 'Storyboard'; }
            when SKETCH { return 'Sketch'; }
            when SNAPSHOT { return 'Snapshot'; }
            when EXTERNAL_LINK { return 'ExternalLink'; }
            when ACCEPTANCE_CRITERIA { return 'AcceptanceCriteria'; }
            when INTERVIEW_NOTES { return 'InterviewNotes'; }
            when else { return null; }
        }
    }

    public static String sessionEventTypeValue(SessionEventType eventType) {
        switch on eventType {
            when NOTE_ADDED { return 'note_added'; }
            when NOTE_UPDATED { return 'note_updated'; }
            when NOTE_MOVED { return 'note_moved'; }
            when NOTE_DELETED { return 'note_deleted'; }
            when VOTE_CAST { return 'vote_cast'; }
            when VOTE_RETRACTED { return 'vote_retracted'; }
            when PHASE_CHANGED { return 'phase_changed'; }
            when TOOL_CHANGED { return 'tool_changed'; }
            when TIMER_STARTED { return 'timer_started'; }
            when TIMER_STOPPED { return 'timer_stopped'; }
            when TIMER_EXPIRED { return 'timer_expired'; }
            when PARTICIPANT_JOINED { return 'participant_joined'; }
            when PARTICIPANT_LEFT { return 'participant_left'; }
            when SESSION_STARTED { return 'session_started'; }
            when SESSION_ENDED { return 'session_ended'; }
            when CARD_PHASE_ADVANCED { return 'card_phase_advanced'; }
            when CARD_PHASE_RETURNED { return 'card_phase_returned'; }
            when ARTIFACT_SAVED { return 'artifact_saved'; }
            when else { return null; }
        }
    }

    /**
     * Validate phase transition — can only move forward one step or back to any previous phase
     */
    private static final List<String> PHASE_ORDER = new List<String>{
        'Empathize', 'Define', 'Ideate', 'Prototype', 'Test', 'Refined'
    };

    public static Boolean isValidPhaseAdvance(String currentPhase, String targetPhase) {
        Integer currentIdx = PHASE_ORDER.indexOf(currentPhase);
        Integer targetIdx = PHASE_ORDER.indexOf(targetPhase);
        if (currentIdx < 0 || targetIdx < 0) return false;
        return targetIdx == currentIdx + 1;
    }

    public static Boolean isValidPhaseReturn(String currentPhase, String targetPhase) {
        Integer currentIdx = PHASE_ORDER.indexOf(currentPhase);
        Integer targetIdx = PHASE_ORDER.indexOf(targetPhase);
        if (currentIdx < 0 || targetIdx < 0) return false;
        return targetIdx < currentIdx;
    }
}
