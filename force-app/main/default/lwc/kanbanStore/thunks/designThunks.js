/**
 * Design Thinking Thunks - Async actions
 * @module designThunks
 */
import * as types from '../state/reducers/designActionTypes';

export const loadDesignSessions =
    (boardId) =>
    async (dispatch, _getState, { callApex }) => {
        dispatch({ type: types.DESIGN_SET_LOADING, payload: true });
        try {
            const sessions = await callApex(
                'DesignSessionController.getSessionsByBoard',
                { boardId }
            );
            dispatch({ type: types.DESIGN_SET_SESSIONS, payload: sessions });
        } catch (error) {
            dispatch({
                type: types.DESIGN_SET_ERROR,
                payload: error.body?.message || error.message
            });
        } finally {
            dispatch({ type: types.DESIGN_SET_LOADING, payload: false });
        }
    };

export const loadDesignSession =
    (sessionId) =>
    async (dispatch, _getState, { callApex }) => {
        dispatch({ type: types.DESIGN_SET_LOADING, payload: true });
        try {
            const session = await callApex(
                'DesignSessionController.getSession',
                { sessionId }
            );
            dispatch({
                type: types.DESIGN_SET_ACTIVE_SESSION,
                payload: session
            });
            dispatch({
                type: types.DESIGN_SET_CURRENT_PHASE,
                payload: session.currentPhase
            });
        } catch (error) {
            dispatch({
                type: types.DESIGN_SET_ERROR,
                payload: error.body?.message || error.message
            });
        } finally {
            dispatch({ type: types.DESIGN_SET_LOADING, payload: false });
        }
    };

export const createDesignSession =
    (boardId, title) =>
    async (dispatch, getState, { callApex }) => {
        try {
            const session = await callApex(
                'DesignSessionController.createSession',
                { boardId, title }
            );
            dispatch({
                type: types.DESIGN_SET_SESSIONS,
                payload: [session, ...(getState().design?.sessions || [])]
            });
            return session;
        } catch (error) {
            dispatch({
                type: types.DESIGN_SET_ERROR,
                payload: error.body?.message || error.message
            });
            throw error;
        }
    };

export const startDesignSession =
    (sessionId) =>
    async (dispatch, _getState, { callApex }) => {
        try {
            const session = await callApex(
                'DesignSessionController.startSession',
                { sessionId }
            );
            dispatch({
                type: types.DESIGN_SET_ACTIVE_SESSION,
                payload: session
            });
            dispatch({ type: types.DESIGN_UPDATE_SESSION, payload: session });
        } catch (error) {
            dispatch({
                type: types.DESIGN_SET_ERROR,
                payload: error.body?.message || error.message
            });
            throw error;
        }
    };

export const endDesignSession =
    (sessionId) =>
    async (dispatch, _getState, { callApex }) => {
        try {
            await callApex('DesignSessionController.endSession', { sessionId });
            dispatch({
                type: types.DESIGN_UPDATE_SESSION,
                payload: { id: sessionId, status: 'Completed' }
            });
            dispatch({ type: types.DESIGN_CLEAR_SESSION });
        } catch (error) {
            dispatch({
                type: types.DESIGN_SET_ERROR,
                payload: error.body?.message || error.message
            });
            throw error;
        }
    };

export const addCardToDesignSession =
    (sessionId, cardId) =>
    async (dispatch, getState, { callApex }) => {
        try {
            const sc = await callApex(
                'DesignSessionController.addCardToSession',
                { sessionId, cardId }
            );
            const session = getState().design?.activeSession;
            if (session) {
                dispatch({
                    type: types.DESIGN_SET_ACTIVE_SESSION,
                    payload: {
                        ...session,
                        cards: [...(session.cards || []), sc]
                    }
                });
            }
            return sc;
        } catch (error) {
            dispatch({
                type: types.DESIGN_SET_ERROR,
                payload: error.body?.message || error.message
            });
            throw error;
        }
    };

export const createDesignNote =
    (params) =>
    async (dispatch, _getState, { callApex }) => {
        try {
            const note = await callApex(
                'DesignSessionController.createNote',
                params
            );
            dispatch({ type: types.DESIGN_ADD_NOTE, payload: note });
            return note;
        } catch (error) {
            dispatch({
                type: types.DESIGN_SET_ERROR,
                payload: error.body?.message || error.message
            });
            throw error;
        }
    };

export const loadDesignNotes =
    (sessionId, tool, phase) =>
    async (dispatch, _getState, { callApex }) => {
        try {
            const notes = await callApex(
                'DesignSessionController.getNotesBySession',
                { sessionId, tool, phase }
            );
            dispatch({ type: types.DESIGN_SET_NOTES, payload: notes });
        } catch (error) {
            dispatch({
                type: types.DESIGN_SET_ERROR,
                payload: error.body?.message || error.message
            });
        }
    };

export const castDesignVote =
    (params) =>
    async (dispatch, _getState, { callApex }) => {
        try {
            await callApex('DesignSessionController.castVote', params);
            dispatch({
                type: types.DESIGN_ADD_VOTE,
                payload: {
                    noteId: params.noteId,
                    voterId: 'self',
                    voteType: params.voteType,
                    round: params.round
                }
            });
        } catch (error) {
            dispatch({
                type: types.DESIGN_SET_ERROR,
                payload: error.body?.message || error.message
            });
            throw error;
        }
    };

export const advanceDesignPhase =
    (cardId, newPhase) =>
    async (dispatch, _getState, { callApex }) => {
        try {
            await callApex('DesignSessionController.advanceCardPhase', {
                cardId,
                newPhase
            });
            dispatch({
                type: types.DESIGN_UPDATE_CARD_PHASE,
                payload: { cardId, phase: newPhase }
            });
        } catch (error) {
            dispatch({
                type: types.DESIGN_SET_ERROR,
                payload: error.body?.message || error.message
            });
            throw error;
        }
    };

export const saveDesignArtifact =
    (params) =>
    async (dispatch, _getState, { callApex }) => {
        try {
            const artifact = await callApex(
                'DesignSessionController.saveArtifact',
                params
            );
            dispatch({ type: types.DESIGN_ADD_ARTIFACT, payload: artifact });
            return artifact;
        } catch (error) {
            dispatch({
                type: types.DESIGN_SET_ERROR,
                payload: error.body?.message || error.message
            });
            throw error;
        }
    };

export const loadDesignPhaseCounts =
    (boardId) =>
    async (dispatch, _getState, { callApex }) => {
        try {
            const counts = await callApex(
                'DesignSessionController.getPhaseCounts',
                { boardId }
            );
            dispatch({ type: types.DESIGN_SET_PHASE_COUNTS, payload: counts });
        } catch (error) {
            dispatch({
                type: types.DESIGN_SET_ERROR,
                payload: error.body?.message || error.message
            });
        }
    };
