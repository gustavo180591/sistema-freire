/**
 * Payment Agreement Block Exception Batch Evaluation Script
 * Phase 6.2
 * 
 * This script evaluates and manages block exceptions for payment agreements in batch.
 * It can be run manually or scheduled via cron.
 * 
 * Usage:
 *   npx tsx scripts/evaluate-payment-agreement-block-exceptions.ts
 *   npx tsx scripts/evaluate-payment-agreement-block-exceptions.ts --dry-run
 * 
 * Environment:
 *   DATABASE_URL must be set
 */

import { PrismaClient } from '@prisma/client';
import { paymentAgreementService } from '../src/lib/server/payment-agreements/payment-agreement-service';

const prisma = new PrismaClient();

interface CliOptions {
	dryRun: boolean;
}

function parseArgs(): CliOptions {
	const args = process.argv.slice(2);
	const dryRun = args.includes('--dry-run');
	return { dryRun };
}

async function main() {
	console.log('🔄 Payment Agreement Block Exception Batch Evaluation\n');
	
	const options = parseArgs();
	
	if (options.dryRun) {
		console.log('⚠️  DRY RUN MODE - No changes will be made\n');
	} else {
		console.log('🚀 EXECUTION MODE - Changes will be applied\n');
	}

	try {
		const startTime = Date.now();
		
		// Execute batch evaluation
		const results = await paymentAgreementService.evaluateAllAgreementBlockExceptions({
			dryRun: options.dryRun,
			systemUserId: 'SYSTEM',
			systemUserName: 'System Batch'
		});

		const duration = ((Date.now() - startTime) / 1000).toFixed(2);

		// Display results
		console.log('📊 Results Summary:');
		console.log('═══════════════════════════════════════════════════════════');
		console.log(`Total agreements evaluated: ${results.totalEvaluated}`);
		console.log(`Exceptions applied: ${results.exceptionsApplied}`);
		console.log(`Exceptions revoked: ${results.exceptionsRevoked}`);
		console.log(`Agreements unchanged: ${results.agreementsUnchanged}`);
		console.log(`Agreements skipped: ${results.agreementsSkipped}`);
		console.log(`Errors encountered: ${results.errors.length}`);
		console.log(`Execution time: ${duration}s`);
		console.log('═══════════════════════════════════════════════════════════\n');

		// Display errors if any
		if (results.errors.length > 0) {
			console.log('❌ Errors:');
			console.log('═══════════════════════════════════════════════════════════');
			for (const error of results.errors) {
				console.log(`  Agreement ${error.agreementNumber}/${error.agreementYear} (${error.agreementId}):`);
				console.log(`    ${error.error}`);
			}
			console.log('═══════════════════════════════════════════════════════════\n');
		}

		// Exit with appropriate code
		if (results.errors.length > 0) {
			console.log('⚠️  Completed with errors');
			process.exit(1);
		} else {
			console.log('✅ Completed successfully');
			process.exit(0);
		}
	} catch (error) {
		console.error('❌ Fatal error:', error instanceof Error ? error.message : String(error));
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

main();
