/**
 * TriggerContext - Stores context information for triggers
 * Used to pass clientRequestId from Apex methods to trigger handlers
 */
public without sharing class TriggerContext {
    // Thread-local storage for client request IDs
    // Map of record ID -> client request ID
    private static Map<Id, String> clientRequestIds = new Map<Id, String>();

    /**
     * Set client request ID for a record
     */
    public static void setClientRequestId(Id recordId, String clientRequestId) {
        if (recordId != null && String.isNotBlank(clientRequestId)) {
            clientRequestIds.put(recordId, clientRequestId);
        }
    }

    /**
     * Get client request ID for a record
     */
    public static String getClientRequestId(Id recordId) {
        return clientRequestIds.get(recordId);
    }

    /**
     * Check if record has a client request ID
     */
    public static Boolean hasClientRequestId(Id recordId) {
        return clientRequestIds.containsKey(recordId);
    }

    /**
     * Clear client request ID for a record
     */
    public static void clearClientRequestId(Id recordId) {
        clientRequestIds.remove(recordId);
    }

    /**
     * Clear all client request IDs (call at end of transaction)
     */
    public static void clearAll() {
        clientRequestIds.clear();
    }
}
