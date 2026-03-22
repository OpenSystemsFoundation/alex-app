BotVersion
Represents the configuration details for a specific Einstein Bot version, including dialogs and variables.
Parent Type
This type extends the Metadata metadata type and inherits its fullName field.
File Suffix and Directory Location
BotVersion components have the suffix .bot and are stored in the bot folder. BotVersion is a top-level child of Bot and shares its suffix and file directory.

Version
BotVersion components are available in API version 43.0 and later.

Special Access Rules
BotVersion is available only if Chat and Einstein Bots are enabled in your org.

Bot metadata deployment and retrieval are not supported for Lead Nurturing and Sales Coach Agents.

Fields
Field Name	Description
botDialogGroups	
Field Type
BotDialogGroup[]
Description
The list of dialog groups in this bot version.
botDialogs	
Field Type
BotDialog[]
Description
The list of dialogs in this bot version.
company	
Field Type
string
Description
Reserved for internal use.
conversationGoals	
Field Type
ConversationDefinitionGoal[]
Description
The list of goals in this bot verion. Available in API version 57.0 and later.
conversationPlanner	
Field Type
ConversationDefinitionPlanner[]
Description
Represents the API name of the Agent planner service GenAiPlanner.
Available in API version 60.0 and later.
conversationSystemDialogs	
Field Type
ConversationSystemDialog[]
Description
A system function assigned to a dialog. Available in API version 48.0 and later.
conversationVariables	
Field Type
ConversationVariable[]
Description
A container that stores a specific piece of data collected from the customer. You can use variables within dialog actions as both inputs and outputs. Available in API version 44.0 and later.
copilotPrimaryLangauge	
Field Type
Language (enumeration of type string)
Description
Represents the primary language of a Copilot or Agent.
copilotSecondaryLanguages	
Field Type
string
Description
Reserved for internal use.
entryDialog	
Field Type
string
Description
Required.

A reference to the first dialog that the bot presents to your customer. For example, Welcome.
initialIntentDetectionEnabled	
Field Type
boolean
Description
Reserved for internal use.
intentDisambiguationEnabled	
Field Type
boolean
Description
Reserved for internal use.
intentThreshold	
Field Type
double
Description
Specifies how strictly a user message must match with a bot intent.

Valid values are between 1 and 5, where 1 is the least strict and 5 is the most strict.

To turn on this feature, contact Salesforce Customer Support. This field is available in API version 63.0 and later.

intentV3Enabled	
Field Type
boolean
Description
Reserved for internal use.
knowledgeActionEnabled	
Field Type
boolean
Description
Indicates whether a knowledge action is enabled. The default value is false.
knowledgeFallbackEnabled	
Field Type
boolean
Description
Reserved for internal use.
mainMenuDialog	
Field Type
string
Description
A reference to the dialog identified as the main menu dialog. For example, Main Menu.
nlpProviders	
Field Type
ConversationDefinitionNlpProvider[]
Description
Defines the language provider which is used for a particular language. Available in API version 49.0 and later.
responseDelayMilliseconds	
Field Type
int
Description
An optional default or custom delay after every bot response to simulate typing.
role	
Field Type
string
Description
Reserved for internal use.
surfacesEnabled	
Field Type
boolean
Description
Reserved for internal use.
toneType	
Field Type
GenAiBotToneType (enumeration of type string)
Description
The tone of the bot. Valid values are:
Casual
Formal
Neutral
BotDialogGroup
The list of dialog groups in this bot version.

Field Name	Description
description	
Field Type
string
Description
A description of the bot dialog group.
developerName	
Field Type
string
Description
Required.

This unique name prevents conflicts with other dialog groups associated with the same bot version. This name can contain only underscores and alphanumeric characters. The name must begin with a letter, not include spaces, not end with an underscore, and not contain two consecutive underscores.
Note

Only users with View DeveloperName OR View Setup and Configuration permission can view, group, sort, and filter this field.

label	
Field Type
string
Description
Required.

A label that identifies the dialog group throughout the Salesforce user interface.
BotDialog
The list of dialogs in this bot version.

