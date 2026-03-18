#!/usr/bin/env node

const { execSync } = require('child_process');

// Static test user credentials
const TEST_USERNAME = 'alexadmin@test.com';
const TEST_EMAIL = 'support@opensf.foundation';
const PERMSET_NAME = 'Alex_Admin';

/**
 * Execute Salesforce CLI command and return JSON result
 */
function executeSfCommand(command) {
    try {
        const result = execSync(command, { encoding: 'utf-8' });
        return JSON.parse(result);
    } catch (error) {
        console.error(`Command Failed: ${command}`);
        console.error(`Error: ${error.message}`);
        return null;
    }
}

/**
 * Get the default Salesforce org information
 */
function getDefaultOrg() {
    console.log('Getting default org information...');
    const result = executeSfCommand('sf org display --json');

    if (!result) {
        console.error('Error: Could not determine the default org.');
        return null;
    }

    const { username, id: orgId, instanceUrl } = result.result;

    if (!username) {
        console.error('Error: Default org username not found.');
        return null;
    }

    console.log(`Connected to org: ${username}`);
    return { username, orgId, instanceUrl };
}

/**
 * Check if user already exists
 */
function checkUserExists(targetOrg) {
    console.log('Checking for existing user...');

    const query = `SELECT Id, Username FROM User WHERE Username = '${TEST_USERNAME}' LIMIT 1`;
    const result = executeSfCommand(
        `sf data query --query "${query}" --target-org ${targetOrg} --json`
    );

    if (!result) {
        return null;
    }

    const records = result.result?.records || [];

    if (records.length > 0) {
        const userId = records[0].Id;
        console.log(`User exists: ${TEST_USERNAME} (ID: ${userId})`);
        return { userId, status: 'EXISTS' };
    }

    return null;
}

/**
 * Create a new test user
 */
function createTestUser(targetOrg) {
    console.log(`Creating new user: ${TEST_USERNAME}...`);

    const command =
        `sf org create user ` +
        `username=${TEST_USERNAME} ` +
        `email=${TEST_EMAIL} ` +
        `LastName=Admin ` +
        `FirstName=Alex ` +
        `Alias=alexadm ` +
        `profileName="System Administrator" ` +
        `generatepassword=true ` +
        `--target-org ${targetOrg} --json`;

    const result = executeSfCommand(command);

    if (!result) {
        console.error('Error: Failed to create user.');
        return null;
    }

    const resultData = result.result || {};
    const userId = resultData.fields?.id || resultData.userId;

    if (!userId) {
        console.error('Error: Failed to retrieve user ID after creation.');
        console.error('Response:', JSON.stringify(result, null, 2));
        return null;
    }

    console.log(`User created: ${TEST_USERNAME} (ID: ${userId})`);
    return { userId, status: 'CREATED' };
}

/**
 * Create or get test user
 */
function createOrGetTestUser(targetOrg) {
    // Check if user exists
    const existing = checkUserExists(targetOrg);
    if (existing) {
        return existing;
    }

    // Create new user
    return createTestUser(targetOrg);
}

/**
 * Check if permission set is already assigned
 */
function checkPermissionSetAssigned(username, permsetName, targetOrg) {
    const query = `SELECT Id FROM PermissionSetAssignment WHERE PermissionSet.Name = '${permsetName}' AND Assignee.Username = '${username}' LIMIT 1`;
    const result = executeSfCommand(
        `sf data query --query "${query}" --target-org ${targetOrg} --json`
    );

    if (!result) {
        return false;
    }

    const records = result.result?.records || [];
    return records.length > 0;
}

/**
 * Assign permission set to user
 */
function assignPermissionSet(username, permsetName, targetOrg) {
    // Check if already assigned
    if (checkPermissionSetAssigned(username, permsetName, targetOrg)) {
        console.log(`Permission set '${permsetName}' already assigned!`);
        return true;
    }

    console.log(`Assigning permission set '${permsetName}'...`);

    const command = `sf org assign permset --name ${permsetName} --on-behalf-of ${username} --target-org ${targetOrg}`;

    try {
        execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
        console.log('Permission set assigned successfully!');
        return true;
    } catch (error) {
        const errorMsg = error.message || '';
        // Don't fail if permission set already assigned
        if (
            errorMsg.includes('DUPLICATE') ||
            errorMsg.toLowerCase().includes('already')
        ) {
            console.log('Permission set already assigned!');
            return true;
        }
        console.error(`Warning: Could not assign permission set: ${errorMsg}`);
        return false;
    }
}

