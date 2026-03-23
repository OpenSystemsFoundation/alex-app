/**
 * Design Thinking Selectors
 * @module designSelectors
 */
export const getDesignSessions = (state) => state.design?.sessions || [];
export const getActiveDesignSession = (state) => state.design?.activeSession || null;
export const getCurrentDesignPhase = (state) => state.design?.currentPhase || null;
export const getActiveDesignTool = (state) => state.design?.activeTool || null;
export const getDesignNotes = (state) => state.design?.notes || [];
export const getNotesByZone = (state, zone) => (state.design?.notes || []).filter(n => n.zone === zone);
export const getNotesByTool = (state, tool) => (state.design?.notes || []).filter(n => n.tool === tool);
export const getDesignVotes = (state) => state.design?.votes || [];
export const getVotesByNote = (state, noteId) => (state.design?.votes || []).filter(v => v.noteId === noteId);
export const getRemainingVotes = (state, voterId, maxVotes) => {
    const cast = (state.design?.votes || []).filter(v => v.voterId === voterId).length;
    return maxVotes - cast;
};
export const getNotesRankedByVotes = (state) => [...(state.design?.notes || [])].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
export const getDesignTimer = (state) => state.design?.timer || { running: false, duration: 0, remaining: 0 };
export const getDesignParticipants = (state) => state.design?.participants || [];
export const getArtifactsByCard = (state, cardId) => (state.design?.artifacts || []).filter(a => a.cardId === cardId);
export const getArtifactsByPhase = (state, phase) => (state.design?.artifacts || []).filter(a => a.phase === phase);
export const getDesignPhaseCounts = (state) => state.design?.phaseCounts || {};
export const getSessionCardsByPhase = (state) => {
    const session = state.design?.activeSession;
    if (!session?.cards) return {};
    return session.cards.reduce((acc, card) => {
        const phase = card.designPhase || 'unassigned';
        if (!acc[phase]) acc[phase] = [];
        acc[phase].push(card);
        return acc;
    }, {});
};
export const isDesignLoading = (state) => state.design?.isLoading || false;
export const getDesignError = (state) => state.design?.error || null;
