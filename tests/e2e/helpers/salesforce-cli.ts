import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

/**
 * Salesforce CLI wrapper for managing scratch orgs for E2E testing
 */
export class SalesforceCLI {
    private orgAlias: string;
    private configFile: string;

    // Apex script templates
    private readonly CREATE_BOARD_TEMPLATE = `// Create a test board with columns
OpenSF__Board__c board = new OpenSF__Board__c(
    Name = '{{BOARD_NAME}}'
);
insert board;

List<OpenSF__Column__c> columns = new List<OpenSF__Column__c>();
{{COLUMNS}}
insert columns;

System.debug('BOARD_ID:' + board.Id);`;

    private readonly DELETE_BOARD_TEMPLATE = `// Delete a specific board by ID
OpenSF__Board__c board = [
    SELECT Id
    FROM OpenSF__Board__c
    WHERE Id = '{{BOARD_ID}}'
    LIMIT 1
];
delete board;
System.debug('Board deleted: {{BOARD_ID}}');`;

    constructor(
        orgAlias: string = 'playwright-test',
        configFile: string = 'config/project-scratch-def.json'
    ) {
        this.orgAlias = orgAlias;
        this.configFile = configFile;
    }

    /**
     * Check if SF CLI is installed
     */
    async isInstalled(): Promise<boolean> {
        try {
            await execAsync('sf --version');
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Create a new scratch org
     */
    async createScratchOrg(durationDays: number = 1): Promise<void> {
        console.log(`Creating scratch org with alias: ${this.orgAlias}...`);

        const command = `sf org create scratch --definition-file ${this.configFile} --alias ${this.orgAlias} --duration-days ${durationDays} --set-default --json`;

        try {
            const { stdout } = await execAsync(command);
            const result = JSON.parse(stdout);

            if (result.status === 0) {
                console.log('✅ Scratch org created successfully');
            } else {
                throw new Error(
                    `Failed to create scratch org: ${result.message}`
                );
            }
        } catch (error: any) {
            throw new Error(`Error creating scratch org: ${error.message}`);
        }
    }

    /**
     * Check if scratch org already exists
     */
    async scratchOrgExists(): Promise<boolean> {
        try {
            const { stdout } = await execAsync('sf org list --json');
            const result = JSON.parse(stdout);

            const scratchOrgs = result.result?.scratchOrgs || [];
            return scratchOrgs.some((org: any) => org.alias === this.orgAlias);
        } catch {
            return false;
        }
    }

    /**
     * Deploy metadata to scratch org
     */
    async deployMetadata(ignoreConflicts: boolean = false): Promise<void> {
        console.log(
            `Deploying metadata to scratch org${ignoreConflicts ? ' (ignoring conflicts)' : ''}...`
        );

        const conflictFlag = ignoreConflicts ? '--ignore-conflicts' : '';
        const command =
            `sf project deploy start --target-org ${this.orgAlias} ${conflictFlag} --json`.trim();

        try {
            const { stdout } = await execAsync(command, { timeout: 300000 }); // 5 min timeout
            const result = JSON.parse(stdout);

            if (result.status === 0) {
                console.log('✅ Metadata deployed successfully');
            } else {
                throw new Error(`Failed to deploy metadata: ${result.message}`);
            }
        } catch (error: any) {
            throw new Error(`Error deploying metadata: ${error.message}`);
        }
    }

    /**
     * Assign permission set to user
     */
    async assignPermissionSet(permSetName: string): Promise<void> {
        console.log(`Assigning permission set: ${permSetName}...`);

        const command = `sf org assign permset --name ${permSetName} --target-org ${this.orgAlias} --json`;

        try {
            const { stdout } = await execAsync(command);
            const result = JSON.parse(stdout);

            if (result.status === 0) {
                console.log('✅ Permission set assigned successfully');
            } else {
                console.warn(
                    `⚠️  Warning: Could not assign permission set: ${result.message}`
                );
            }
        } catch (error: any) {
            console.warn(
                `⚠️  Warning: Error assigning permission set: ${error.message}`
            );
        }
    }

    /**
     * Run Apex script to create test data
     */
    async runApexScript(scriptPath: string): Promise<void> {
        console.log(`Running Apex script: ${scriptPath}...`);

        if (!fs.existsSync(scriptPath)) {
            throw new Error(`Apex script not found: ${scriptPath}`);
        }

        const command = `sf apex run --file ${scriptPath} --target-org ${this.orgAlias} --json`;

        try {
            const { stdout } = await execAsync(command);
            const result = JSON.parse(stdout);

            if (result.status === 0) {
                console.log('✅ Apex script executed successfully');
            } else {
                throw new Error(`Failed to run Apex script: ${result.message}`);
            }
        } catch (error: any) {
            throw new Error(`Error running Apex script: ${error.message}`);
        }
    }

    /**
     * Get org info including instance URL and access token
     */
    async getOrgInfo(): Promise<{
        instanceUrl: string;
        accessToken: string;
        username: string;
    }> {
        const command = `sf org display --target-org ${this.orgAlias} --json`;

        try {
            const { stdout } = await execAsync(command);
            const result = JSON.parse(stdout);

            if (result.status === 0 && result.result) {
                return {
                    instanceUrl: result.result.instanceUrl,
                    accessToken: result.result.accessToken,
                    username: result.result.username
                };
            } else {
                throw new Error('Failed to get org info');
            }
        } catch (error: any) {
            throw new Error(`Error getting org info: ${error.message}`);
        }
    }

    /**
     * Open scratch org in browser
     */
    async openOrg(): Promise<void> {
        console.log('Opening scratch org in browser...');

        const command = `sf org open --target-org ${this.orgAlias}`;

        try {
            await execAsync(command);
            console.log('✅ Org opened in browser');
        } catch (error: any) {
            throw new Error(`Error opening org: ${error.message}`);
        }
    }

    /**
     * Delete scratch org
     */
    async deleteScratchOrg(): Promise<void> {
        console.log(`Deleting scratch org: ${this.orgAlias}...`);

        const command = `sf org delete scratch --target-org ${this.orgAlias} --no-prompt --json`;

        try {
            const { stdout } = await execAsync(command);
            const result = JSON.parse(stdout);

            if (result.status === 0) {
                console.log('✅ Scratch org deleted successfully');
            } else {
                console.warn(
                    `⚠️  Warning: Could not delete scratch org: ${result.message}`
                );
            }
        } catch (error: any) {
            console.warn(
                `⚠️  Warning: Error deleting scratch org: ${error.message}`
            );
        }
    }

    /**
     * Create test board and return its ID
     */
    async createTestBoard(): Promise<string> {
        console.log('Creating test board...');

        // Build column creation code
        const columnScript = `
columns.add(new OpenSF__Column__c(
    OpenSF__ColumnHeader__c = 'To Do',
    OpenSF__Board__c = board.Id,
    OpenSF__LexoRankPosition__c = '0|h00000:'
));
columns.add(new OpenSF__Column__c(
    OpenSF__ColumnHeader__c = 'In Progress',
    OpenSF__Board__c = board.Id,
    OpenSF__LexoRankPosition__c = '0|h55555:'
));
columns.add(new OpenSF__Column__c(
    OpenSF__ColumnHeader__c = 'Done',
    OpenSF__Board__c = board.Id,
    OpenSF__LexoRankPosition__c = '0|hzzzzz:'
));`;

        // Use inline template and update it with new values
        const apexScript = this.CREATE_BOARD_TEMPLATE.replace(
            '{{BOARD_NAME}}',
            'E2E Test Board'
        ).replace('{{COLUMNS}}', columnScript);

        // Write to a temp file for this execution
        const tempDir = path.join(process.cwd(), '.temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const tempFile = path.join(tempDir, `create-board-${Date.now()}.apex`);
        fs.writeFileSync(tempFile, apexScript);

        try {
            const command = `sf apex run --file ${tempFile} --target-org ${this.orgAlias}`;
            const { stdout, stderr } = await execAsync(command);

            // Extract board ID from debug output
            const match = (stdout + stderr).match(
                /BOARD_ID:([a-zA-Z0-9]{15,18})/
            );

            if (match && match[1]) {
                console.log(`✅ Test board created with ID: ${match[1]}`);
                return match[1];
            } else {
                throw new Error('Could not extract board ID from Apex output');
            }
        } catch (error: any) {
            throw new Error(`Error creating test board: ${error.message}`);
        } finally {
            // Clean up temp file
            try {
                if (fs.existsSync(tempFile)) {
                    fs.unlinkSync(tempFile);
                }
            } catch (err) {
                // Ignore cleanup errors
            }
        }
    }

    /**
     * Full setup: create org, deploy, create test data
     */
    async setup(): Promise<{
        instanceUrl: string;
        accessToken: string;
        boardId: string;
    }> {
        console.log(
            '🚀 Starting Salesforce scratch org setup for E2E testing...\n'
        );

        // Check if SF CLI is installed
        if (!(await this.isInstalled())) {
            throw new Error(
                'Salesforce CLI is not installed. Please install it from https://developer.salesforce.com/tools/sfdxcli'
            );
        }

        // Check if scratch org already exists
        const exists = await this.scratchOrgExists();

        if (!exists) {
            // Create scratch org
            await this.createScratchOrg(1);

            // Deploy metadata
            await this.deployMetadata();

            // Assign permission sets (optional, may not exist)
            try {
                await this.assignPermissionSet('Alex_Admin');
            } catch (error) {
                console.log('⚠️  Skipping permission set assignment');
            }
        } else {
            console.log(`✅ Using existing scratch org: ${this.orgAlias}`);
        }

        // Get org info
        const orgInfo = await this.getOrgInfo();

        // Create test board
        const boardId = await this.createTestBoard();

        console.log('\n✅ Setup complete!');
        console.log(`Instance URL: ${orgInfo.instanceUrl}`);
        console.log(`Board ID: ${boardId}`);

        return {
            instanceUrl: orgInfo.instanceUrl,
            accessToken: orgInfo.accessToken,
            boardId
        };
    }

    /**
     * Setup without creating a board (optimized for tests that create their own boards)
     */
    async setupWithoutBoard(): Promise<{
        instanceUrl: string;
        accessToken: string;
    }> {
        console.log(
            '🚀 Starting Salesforce scratch org setup (without board)...\n'
        );

        // Check if SF CLI is installed
        if (!(await this.isInstalled())) {
            throw new Error(
                'Salesforce CLI is not installed. Please install it from https://developer.salesforce.com/tools/sfdxcli'
            );
        }

        // Check if scratch org already exists
        const exists = await this.scratchOrgExists();

        if (!exists) {
            // Create scratch org
            await this.createScratchOrg(1);

            // Deploy metadata
            await this.deployMetadata();

            // Assign permission sets (optional, may not exist)
            try {
                await this.assignPermissionSet('Alex_Admin');
            } catch (error) {
                console.log('⚠️  Skipping permission set assignment');
            }
        } else {
            console.log(`✅ Using existing scratch org: ${this.orgAlias}`);
        }

        // Get org info
        const orgInfo = await this.getOrgInfo();

        console.log('\n✅ Setup complete!');
        console.log(`Instance URL: ${orgInfo.instanceUrl}`);

        return {
            instanceUrl: orgInfo.instanceUrl,
            accessToken: orgInfo.accessToken
        };
    }

    /**
     * Delete a board and all related data (columns, cards)
     */
    async deleteBoard(boardId: string): Promise<void> {
        console.log(`Deleting test board: ${boardId}...`);

        // Use inline template and update with board ID
        const apexScript = this.DELETE_BOARD_TEMPLATE.replace(
            /{{BOARD_ID}}/g,
            boardId
        );

        // Write to a temp file for this execution
        const tempDir = path.join(process.cwd(), '.temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const tempFile = path.join(tempDir, `delete-board-${Date.now()}.apex`);
        fs.writeFileSync(tempFile, apexScript);

        try {
            const command = `sf apex run --file ${tempFile} --target-org ${this.orgAlias}`;
            await execAsync(command);
            console.log('✅ Test board and related data deleted successfully');
        } catch (error: any) {
            console.warn(`⚠️  Warning: Error deleting board: ${error.message}`);
        } finally {
            // Clean up temp file
            try {
                if (fs.existsSync(tempFile)) {
                    fs.unlinkSync(tempFile);
                }
            } catch (err) {
                // Ignore cleanup errors
            }
        }
    }

    /**
     * Cleanup: delete scratch org
     */
    async cleanup(): Promise<void> {
        console.log('🧹 Cleaning up scratch org...');
        await this.deleteScratchOrg();
    }
}