Field Name	Description
botDialogGroup	
Field Type
string
Description
The bot dialog group that contains this bot dialog.
botSteps	
Field Type
BotStep[]
Description
A list of steps that are executed as part of the dialog.
description	
Field Type
string
Description
A description of the bot dialog.
developerName	
Field Type
string
Description
Required.

This unique name prevents conflicts with other dialogs associated with the same bot version. This name can contain only underscores and alphanumeric characters. It must begin with a letter, not include spaces, not end with an underscore, and not contain two consecutive underscores.
Note

Only users with View DeveloperName OR View Setup and Configuration permission can view, group, sort, and filter this field.

isPlaceholderDialog	
Field Type
boolean
Description
In a bot block, indicates whether a dialog is a placeholder (true) or not (false). In a bot template or bot version not associated with a bot block, this field is read-only and the value is false. Available in API version 58.0 and later.
label	
Field Type
string
Description
Required.

A label that identifies the dialog throughout the Salesforce user interface.
mlIntent	
Field Type
string
Description
Required.

A label that identifies the dialog throughout the Salesforce user interface. The name of the intent associated with a dialog.
mlIntentTrainingEnabled	
Field Type
boolean
Description
Indicates whether Einstein is turned on to train an intent model for the dialog intent (true) or turned off for the exact match option (false). The default value is false. Available in API version 46.0 and later.
showInFooterMenu	
Field Type
boolean
Description
Indicates whether to show this dialog in the Bot Options menu. The default value is false.
BotStep
A step that is executed as part of the dialog.

Field Name	Description
booleanFilter	
Field Type
string
Description
This field is reserved for future use.
botInvocation	
Field Type
BotInvocation
Description
Bot Invocation used by a BotStep of type Invocation.
botMessages	
Field Type
BotMessage[]
Description
List of bot messages used by a BotStep of type Message.
botNavigation	
Field Type
BotNavigation
Description
Bot Navigation used by a BotStep of type Navigation.
botStepConditions	
Field Type
BotStepCondition[]
Description
List of BotStep conditions associated with a BotStep of type Group.
botSteps	
Field Type
BotStep[]
Description
List of BotSteps associated to a Bot Step of type Group.
botVariableOperation	
Field Type
BotVariableOperation[]
Description
Bot Variable Operation used by a BotStep of type VariableOperation.
conditionLogicType	
Field Type
ConversationDefinitionLogicalOperatorType (enumeration of type string)
Description
Represents the type of conditional logic used by a BotStep. Values are:
And
Or
Available in API version 58.0 and later.
conversationRecordLookup	
Field Type
ConversationRecordLookup[]
Description
A lookup action to the Conversation record. Available in API version 46.0 and later.
conversationStepGoalMappings	
Field Type
ConversationDefinitionStepGoalMapping[]
Description
The API name of a goal used by a BotStep of type GoalStep. Available in API version 57.0 and later.
conversationSystemMessage	
Field Type
ConversationSystemMessage[]
Description
System messages that represent an action for a BotStep, such as transferring to an agent or ending a chat. Available in API version 46.0 and later.
messageDefinition	
Field Type
ConversationDefinitionRichMessage[]
Description
List of configuration details used by a BotStep that references a messaging component. Available in API version 54.0 and later.
stepIdentifier	
Field Type
string
Description
A unique key that identifies a step within a dialog. It is used to link translated labels to labels within the step. This field is recommended for all step records and is required for translated step labels. Available in API version 53.0 and later.
If a step is created via the UI, the stepIdentifier is automatically generated. If a step is created via API, the stepIdentifier must be provided. The stepIdentifier can contain letters, numbers, dashes, and underscores, up to 255 characters.

type	
Field Type
BotStepType (enumeration of type string)
Description
Required.

Values are:

GoalStep (Available in API version 57.0 and later.)
Group
Invocation
Message
Navigation
RecordLookup (Available in API version 48.0 and later.)
RichMessage (Available in API version 54.0 and later.)
SystemMessage
VariableOperation
Wait
BotInvocation
Bot Invocation used by a BotStep of type Invocation.

Field Name	Description
invocationActionName	
Field Type
string
Description
The name of the invocable action used by a Bot Invocation.
invocationActionType	
Field Type
ConversationInvocableTargetType (enumeration of type string)
Description
Available dialog action types are:
Values are:

