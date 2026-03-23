/**
 * DesignSessionController - Thin facade for Design Thinking LWC.
 * Delegates business logic to DesignSessionService.
 */
public with sharing class DesignSessionController {

    @AuraEnabled
    public static DesignSessionDTO.SessionDTO createSession(Id boardId, String title) {
        try {
            return DesignSessionService.createSession(boardId, title);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static DesignSessionDTO.SessionDTO getSession(Id sessionId) {
        try {
            OpenSF__DesignSession__c session = DesignSessionSelector.getSessionById(sessionId);
            DesignSessionDTO.SessionDTO dto = new DesignSessionDTO.SessionDTO(session);
            // Load session cards
            List<OpenSF__DesignSessionCard__c> sessionCards = DesignSessionSelector.getCardsBySessionId(sessionId);
            dto.cards = new List<DesignSessionDTO.SessionCardDTO>();
            for (OpenSF__DesignSessionCard__c sc : sessionCards) {
                dto.cards.add(new DesignSessionDTO.SessionCardDTO(sc));
            }
            return dto;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<DesignSessionDTO.SessionDTO> getSessionsByBoard(Id boardId) {
        try {
            List<OpenSF__DesignSession__c> sessions = DesignSessionSelector.getSessionsByBoardId(boardId);
            List<DesignSessionDTO.SessionDTO> dtos = new List<DesignSessionDTO.SessionDTO>();
            for (OpenSF__DesignSession__c s : sessions) {
                dtos.add(new DesignSessionDTO.SessionDTO(s));
            }
            return dtos;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static DesignSessionDTO.SessionDTO startSession(Id sessionId) {
        try {
            return DesignSessionService.startSession(sessionId);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static void endSession(Id sessionId) {
        try {
            DesignSessionService.endSession(sessionId);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static DesignSessionDTO.SessionCardDTO addCardToSession(Id sessionId, Id cardId) {
        try {
            return DesignSessionService.addCardToSession(sessionId, cardId);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static void removeCardFromSession(Id sessionId, Id cardId) {
        try {
            DesignSessionService.removeCardFromSession(sessionId, cardId);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static void advanceCardPhase(Id cardId, String newPhase) {
        try {
            DesignSessionService.advanceCardPhase(cardId, newPhase);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static void returnCardToPhase(Id cardId, String targetPhase) {
        try {
            DesignSessionService.returnCardToPhase(cardId, targetPhase);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static void setSessionPhase(Id sessionId, String newPhase) {
        try {
            DesignSessionService.setSessionPhase(sessionId, newPhase);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static DesignSessionDTO.NoteDTO createNote(
        Id sessionId, Id cardId, String text, String zone,
        String tool, String phase, Decimal posX, Decimal posY
    ) {
        try {
            return DesignSessionService.createNote(sessionId, cardId, text, zone, tool, phase, posX, posY);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static void updateNote(Id noteId, String text, String zone, Decimal posX, Decimal posY) {
        try {
            DesignSessionService.updateNote(noteId, text, zone, posX, posY);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static void deleteNote(Id noteId) {
        try {
            DesignSessionService.deleteNote(noteId);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<DesignSessionDTO.NoteDTO> getNotesBySession(Id sessionId, String tool, String phase) {
        try {
            List<OpenSF__DesignNote__c> notes = DesignSessionSelector.getNotesBySessionAndTool(sessionId, tool, phase);
            List<DesignSessionDTO.NoteDTO> dtos = new List<DesignSessionDTO.NoteDTO>();
            for (OpenSF__DesignNote__c n : notes) {
                dtos.add(new DesignSessionDTO.NoteDTO(n));
            }
            return dtos;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static void castVote(Id sessionId, Id noteId, String voteType, Integer score, Integer round) {
        try {
            DesignSessionService.castVote(sessionId, noteId, voteType, score, round);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static void retractVote(Id sessionId, Id noteId, Integer round) {
        try {
            DesignSessionService.retractVote(sessionId, noteId, round);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<DesignSessionDTO.VoteDTO> getVotesBySession(Id sessionId, Integer round) {
        try {
            List<OpenSF__DesignVote__c> votes = DesignSessionSelector.getVotesBySessionAndRound(sessionId, round);
            List<DesignSessionDTO.VoteDTO> dtos = new List<DesignSessionDTO.VoteDTO>();
            for (OpenSF__DesignVote__c v : votes) {
                dtos.add(new DesignSessionDTO.VoteDTO(v));
            }
            return dtos;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static DesignSessionDTO.ArtifactDTO saveArtifact(
        Id sessionId, Id cardId, String artifactType, String title,
        String content, String phase, String tool
    ) {
        try {
            return DesignSessionService.saveArtifact(sessionId, cardId, artifactType, title, content, phase, tool);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<DesignSessionDTO.ArtifactDTO> getArtifactsByCard(Id cardId) {
        try {
            List<OpenSF__DesignArtifact__c> artifacts = DesignSessionSelector.getArtifactsByCardId(cardId);
            List<DesignSessionDTO.ArtifactDTO> dtos = new List<DesignSessionDTO.ArtifactDTO>();
            for (OpenSF__DesignArtifact__c a : artifacts) {
                dtos.add(new DesignSessionDTO.ArtifactDTO(a));
            }
            return dtos;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static Map<String, Integer> getPhaseCounts(Id boardId) {
        try {
            return DesignSessionSelector.getPhaseCountsByBoardId(boardId);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
}
