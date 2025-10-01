// Create or update a test user with static credentials
String username = 'alexadmin@test.com';
String firstName = 'Alex';
String lastName = 'Admin';
String alias = 'alexadm';
String email = 'support@opensf.foundation';

// Check if user already exists
List<User> existingUsers = [SELECT Id, Username, IsActive FROM User WHERE Username = :username LIMIT 1];

User testUser;
Boolean userCreated = false;

if (existingUsers.isEmpty()) {
    // Get System Administrator profile
    Profile adminProfile = [SELECT Id FROM Profile WHERE Name = 'System Administrator' LIMIT 1];
    
    // Create new user
    testUser = new User(
        Username = username,
        Email = email,
        LastName = lastName,
        FirstName = firstName,
        Alias = alias,
        TimeZoneSidKey = 'America/Los_Angeles',
        LocaleSidKey = 'en_US',
        EmailEncodingKey = 'UTF-8',
        LanguageLocaleKey = 'en_US',
        ProfileId = adminProfile.Id
    );
    
    insert testUser;
    userCreated = true;
    System.debug('USER_CREATED:' + testUser.Id);
} else {
    testUser = existingUsers[0];
    
    // Update email if different
    if (testUser.Email != email) {
        testUser.Email = email;
    }
    
    // Reactivate user if inactive
    if (!testUser.IsActive) {
        testUser.IsActive = true;
    }
    
    // Update if any changes were made
    if (testUser.Email != existingUsers[0].Email || !testUser.IsActive) {
        update testUser;
        System.debug('USER_UPDATED:' + testUser.Id);
    } else {
        System.debug('USER_EXISTS:' + testUser.Id);
    }
}

System.debug('USER_FINAL_ID:' + testUser.Id);