apex
externalService (Available in API version 53.0 and later.)
flow
logFeedback (Available in API version 51.0 and later.)
logGoalAchieved (Deprecated in API version 57.0 and later.)
standardInvocableAction
invocationMappings	
Field Type
BotInvocationMapping[]
Description
List of Bot Invocation Mappings for a Bot Invocation.
BotInvocationMapping
List of Bot Invocation Mappings for a Bot Invocation.

Field Name	Description
parameterName	
Field Type
string
Description
Required.

Name of an Input/Output parameter of the parent Bot Invocation target.
recordName	
Field Type
string
Description
Name of the record that is used as part of an Invocation mapping. Available in API version 54.0 and later.
type	
Field Type
BotInvocationMappingType (enumeration of type string)
Description
Required.

Values are:

Input
Output
value	
Field Type
string
Description
Literal value to be assigned to the specified parameter.
variableName	
Field Type
string
Description
Name of the Bot Variable that is used as part of an Invocation mapping.
variableType	
Field Type
ConversationVariableType (enumeration of type string)
Description
This field relates to the type of variable used in this invocation mapping.
Values are:

ContextVariable
ConversationVariable
PageContextVariable
BotMessage
A bot message used by a BotStep of type Message.

Field Name	Description
message	
Field Type
string
Description
Required.

Message to display as part of an outgoing message from the bot to the customer.
messageIdentifier	
Field Type
string
Description
A unique key that identifies a message within a dialog. It is used to link translated labels to labels within the message. This field is recommended for all message records and is required for translated message labels. Available in API version 53.0 and later.
If a message is created via the UI, the messageIdentifier is automatically generated. If a message is created via API, the messageIdentifier must be provided. messageIdentifier can contain letters, numbers, dashes, and underscores, up to 255 characters.

BotNavigation
Bot navigation used by a BotStep of type Navigation.

Field Name	Description
botNavigationLinks	
Field Type
BotNavigationLink[]
Description
List of Bot Navigation links associated with a Bot Navigation of type Call or Redirect.
type	
Field Type
BotNavigationType (enumeration of type string)
Description
Required.

Values are:

Call
Redirect
TransferToAgent
BotNavigationLink
List of Bot Navigation links associated with a Bot Navigation of type Call or Redirect.

Field Name	Description
label	
Field Type
string
Description
Label displayed when more than one Bot Navigation Link is available under a Bot Navigation of type Redirect. The target dialog label is used when no label is provided.
targetBotDialog	
Field Type
string
Description
Name of the target dialog to be called as part of this Bot Navigation Link.
targetVariable	
Field Type
string
Description
In the Redirect to Dialog Rule Action, the ID of the target object variable to be called as part of this Bot Navigation link. Available in API version 57.0 and later.
targetVariableType	
Field Type
ConversationVariableType (enumeration of type string)
Description
In the Redirect to Dialog Rule Action, the type of variable referred to in targetVariable. Available in API version 57.0 and later.
Values are:

ContextVariable
ConversationVariable
PageContextVariable
BotStepCondition
List of BotStep conditions associated with a BotStep of type Group.

Field Name	Description
leftOperandName	
Field Type
string
Description
Required.

Name of the variable used as the left side of the condition operation.
leftOperandType	
Field Type
ConversationVariableType (enumeration of type string)
Description
Required.

Type of the variable used as the left side of the condition operation.
Values are:

ContextVariable
ConversationVariable
PageContextVariable
operatorType	
Field Type
BotStepConditionOperatorType (enumeration of type string)
Description
Required.

Values are:

Equals
GreaterThan (Available in API version 47.0 and later.)
GreaterThanOrEqualTo (Available in API version 47.0 and later.)
IsNotSet
IsSet
LessThan (Available in API version 47.0 and later.)
LessThanOrEqualTo (Available in API version 47.0 and later.)
NotEquals
rightOperandValue	
Field Type
string
Description
Value that is used as the right side of the condition operation. This value is ignored when using IsSet and IsNotSet operators.
BotVariableOperation
Bot variable operation used by a BotStep of type VariableOperation.

