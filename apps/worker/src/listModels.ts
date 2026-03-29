import { logWrapper } from './logger';
async function listModels() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        logWrapper.error("GEMINI_API_KEY is not set.");
        process.exit(1);
    }

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        if (!res.ok) {
            logWrapper.error(`Failed to fetch models: ${res.statusText}`);
            process.exit(1);
        }
        const data = await res.json();

        logWrapper.info("
===================================================================================");
        logWrapper.info("                           AVAILABLE GEMINI MODELS                                 ");
        logWrapper.info("===================================================================================");
        logWrapper.info("Model Name".padEnd(40) + " | " + "Description");
        logWrapper.info("-----------------------------------------------------------------------------------");

        data.models.forEach((m: any) => {
            if (m.supportedGenerationMethods.includes("generateContent")) {
                const name = m.name.replace('models/', '');
                logWrapper.info(name.padEnd(40) + " | " + m.displayName);
            }
        });

        logWrapper.info("-----------------------------------------------------------------------------------");
        logWrapper.info("
Estimated FREE Tier RPM Limits (Subject to change by Google):");
        logWrapper.info(" - gemini-1.5-pro / gemini-2.5-pro   :  2 RPM (50 Requests / Day)");
        logWrapper.info(" - gemini-1.5-flash / gemini-2.5-flash: 15 RPM (1500 Requests / Day)");
        logWrapper.info(" - older models / gemma             : Varying, often very low or discontinued on free tier.");
        logWrapper.info("
Set your preferred model in .env under AI_MODEL, and set AI_RPM_LIMIT accordingly.");
        logWrapper.info("===================================================================================
");

    } catch (err) {
        logWrapper.error("Error fetching models:", err);
    }
}

listModels();
