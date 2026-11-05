# Deprecated components

These components were released in managed package version 1.1.1 and are no
longer used. A second-generation managed package can't drop released
components unless Salesforce enables component deletion for the package, so
they stay in the package as inert placeholders:

- Apex classes are empty.
- Lightning web components are empty and not exposed.
- Flows keep their original definition but are inactive (`Obsolete`).
- The `View Hidden Boards` permission set and custom permission, the
  `Give Feedback` quick action and the platform event fields are unchanged
  apart from their descriptions.

Every component is marked `DEPRECATED` in its description or header.
Don't build on them.

Some of the platform event fields are **required**, so every publish must
still set them or `EventBus.publish` fails (and live updates stop):
`CardUpdateEvent__e.CardId__c` and `CardName__c`, and
`ColumnUpdateEvent__e.BoardId__c`, `ColumnId__c`, `ColumnName__c` and
`LastModifiedDate__c`. `CardTriggerHandler` and `ColumnTriggerHandler` fill
them; their tests fail if a publish fails. Once component deletion is enabled for the package,
this folder can be removed.
