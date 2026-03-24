import { executeQuantModels } from './src/quant';

async function run() {
    console.log("Starting stand-alone quant test for AAPL...");
    const result = await executeQuantModels('AAPL');
    console.log("Test execution finished. Result:", result);
    process.exit(0);
}

run();