Field Name	Description
askCollectIfSet	
Field Type
boolean
Description
If true, the bot runs a Bot Variable Operation of type Collect regardless of whether the variable already has a value. When a value exists for a variable, the bot asks the user for the relevant information, and the bot overwrites the existing value with the user-provided value. If false, the bot skips variables with an existing value and maintains the existing value. The default is false. Available in API version 51.0 and later.
autoSelectIfSingleChoice	
Field Type
boolean
Description
If true, the bot automatically selects the answer in the conversation flow when only one button choice is available in a Bot Variable Operation of type Collect and a quickReplyType value of Dynamic. If false, the bot presents the single button choice and waits for the user’s response. The default is false. Available in API version 51.0 and later.
botInvocation	
Field Type
BotInvocation
Description
Bot Invocation used to provide Dynamic choices by a Bot Variable Operation of type Collect and quickReplyType of Dynamic.
botMessages	
Field Type
BotMessage[]
Description
List of Bot Messages used as prompt messages by a Bot Variable Operation of type Collect.
botQuickReplyOptions	
Field Type
BotQuickReplyOption[]
Description
List of static choice options used by a Bot Variable Operation of type Collect and quickReplyType of Static.
botVariableOperands	
Field Type
BotVariableOperand[]
Description
List of Bot Variable Operands associated with a Bot Variable of type Set or Unset.
ignoreIntentRecognition	
Field Type
boolean
Description
If true the bot requires a response to a Question dialog step. The bot doesn't perform intent recognition for any user messages that do not fit the entity requirements. The bot repeats the question until the customer's response fits the entity requirements. Available in API version 63.0 and later.
invalidInputBotNavigation	
Field Type
BotNavigation
Description
Bot Navigation used by a Bot Variable Operation of type Collect. This navigation is executed when the associated Bot Invocation doesn’t return any options.
messageDefinition	
Field Type
ConversationDefinitionRichMessage
Description
Configuration details that reference a messaging component. Outputs are used by a Bot Variable Operation of type Set. Available in API version 58.0 and later.
optionalCollect	
Field Type
boolean
Description
If true, the bot asks the repair attempts once and then moves on to the next dialog step. The default value is false. Available in API version 48.0 and later.
quickReplyOptionTemplate	
Field Type
string
Description
Formula template used to resolve a label for Dynamic choice options of type Object.
quickReplyType	
Field Type
BotQuickReplyType (enumeration of type string)
Description
Values are:

Dynamic
Static
quickReplyWidgetType	
Field Type
BotWidgetType (enumeration of type string)
Description
Values are:

Buttons
Menu
retryMessages	
Field Type
BotMessage[]
Description
In Conversation Repair, the messages assigned to repair attempts. Available in API version 48.0 and later.
sourceVariableName	
Field Type
string
Description
Name of the source VariableName used in the variable operation. Available in API version 47.0 and later.
sourceVariableType	
Field Type
ConversationVariableType (enumeration of type string)
Description
This name defines the data type of VariableName used in the variable operation.
Values are:

ContextVariable
ConversationVariable
PageContextVariable
successMessages	
Field Type
BotMessage[]
Description
In a File dialog step, the message displayed to the customer as part of type CollectAttachment to confirm a successful file upload. Available in API version 57.0 and later.
type	
Field Type
BotVariableOperationType (enumeration of type string)
Description
Required.

Values are:

Collect
CollectAttachment (Available in API version 57.0 and later.)
Set
SetConversationLanguage (Available in API version 53.0 and later.)
Unset
variableOperationIdentifier	
Field Type
string
Description
A unique key that identifies a variable operation within a dialog. It is used to link translated labels to labels within the variable operation. This field is recommended for all variable operation records and is required for translated variable operation labels. Available in API version 53.0 and later.
If a variable operation is created via the UI, the variableOperationIdentifier is automatically generated. If a variable operation is created via API, the variableOperationIdentifier must be provided. variableOperationIdentifier can contain letters, numbers, dashes, and underscores, up to 255 characters.

BotQuickReplyOption
List of static choice options used by a bot variable operation of type Collect and quickReplyType of Static.

Field Name	Description
literalValue	
Field Type
string
Description
Required.

