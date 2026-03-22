GenAiPlanner
Represents a planner for an agent. It’s a container for all the topics and actions used to interact with a large language model (LLM).
Parent Type
This type extends the Metadata metadata type and inherits its fullName field.
File Suffix and Directory Location
GenAiPlanner components have the suffix .genAiPlanner and are stored in the genAiPlanners folder.

Version
GenAiPlanner components are available in API version 60.0 to 63.0. GenAiPlannerBundle replaces GenAiPlanner in API version 64.0 and later.

Special Access Rules
GenAiPlanner is available only if Agents is enabled in your org.

Fields
Field Name	Description
attributeMappings	
Field Type
GenAiPlannerAttrMapping[]
Description
A list of action attribute mappings.

capabilities	
Field Type
string
Description
A set of tags associated with the agent.

description	
Field Type
string
Description
A description explaining the general purpose and domain of the agent.
genAiFunctions	
Field Type
GenAiPlannerFunctionDef[]
Description
A list of agent action definitions, such as a knowledge action, that are not contained in a topic.
genAiPlannerRuleExpressions	
Field Type
GenAiPlannerRuleExpr[]
Description
Deprecated. Use ruleExpressions instead.
genAiPlugins	
Field Type
GenAiPlannerFunctionDef[]
Description
A list of agent topic definitions.
masterLabel	
Field Type
string
Description
Required. The master label for the planner.

plannerType	
Field Type
PlannerType (enumeration of type string)
Description
Required. A particular approach to problem solving that is given as prompt instructions to a large language model (LLM).

The only supported value is:

AiCopilot__ReAct—Uses a reactive reasoning strategy to solve problems with the LLM. This strategy consists of prompting the LLM to generate the next step in response to an event and the current context. It differs from a sequential reasoning engine in that it doesn’t plan more than one step ahead of time.
ruleExpressionAssignments	
Field Type
GenAiPlannerRuleExprAsgn[]
Description
A list of rule expression assignments.
ruleExpressions	
Field Type
GenAiPlannerRuleExprDef[]
Description
A list of rule expressions.
GenAiPlannerAttrMapping
Represents an attribute mapping, which enables you to map the output of one action attribute to the input of another attribute. This mapping enables you to propagate sensitive data safely without relying on untrusted user input.

Field Name	Description
attributeName	
Field Type
string
Description
Required. The attribute name in the format: Namespace.TopicName.ActionName.AttributeName.

attributeType	
Field Type
AttributeType (enumeration of type string)
Description
Required. The attribute type. Values are:

CustomPluginFunctionAttribute—Map to a custom action input or output
StandardPluginFunctionInput—Map to a standard action input
StandardPluginFunctionOutput—Map output to a variable
constantValue	
Field Type
string
Description
Reserved for future use.

mappingTargetName	
Field Type
string
Description
The target name for the attribute mapping.

mappingType	
Field Type
AttributeMappingType (enumeration of type string)
Description
Required. The target type. Values are:

ActionAttribute
Constant
Variable
ContextVariable
GenAiPlannerFunctionDef
Represents an agent topic or action definition.

Field Name	Description
genAiCustomizedPlugin	
Field Type
GenAiLocalPlugin[]
Description
A list of custom agent topics.

genAiFunctionName	
Field Type
string
Description
The name of the agent action.

genAiPluginName	
Field Type
string
Description
The name of the agent topic.

GenAiLocalPlugin
Represents a custom agent topic.

Field Name	Description
aiPluginUtterances	
Field Type
AiPluginUtteranceDef[]
Description
A list of utterances that can be used to pick a topic during runtime.
description	
Field Type
string
Description
The description of the topic.
genAiFunctions	
Field Type
GenAiPluginFunctionDef[]
Description
A list of functions in the topic.
genAiPluginInstructions	
Field Type
GenAiPluginInstructionDef[]
Description
A list of instructions in the topic.
language	
Field Type
string
Description
Required.

The language of the topic.
masterLabel	
Field Type
string
Description
Required.

The master label for the topic.
name	
Field Type
string
Description
Required.

Represents the API name of the topic. This name must be unique across all custom and customized topics. Can contain only underscores and alphanumeric characters and must be unique in your org. It must begin with a letter, not include spaces, not end with an underscore, and not contain two consecutive underscores.
pluginType	
Field Type
PluginType (enumeration of type string)
Description
Required.

Values are:

Topic
scope	
Field Type
string
Description
A specific job description for a topic.
GenAiPlannerRuleExprAsgn
Represents a rule-expression assignment to either a topic or an action.

Field Name	Description
ruleExpressionName	
Field Type
string
Description
Required. The name of the rule expression.

targetName	
Field Type
string
Description
Required. The target of the assignment, which is a Namespace.TopicName.ActionName or a TopicName.

targetType	
Field Type
string
Description
Required. The type of the target. Values are:

Function—A knowledge action
Plugin—A topic
PluginFunction—An action in a topic
GenAiPlannerRuleExprDef
Represents a rule expression, which conditionally locks or unlocks topics and actions based on defined security criteria.

Field Name	Description
conditions	
Field Type
GenAiPlannerRuleExprCondition[]
Description
A list of conditions for a rule expression.

expression	
Field Type
string
Description
An expression with the combined conditions.

expressionLabel	
Field Type
string
Description
Required. The expression label.
expressionName	
Field Type
string
Description
Required. The expression name.
expressionType	
Field Type
string
Description
The expression type. Values are:
handlebars—Reserved for future use
sel—Salesforce Expression Language, as used in formula fields
GenAiPlannerRuleExprCondition
Represents a condition for a rule expression.

Field Name	Description
leftOperand	
Field Type
string
Description
Required. The left operand in the expression.

leftOperandType	
Field Type
GenAiAgentVariableType (enumeration of type string)
Description
Required. The type for the left operand. Values are:
Variable
ContextVariable
Attribute
operator	
Field Type
GenAiRuleExpressionOperator (enumeration of type string)
Description
Required. The operator in the expression. Values are:
equal
greaterThan
greaterThanOrEqual
lessThan
lessThanOrEqual
notEqual
isEmpty
isNotEmpty
rightOperandValue	
Field Type
string
Description
The value for the right operand.
Declarative Metadata Sample Definition
The following is an example of a GenAiPlanner component.

<?xml version="1.0" encoding="UTF-8"?>
<GenAiPlanner xmlns="http://soap.sforce.com/2006/04/metadata">
    <description>Copilot reasoning engine description</description>
    <masterLabel>EmployeeCopilotPlanner</masterLabel>
    <plannerType>AiCopilot__SequentialPlannerIntentClassifier</plannerType>
</GenAiPlanner>
The following is an example package.xml that references the previous definition.

<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
   <types>
      <members>*</members>
      <name>GenAiPlanner</name>
   </types>
   <version>60.0</version>
</Package>
Wildcard Support in the Manifest File
This metadata type supports the wildcard character * (asterisk) in the package.xml manifest file. For information about using the manifest file, see Deploying and Retrieving Metadata with the Zip File.