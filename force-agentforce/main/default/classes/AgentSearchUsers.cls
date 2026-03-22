/**
 * AgentSearchUsers - Agentforce invocable action to search for active users
 * by name or email.
 */
public with sharing class AgentSearchUsers {
    public class Request {
        @InvocableVariable(
            required=true
            description='Search term to match against user name or email'
        )
        public String searchTerm;
    }

    public class Response {
        @InvocableVariable(
            description='JSON array of matching users: [{id, name, email}]'
        )
        public String users;
        @InvocableVariable(description='Total number of users found')
        public Integer totalFound;
        @InvocableVariable(description='Status or error message')
        public String message;
    }

    @InvocableMethod(
        label='Search Users'
        description='Searches for active users by name or email'
    )
    public static List<Response> execute(List<Request> requests) {
        List<Response> responses = new List<Response>();
        for (Request req : requests) {
            responses.add(searchUsers(req));
        }
        return responses;
    }

    private static Response searchUsers(Request req) {
        Response res = new Response();
        try {
            String searchPattern =
                '%' +
                String.escapeSingleQuotes(req.searchTerm) +
                '%';
            List<User> matchedUsers = [
                SELECT Id, Name, Email
                FROM User
                WHERE
                    (Name LIKE :searchPattern
                    OR Email LIKE :searchPattern)
                    AND IsActive = TRUE
                WITH USER_MODE
                ORDER BY Name ASC
                LIMIT 50
            ];

            List<Map<String, Object>> userList = new List<Map<String, Object>>();
            for (User u : matchedUsers) {
                Map<String, Object> userMap = new Map<String, Object>();
                userMap.put('id', u.Id);
                userMap.put('name', u.Name);
                userMap.put('email', u.Email);
                userList.add(userMap);
            }

            res.users = JSON.serialize(userList);
            res.totalFound = matchedUsers.size();
            res.message = matchedUsers.isEmpty()
                ? 'No active users found matching: ' + req.searchTerm
                : 'Found ' +
                  matchedUsers.size() +
                  ' user(s) matching: ' +
                  req.searchTerm;
        } catch (Exception e) {
            res.message = 'Error searching users: ' + e.getMessage();
        }
        return res;
    }
}