Value to be displayed as a menu or button choice to your customer.
quickReplyOptionIdentifier	
Field Type
string
Description
A unique key that identifies a quick reply option within a dialog. It is used to link translated labels to labels within the quick reply option. This field is recommended for all quick reply option records and is required for translated quick reply option labels. Available in API version 53.0 and later.
If a quick reply option is created via the UI, the quickReplyOptionIdentifier is automatically generated. If a message is created via API, the quickReplyOptionIdentifier must be provided. quickReplyOptionIdentifier can contain letters, numbers, dashes, and underscores, up to 255 characters.

BotVariableOperand
List of bot variable operands associated with a bot variable of type Set or Unset.

Field Name	Description
disableAutoFill	
Field Type
boolean
Description
Disables auto-fill behavior for a bot variable under a bot variable operation of type Collect.
sourceName	
Field Type
string
Description
Name of the source CustomField or MlSlotClass used in the variable operation.
sourceType	
Field Type
ConversationVariableOperandSourceType (enumeration of type string)
Description
Values are:

BotDefinition (Available in API version 46.0 and later.)
ContextVariable (Available in API version 45.0 and later.)
ConversationVariable
FlowDefinition (Available in API version 52.0 and later.)
MlSlotClass
Queue (Available in API version 46.0 and later.)
StandardConversationVariable
StandardMlSlotClass
Value
sourceValue	
Field Type
string
Description
Literal value used as the source for this variable operation.
targetName	
Field Type
string
Description
Required.

Name of the target variable used in the variable operation.
targetType	
Field Type
ConversationVariableType (enumeration of type string)
Description
Required.

Type of the target used in the variable operation.
Values are:

ContextVariable
ConversationVariable
PageContextVariable
ConversationRecordLookup
Information related to the linked conversation. Currently only works on Lightning Knowledge. Available in API version 46.0 and later.

Field Name	Description
SObjectType	
Field Type
string
Description
Required.

Specifies the SObjectType of the ID stored in a bot variable.
conditions	
Field Type
ConversationRecordLookupCondition[]
Description
The conditions associated with this lookup. Available in API version 51.0 and later.
filterLogic	
Field Type
string
Description
The logical operator that connects the conditions.
Values are:

And
Or
Available in API version 51.0 and later.
lookupFields	
Field Type
ConversationRecordLookupField[]
Description
Definition of the fields that are used for this lookup.
maxLookupResults	
Field Type
int
Description
Required.

The maximum number of records to return (1-3).
sortFieldName	
Field Type
string
Description
The name of the field used to sort the lookup results. Available in API version 51.0 and later.
sortOrder	
Field Type
SortOrder (enumeration of type string)
Description
The display order of the lookup results.
Values are:

Asc
Desc
Available in API version 51.0 and later.
sourceVariableName	
Field Type
string
Description
The input for this lookup operation.
sourceVariableType	
Field Type
ConversationVariableType (enumeration of type string)
Description
Type of the target used in the variable operation.
Values are:

ContextVariable
ConversationVariable
PageContextVariable
targetVariableName	
Field Type
string
Description
Required.

The variable that holds the results of this lookup.
ConversationRecordLookupCondition
List of conditions associated with a ConversationRecordLookup. Available in API version 51.0 and later.

Field Name	Description
leftOperand	
Field Type
string
Description
Required.

Field on which the condition operation takes place.
operatorType	
Field Type
string
Description
Required.

The operator applied to the leftOperand.
Values are:

Equals
NotEquals
IsSet
IsNotSet
GreaterThan
LessThan
GreaterThanOrEqualTo
LessThanOrEqualTo
rightOperandName	
Field Type
string
Description
The name of the variable to compare against.
rightOperandType	
Field Type
ConversationVariableType (enumeration of type string)
Description
The type of the variable to compare against.
Values are:

ContextVariable
ConversationVariable
PageContextVariable
rightOperandValue	
Field Type
string
Description
The custom value to compare against. This value is ignored when using IsSet and IsNotSet operators.
sortOrder	
Field Type
int
Description
Required.

Order in which the conditions are applied.
ConversationRecordLookupField
The fields used in a conversation record lookup. Available in API version 46.0 and later.

Field Name	Description
fieldName	
Field Type
string
Description
Required.

