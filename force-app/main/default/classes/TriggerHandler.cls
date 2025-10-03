/**
 * TriggerHandler - Base class for all trigger handlers
 * Provides a framework for handling trigger events with proper recursion control
 */
public virtual class TriggerHandler {
    
    // Static map to track recursion for each handler
    private static Map<String, Boolean> bypassMap = new Map<String, Boolean>();
    private static Map<String, Integer> executionCountMap = new Map<String, Integer>();
    
    // Instance properties
    protected String handlerName;
    protected Integer maxLoopCount = 5;
    
    // Trigger context properties (set by dispatcher)
    protected Boolean isBefore;
    protected Boolean isAfter;
    protected Boolean isInsert;
    protected Boolean isUpdate;
    protected Boolean isDelete;
    protected Boolean isUndelete;
    protected List<SObject> newList;
    protected List<SObject> oldList;
    protected Map<Id, SObject> newMap;
    protected Map<Id, SObject> oldMap;
    
    /**
     * Constructor
     */
    public TriggerHandler() {
        this.handlerName = String.valueOf(this).substring(0, String.valueOf(this).indexOf(':'));
        
        // Initialize execution count
        if (!executionCountMap.containsKey(this.handlerName)) {
            executionCountMap.put(this.handlerName, 0);
        }
    }
    
    /**
     * Main entry point - called from trigger
     */
    public void execute() {
        // Check if bypassed
        if (isBypassed()) {
            return;
        }
        
        // Check max loop count
        if (getExecutionCount() >= this.maxLoopCount) {
            throw new TriggerHandlerException('Maximum loop count of ' + this.maxLoopCount + ' reached for ' + this.handlerName);
        }
        
        // Increment execution count
        incrementExecutionCount();
        
        // Execute trigger logic based on context
        if (this.isBefore) {
            if (this.isInsert) {
                this.beforeInsert();
            } else if (this.isUpdate) {
                this.beforeUpdate();
            } else if (this.isDelete) {
                this.beforeDelete();
            }
        } else if (this.isAfter) {
            if (this.isInsert) {
                this.afterInsert();
            } else if (this.isUpdate) {
                this.afterUpdate();
            } else if (this.isDelete) {
                this.afterDelete();
            } else if (this.isUndelete) {
                this.afterUndelete();
            }
        }
    }
    
    /**
     * Set trigger context - called before execute()
     */
    public void setTriggerContext(
        Boolean isBefore,
        Boolean isAfter,
        Boolean isInsert,
        Boolean isUpdate,
        Boolean isDelete,
        Boolean isUndelete,
        List<SObject> newList,
        List<SObject> oldList,
        Map<Id, SObject> newMap,
        Map<Id, SObject> oldMap
    ) {
        this.isBefore = isBefore;
        this.isAfter = isAfter;
        this.isInsert = isInsert;
        this.isUpdate = isUpdate;
        this.isDelete = isDelete;
        this.isUndelete = isUndelete;
        this.newList = newList;
        this.oldList = oldList;
        this.newMap = newMap;
        this.oldMap = oldMap;
    }
    
    /**
     * Virtual methods to be overridden by child classes
     */
    protected virtual void beforeInsert() {}
    protected virtual void beforeUpdate() {}
    protected virtual void beforeDelete() {}
    protected virtual void afterInsert() {}
    protected virtual void afterUpdate() {}
    protected virtual void afterDelete() {}
    protected virtual void afterUndelete() {}
    
    /**
     * Bypass methods
     */
    public static void bypass(String handlerName) {
        bypassMap.put(handlerName, true);
    }
    
    public static void clearBypass(String handlerName) {
        bypassMap.remove(handlerName);
    }
    
    public static void clearAllBypasses() {
        bypassMap.clear();
    }
    
    public Boolean isBypassed() {
        return bypassMap.containsKey(this.handlerName) && bypassMap.get(this.handlerName);
    }
    
    /**
     * Execution count methods for recursion control
     */
    private Integer getExecutionCount() {
        return executionCountMap.get(this.handlerName);
    }
    
    private void incrementExecutionCount() {
        Integer count = getExecutionCount();
        executionCountMap.put(this.handlerName, count + 1);
    }
    
    public static void resetExecutionCount(String handlerName) {
        executionCountMap.put(handlerName, 0);
    }
    
    /**
     * Custom exception
     */
    public class TriggerHandlerException extends Exception {}
}
