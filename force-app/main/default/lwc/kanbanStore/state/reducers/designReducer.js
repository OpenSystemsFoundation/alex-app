/**
 * Design Thinking Reducer
 * Manages state for design thinking sessions, notes, votes, artifacts, timer, and participants.
 * @module designReducer
 */
import * as types from './designActionTypes';

export const initialDesignState = {
    sessions: [],
    activeSession: null,
    currentPhase: null,
    activeTool: null,
    notes: [],
    votes: [],
    artifacts: [],
    participants: [],
    timer: { running: false, duration: 0, remaining: 0 },
    phaseCounts: {},
    isLoading: false,
    error: null
};

export function designReducer(state = initialDesignState, action) {
    switch (action.type) {
        case types.DESIGN_SET_SESSIONS:
            return { ...state, sessions: action.payload, error: null };
        case types.DESIGN_SET_ACTIVE_SESSION:
            return { ...state, activeSession: action.payload, error: null };
        case types.DESIGN_UPDATE_SESSION:
            return {
                ...state,
                // eslint-disable-next-line no-confusing-arrow
                sessions: state.sessions.map((s) =>
                    s.id === action.payload.id ? { ...s, ...action.payload } : s
                ),
                activeSession:
                    state.activeSession?.id === action.payload.id
                        ? { ...state.activeSession, ...action.payload }
                        : state.activeSession
            };
        case types.DESIGN_CLEAR_SESSION:
            return {
                ...state,
                activeSession: null,
                currentPhase: null,
                activeTool: null,
                notes: [],
                votes: [],
                participants: [],
                timer: { running: false, duration: 0, remaining: 0 }
            };
        case types.DESIGN_SET_CURRENT_PHASE:
            return { ...state, currentPhase: action.payload };
        case types.DESIGN_UPDATE_CARD_PHASE: {
            const sess = state.activeSession;
            if (!sess) return state;
            return {
                ...state,
                activeSession: {
                    ...sess,
                    // eslint-disable-next-line no-confusing-arrow
                    cards: (sess.cards || []).map((c) =>
                        c.cardId === action.payload.cardId
                            ? { ...c, designPhase: action.payload.phase }
                            : c
                    )
                }
            };
        }
        case types.DESIGN_SET_ACTIVE_TOOL:
            return { ...state, activeTool: action.payload };
        case types.DESIGN_SET_NOTES:
            return { ...state, notes: action.payload };
        case types.DESIGN_ADD_NOTE:
            return { ...state, notes: [...state.notes, action.payload] };
        case types.DESIGN_UPDATE_NOTE:
            return {
                ...state,
                notes: state.notes.map((n) =>
                    n.id === action.payload.id ? { ...n, ...action.payload } : n
                )
            };
        case types.DESIGN_MOVE_NOTE:
            return {
                ...state,
                notes: state.notes.map((n) =>
                    n.id === action.payload.noteId
                        ? {
                              ...n,
                              zone: action.payload.zone,
                              positionX: action.payload.x,
                              positionY: action.payload.y,
                              cluster: action.payload.cluster || n.cluster
                          }
                        : n
                )
            };
        case types.DESIGN_DELETE_NOTE:
            return {
                ...state,
                notes: state.notes.filter((n) => n.id !== action.payload)
            };
        case types.DESIGN_SET_VOTES:
            return { ...state, votes: action.payload };
        case types.DESIGN_ADD_VOTE:
            return {
                ...state,
                votes: [...state.votes, action.payload],
                notes: state.notes.map((n) =>
                    n.id === action.payload.noteId
                        ? { ...n, voteCount: (n.voteCount || 0) + 1 }
                        : n
                )
            };
        case types.DESIGN_REMOVE_VOTE:
            return {
                ...state,
                votes: state.votes.filter(
                    (v) =>
                        !(
                            v.noteId === action.payload.noteId &&
                            v.voterId === action.payload.voterId &&
                            v.round === action.payload.round
                        )
                ),
                notes: state.notes.map((n) =>
                    n.id === action.payload.noteId
                        ? {
                              ...n,
                              voteCount: Math.max(0, (n.voteCount || 0) - 1)
                          }
                        : n
                )
            };
        case types.DESIGN_RESET_VOTES:
            return {
                ...state,
                votes: [],
                notes: state.notes.map((n) => ({ ...n, voteCount: 0 }))
            };
        case types.DESIGN_SET_ARTIFACTS:
            return { ...state, artifacts: action.payload };
        case types.DESIGN_ADD_ARTIFACT:
            return {
                ...state,
                artifacts: [...state.artifacts, action.payload]
            };
        case types.DESIGN_START_TIMER:
            return {
                ...state,
                timer: {
                    running: true,
                    duration: action.payload.duration,
                    remaining: action.payload.duration
                }
            };
        case types.DESIGN_TICK_TIMER:
            return {
                ...state,
                timer: {
                    ...state.timer,
                    remaining: Math.max(0, state.timer.remaining - 1),
                    running: state.timer.remaining > 1
                }
            };
        case types.DESIGN_STOP_TIMER:
            return { ...state, timer: { ...state.timer, running: false } };
        case types.DESIGN_SET_PARTICIPANTS:
            return { ...state, participants: action.payload };
        case types.DESIGN_ADD_PARTICIPANT:
            return state.participants.some(
                (p) => p.userId === action.payload.userId
            )
                ? state
                : {
                      ...state,
                      participants: [...state.participants, action.payload]
                  };
        case types.DESIGN_REMOVE_PARTICIPANT:
            return {
                ...state,
                participants: state.participants.filter(
                    (p) => p.userId !== action.payload.userId
                )
            };
        case types.DESIGN_UPDATE_PARTICIPANT_ACTIVITY:
            return {
                ...state,
                participants: state.participants.map((p) =>
                    p.userId === action.payload.userId
                        ? { ...p, activity: action.payload.activity }
                        : p
                )
            };
        case types.DESIGN_SET_PHASE_COUNTS:
            return { ...state, phaseCounts: action.payload };
        case types.DESIGN_SET_LOADING:
            return { ...state, isLoading: action.payload };
        case types.DESIGN_SET_ERROR:
            return { ...state, error: action.payload, isLoading: false };
        default:
            return state;
    }
}