Defines the field names used in the Conversation Lookup function.
ConversationDefinitionStepGoalMapping
Represents the association between a goal and a BotStep. A goal can be associated with only one BotStep and one dialog at a time. Available in API version 57.0 and later.

Field Name	Description
goalName	
Field Type
string
Description
The API name of the goal.
ConversationSystemMessage
System messages that represent an action for a Bot Step, such as transferring to an agent or ending a chat. Available in API version 46.0 and later.

Field Name	Description
systemMessageMappings	
Field Type
ConversationSystemMessageMapping
Description
Defines the type of system message to be sent.
type	
Field Type
ConversationSystemMessageType (enumeration of type string)
Description
Required.

This field defines the values available for a system message.
Values are:

EndChat
Transfer
ConversationSystemMessageMapping
List of mappings that indicate additional information provided for the system message. Available in API version 46.0 and later.

Field Name	Description
mappingType	
Field Type
ConversationMappingType (enumeration of type string)
Description
Required.

Defines the type of mapping used in the record.
Values are:

Input
Output
parameterType	
Field Type
ConversationSystemMessageParamType (enumeration of type string)
Description
Required.

Defines the type of parameter the value is mapped to.
Values are:

Transfer
variableName	
Field Type
string
Description
Required.

Name of the variable that contains the value passed to the system message.
ConversationDefinitionRichMessage
Represents the configuration details for referencing a messaging component, such as an enhanced link. Available in API version 54.0 and later.

Field Name	Description
messageDefinitionMappings	
Field Type
BotInvocationMapping[]
Description
List of mappings for referencing a messaging component. Includes any input parameters and their values. Optionally, specifies the conversation variable for storing any outputs.
Input parameter values can be either static values or references to conversation or context variables.

messageDefinitionName	
Field Type
string
Description
Required.

The API name of the messaging component referenced by the bot.
ConversationDefinitionGoal
A goal included in the bot version. Available in API version 57.0 and later.

Field Name	Description
developerName	
Field Type
string
Description
Required.

A unique name that prevents conflicts with other goals associated with the same bot version. This name can contain only underscores and alphanumeric characters. It must begin with a letter, not include spaces, not end with an underscore, and not contain two consecutive underscores.
label	
Field Type
string
Description
Required.

A label that identifies the goal throughout the Salesforce user interface. This label can contain only underscores and alphanumeric characters. It must begin with a letter, not include spaces, not end with an underscore, and not contain two consecutive underscores.
ConversationDefinitionPlanner
Represents the API name for the Agent planner service. Available in API version 60.0 and later.

Field Name	Description
genAiPlannerName	
Field Type
string
Description
The name of an agent planner service that uses a large language model (LLM) and a reasoning strategy to decompose a given task into smaller subtasks, identify the most suitable actions for each subtask, and invoke them.
ConversationSystemDialog
A system function assigned to a dialog. Available in API version 48.0 and later.

Field Name	Description
dialog	
Field Type
string
Description
The dialog name triggered when this system event fires.
type	
Field Type
ConversationSystemDialogType (enumeration of type string)
Description
The type of system event. Required. Valid values are:
Disambiguation (Reserved for Future Use)
DisambiguationFailed (Reserved for Future Use)
ErrorHandling
KnowledgeAction (Available in API version 60.0.)
KnowledgeFallback (Available in API version 51.0.)
TransferFailed
ConversationVariable
A container that stores a specific piece of data collected from the customer. You can use variables within dialog actions as both inputs and outputs. Available in API version 44.0 and later.

Field Name	Description
collectionType	
Field Type
ConversationVariableCollectionType (enumeration of type string)
Description
This field defines whether a variable is designated as a List Variable. Valid value is List.
dataType	
Field Type
ConversationVariableCollectionType (enumeration of type string)
Description
Required.

Valid values are:
Boolean
Currency
Date
DateTime
Id (available in API 45.0 and later.)
Object
Number
Text
description	
Field Type
string
Description
A description of this variable. This value may be used by the Agentforce planner service. Available in API version 63.0 and later.

developerName	
Field Type
string
Description
Required.

