# design-thinking

> Collaborative design thinking extension — facilitated sessions with empathy maps, brainstorming, dot voting, and phase pipeline.

## Node Metadata
- **id**: design-thinking
- **status**: active-development
- **package**: force-design-thinking

## Edges
| Target | Type | Description |
|--------|------|-------------|
| data-model | depends-on | Board__c and Card__c references |
| kanban-store | depends-on | Design state slice (designReducer) |
| real-time-sync | publishes-to | DesignSessionEvent__e for collaboration |
| card-system | extends | Adds DesignPhase__c, HowMightWe__c, DesignScore__c, ActiveDesignSession__c |
| card-system | writes-to | Graduates refined cards to sprint-ready |

## Schema
- **Objects**: DesignSession__c, DesignSessionCard__c, DesignNote__c, DesignVote__c, DesignArtifact__c
- **Events**: DesignSessionEvent__e
- **Apex**: DesignSessionController, DesignSessionService, DesignSessionSelector, DesignSessionDTO, DesignEnums
- **LWC**: designThinkingView, designSessionList, designSessionBoard, designPhaseNav, designToolPicker, designToolCanvas, designStickyCanvas, designStickyNote, designDotVoting, designTimer, designParticipantBar, designEmpathyMap, designBrainstormCanvas, designFeedbackGrid, designHmwBuilder, designCardPipeline
- **Store**: designActionTypes.js, designReducer.js, designSelectors.js, designThunks.js

## Roadmap
### Now (Milestone 1-2)
- Session CRUD and lifecycle
- Phase pipeline navigation
- Core collaborative tools (Empathy Map, Brainstorm, Feedback Grid, HMW, Dot Voting)
- Platform events for real-time sync
- Redux store integration

### Next (Milestone 3)
- Crazy 8s with private/reveal modes
- Affinity Diagram with dynamic clusters
- Journey Map with emotion curve
- Persona Builder
- Storyboard Builder with playback
- Mind Map with auto-layout
- Decision Matrix with weighted scoring
- SCAMPER Prompts
- Stakeholder Map

### Future (Milestone 4)
- Facilitator dashboard with session analytics
- Design thinking pipeline view with drag between phases
- Card artifact timeline in detail panel
- Funnel analytics (conversion rate through DT phases)
- Keyboard shortcuts and full accessibility
- AI-assisted empathy synthesis and idea generation

## Known Issues
- Extension package Card__c field additions require base package v2.0.0+
- Canvas drawing tools (Sketch, Storyboard) not yet implemented — planned for Milestone 3
- Timer sync uses polling interval, not true platform event sync yet
