# planning-poker

> Real-time estimation sessions — Fibonacci-scale voting with reveal, consensus detection, and story point assignment.

## Node Metadata
- **id**: planning-poker
- **status**: stable
- **package**: force-app

## Edges
| Target | Type | Description |
|--------|------|-------------|
| data-model | depends-on | PokerSession__c, PokerParticipant__c |
| real-time-sync | publishes-to | PokerEvent__e for vote sync and reveal |
| card-system | depends-on | Reads and writes StoryPoints__c on Card__c |

## Schema
- **Objects**: PokerSession__c, PokerParticipant__c
- **Events**: PokerEvent__e
- **Apex**: PlanningPokerController
- **LWC**: planningPoker
- **E2E**: planning-poker.spec.ts

## Roadmap
### Now
- Session creation with card queue
- Vote submission with face-down/reveal lifecycle
- Auto-assign agreed story points to card

### Next
- Custom estimation scales (T-shirt sizes, powers of 2)
- Voting timer with auto-reveal

### Future
- AI-suggested estimates based on historical similar cards
- Async poker (participants vote on their own schedule)

## Known Issues
- Rapid vote changes before reveal can cause stale participant state
- Session does not auto-advance to next card after consensus