This name can contain only underscores and alphanumeric characters and must be unique in your org. It must begin with a letter, not include spaces, not end with an underscore, and not contain two consecutive underscores. Only users with View DeveloperName OR View Setup and Configuration permission can view, group, sort, and filter this field.
includeInPrompt	
Field Type
boolean
Description
Indicates whether the variable is injected into the prompt sent to the Agentforce model. If true, the variable appears in the Included Fields section of the UI.
Note

The default variables Id, EndUserId, and EndUserLanguage always appear in the Included Fields section of the UI, regardless of their value of includeInPrompt. We recommend that you don't change the value of includeInPrompt for these default variables, as changing the value can prevent your agent from accessing important session data.

Available in API version 63.0 and later.
label	
Field Type
string
Description
Required.

Label that identifies a variable throughout the Salesforce user interface.
SObjectType	
Field Type
string
Description
Specifies the SObjectType of the ID stored in a bot variable. Valid values are:
BotDefinition
Queue
visibility	
Field Type
ConversationVariableVisibilityType (enumeration of type string)
Description
Required. Determines which components can set this variable. If the visibility is internal, the variable can only be set by action outputs. If the visibility is external, the variable can also be set by the API.

Valid values are:
internal
external
ConversationDefinitionNlpProvider
Defines the natural language service that is used for the language assigned to a bot version. Available in API version 49.0 and later.

Field Name	Description
language	
Field Type
Language
Description
Required.

The language assigned to a bot version.
nlpProviderName	
Field Type
string
Description
If nlpProviderType is EinsteinAI, this field is blank. If Apex, this field holds the Apex class name of the service.
nlpProviderType	
Field Type
ConversationDefinitionNlpProviderType (enumeration of type string)
Description
Required.

Default value is EinsteinAi. Valid values are:
EinsteinAi
Apex
Declarative Metadata Sample Definition
The following is an example of a BotVersion.