/**
 * Generate password for user
 */
function generatePassword(username, targetOrg) {
    console.log('Generating password for user...');

    const command = `sf org generate password --on-behalf-of ${username} --target-org ${targetOrg} --length 16 --complexity 5 --json`;
    const result = executeSfCommand(command);

    if (!result) {
        console.log(
            'Note: Password generation only works for scratch org users.'
        );
        return null;
    }

    const password = result.result?.password;

    if (password) {
        console.log('Password generated successfully!');
        return password;
    }

    console.log(
        'Warning: Password generation completed but password not returned.'
    );
    return null;
}

/**
 * Display user information
 */
function displayUserInfo(targetOrg) {
    const result = executeSfCommand(
        `sf org display user --target-org ${targetOrg} --json`
    );

    if (!result) {
        return null;
    }

    return result.result?.password || null;
}

/**
 * Verify permission set assignment
 */
function verifyPermissionSet(username, permsetName, targetOrg) {
    console.log('\nVerifying permission set assignment...');

    const query = `SELECT Assignee.Username, PermissionSet.Name FROM PermissionSetAssignment WHERE PermissionSet.Name = '${permsetName}' AND Assignee.Username = '${username}'`;
    const result = executeSfCommand(
        `sf data query --query "${query}" --target-org ${targetOrg} --json`
    );

    if (!result) {
        return false;
    }

    const assignments = result.result?.records || [];
    return assignments.length > 0;
}

/**
 * Print success summary
 */
function printSummary(
    username,
    userId,
    instanceUrl,
    password,
    permsetAssigned
) {
    const loginUrl = instanceUrl || 'https://login.salesforce.com';

    console.log('\n' + '='.repeat(80));
    console.log('✓ TEST USER CONFIGURED SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log(`Username: ${username}`);
    console.log(`Email:    ${TEST_EMAIL}`);
    console.log(`User ID:  ${userId}`);
    console.log(
        `Permission Set: ${PERMSET_NAME} ${permsetAssigned ? '✓ ASSIGNED' : '✗ NOT ASSIGNED'}`
    );

    if (password) {
        console.log();
        console.log(`Password: ${password}`);
        console.log();
        console.log(`Login URL: ${loginUrl}`);
        console.log();
        console.log('⚠️  IMPORTANT: Save this password securely!');
        console.log('   This password is only shown once at generation time.');
    } else {
        console.log();
        console.log(
            'Note: Password not available (only works for scratch org users)'
        );
        console.log('For non-scratch orgs, reset password in Setup > Users');
        console.log(`Password reset email will be sent to ${TEST_EMAIL}`);
        console.log();
        console.log(`Login URL: ${loginUrl}`);
    }

    console.log('='.repeat(80));
}

/**
 * Main execution
 */
function main() {
    console.log('Setting up test user...\n');

    // Get the default org
    const orgInfo = getDefaultOrg();
    if (!orgInfo) {
        process.exit(1);
    }

    const { username: targetOrg, instanceUrl } = orgInfo;

    // Create or get the test user
    const userInfo = createOrGetTestUser(targetOrg);
    if (!userInfo) {
        console.error('Failed to create/update test user.');
        process.exit(1);
    }

    const { userId } = userInfo;

    // Assign the Alex_Admin permission set
    const permsetSuccess = assignPermissionSet(
        TEST_USERNAME,
        PERMSET_NAME,
        targetOrg
    );

    // Generate password for the user
    console.log();
    let password = generatePassword(TEST_USERNAME, targetOrg);

    // If password generation failed, try to retrieve existing password
    if (!password) {
        password = displayUserInfo(targetOrg);
    }

    // Verify permission set assignment
    const permsetAssigned = verifyPermissionSet(
        TEST_USERNAME,
        PERMSET_NAME,
        targetOrg
    );

    // Print summary
    printSummary(TEST_USERNAME, userId, instanceUrl, password, permsetAssigned);
}

// Run the script
main();