<?xml version="1.0" encoding="UTF-8"?>
<Bot xmlns="http://soap.sforce.com/2006/04/metadata">
    <botMlDomain>
        <label>Astros Pizza</label>
        <mlIntents>
            <developerName>New_Order</developerName>
            <label>New Order</label>
            <mlIntentUtterances>
                <utterance>Today is pie day so I want pie</utterance>
            </mlIntentUtterances>
        </mlIntents>
        <mlSlotClasses>
            <developerName>Size</developerName>
            <extractionType>Value</extractionType>
            <label>Size</label>
            <mlSlotClassValues>
                <synonymGroup>
                    <languages>en_US</languages>
                    <terms>Big</terms>
                    <terms>Extra Large</terms>
                    <terms>X-Large</terms>
                    <terms>Grande</terms>
                    <terms>Huge</terms>
                </synonymGroup>
                <value>Large</value>
            </mlSlotClassValues>
        </mlSlotClasses>
        <name>Astros_Pizza_ld1</name>
    </botMlDomain>
    <botVersions>
        <fullName>v1</fullName>
        <botDialogGroups>
            <developerName>Order_Management</developerName>
            <label>Order Management</label>
        </botDialogGroups>
        <botDialogs>
            <botDialogGroup>Order_Management</botDialogGroup>
            <botSteps>
                <botMessages>
                    <message>🍕🍕🍕Pizza Time! 🍕🍕🍕</message>
                    <messageIdentifier>Greeting_Message</messageIdentifier>
                </botMessages>
                <stepIdentifier>Greeting</stepIdentifier>
                <type>Message</type>
            </botSteps>
            <botSteps>
                <botStepConditions>
                    <leftOperandName>Verified_User</leftOperandName>
                    <leftOperandType>ConversationVariable</leftOperandType>
                    <operatorType>Equals</operatorType>
                    <rightOperandValue>false</rightOperandValue>
                </botStepConditions>
                <botSteps>
                    <botNavigation>
                        <botNavigationLinks>
                            <targetBotDialog>Customer_Verification</targetBotDialog>
                        </botNavigationLinks>
                        <type>Call</type>
                    </botNavigation>
                    <stepIdentifier>Call_Customer_Verification</stepIdentifier>
                    <type>Navigation</type>
                </botSteps>
                <stepIdentifier>Verify_User</stepIdentifier>
                <type>Group</type>
            </botSteps>
            <botSteps>
                <botStepConditions>
                    <leftOperandName>Location</leftOperandName>
                    <leftOperandType>ConversationVariable</leftOperandType>
                    <operatorType>IsNotSet</operatorType>
                </botStepConditions>
                <botSteps>
                    <botNavigation>
                        <botNavigationLinks>
                            <targetBotDialog>Select_Location</targetBotDialog>
                        </botNavigationLinks>
                        <type>Call</type>
                    </botNavigation>
                    <stepIdentifier>Call_Select_Location</stepIdentifier>
                    <type>Navigation</type>
                </botSteps>
                <stepIdentifier>Set_Location</stepIdentifier>
                <type>Group</type>
            </botSteps>
            <botSteps>
                <botVariableOperation>
                    <botInvocation>
                        <invocationActionName>CreateOrderService</invocationActionName>
                        <invocationActionType>apex</invocationActionType>
                        <invocationMappings>
                            <parameterName>customer</parameterName>
                            <type>Input</type>
                            <variableName>Contact</variableName>
                            <variableType>ConversationVariable</variableType>
                        </invocationMappings>
                        <invocationMappings>
                            <parameterName>location</parameterName>
                            <type>Input</type>
                            <variableName>Location</variableName>
                            <variableType>ConversationVariable</variableType>
                        </invocationMappings>
                        <invocationMappings>
                            <parameterName>output</parameterName>
                            <type>Output</type>
                            <variableName>Pizza_Order</variableName>
                            <variableType>ConversationVariable</variableType>
                        </invocationMappings>
                    </botInvocation>
                    <type>Set</type>
                    <variableOperationIdentifier>Set_Order</variableOperationIdentifier>
                </botVariableOperation>
                <stepIdentifier>Create_Order</stepIdentifier>
                <type>VariableOperation</type>
            </botSteps>
            <botSteps>
                <botMessages>
                    <message>Perfect, let&apos;s work on your order from our {!Location.Name} location</message>
                    <messageIdentifier>Start_Order_Message</messageIdentifier>
                </botMessages>
                <stepIdentifier>Start_Order</stepIdentifier>
                <type>Message</type>
            </botSteps>
            <botSteps>
                <messageDefinition>
                    <messageDefinitionName>Astros_Pizza_Menu</messageDefinitionName>
                </messageDefinition>
                <stepIdentifier>36e5a7cb-50c4-4279-aa06-1217eba1bf62</stepIdentifier>
                <type>RichMessage</type>
            </botSteps>
            <botSteps>
                <botNavigation>
                    <botNavigationLinks>
                        <targetBotDialog>Add_Items_to_Order</targetBotDialog>
                    </botNavigationLinks>
                    <type>Redirect</type>
                </botNavigation>
                <stepIdentifier>Proceed_To_Add_Items</stepIdentifier>
                <type>Navigation</type>
            </botSteps>
            <developerName>New_Order</developerName>
            <label>New Order</label>
            <mlIntent>New_Order</mlIntent>
            <showInFooterMenu>false</showInFooterMenu>
        </botDialogs>
        <conversationVariables>
            <dataType>Object</dataType>
            <developerName>Contact</developerName>
            <label>Contact</label>
        </conversationVariables>
        <conversationVariables>
            <dataType>Text</dataType>
            <developerName>Delivery_Address</developerName>
            <label>Delivery Address</label>
        </conversationVariables>
        <conversationVariables>
            <dataType>Object</dataType>
            <developerName>Pizza_Order</developerName>
            <label>Pizza Order</label>
        </conversationVariables>
        <entryDialog>Welcome</entryDialog>
        <mainMenuDialog>Main_Menu</mainMenuDialog>
    </botVersions>
    <label>Astro&apos;s Pizza</label>
</Bot>
The following is an example package.xml that references the previous definition.

<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>Astros Pizza_Bot.v1</members>
        <name>BotVersion</name>
    </types>
    <version>45.0</version>
</Package>
Wildcard Support in the Manifest File
This metadata type doesn’t support the wildcard character * (asterisk) in the package.xml manifest file. For information about using the manifest file, see Deploying and Retrieving Metadata with the Zip File.