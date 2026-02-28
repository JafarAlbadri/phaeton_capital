async function listModels() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error("GEMINI_API_KEY is not set.");
        process.exit(1);
    }

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        if (!res.ok) {
            console.error(`Failed to fetch models: ${res.statusText}`);
            process.exit(1);
        }
        const data = await res.json();

        console.log("\n===================================================================================");
        console.log("                           AVAILABLE GEMINI MODELS                                 ");
        console.log("===================================================================================");
        console.log("Model Name".padEnd(40) + " | " + "Description");
        console.log("-----------------------------------------------------------------------------------");

        data.models.forEach((m: any) => {
            if (m.supportedGenerationMethods.includes("generateContent")) {
                const name = m.name.replace('models/', '');
                console.log(name.padEnd(40) + " | " + m.displayName);
            }
        });

        console.log("-----------------------------------------------------------------------------------");
        console.log("\nEstimated FREE Tier RPM Limits (Subject to change by Google):");
        console.log(" - gemini-1.5-pro / gemini-2.5-pro   :  2 RPM (50 Requests / Day)");
        console.log(" - gemini-1.5-flash / gemini-2.5-flash: 15 RPM (1500 Requests / Day)");
        console.log(" - older models / gemma             : Varying, often very low or discontinued on free tier.");
        console.log("\nSet your preferred model in .env under AI_MODEL, and set AI_RPM_LIMIT accordingly.");
        console.log("===================================================================================\n");

    } catch (err) {
        console.error("Error fetching models:", err);
    }
}

listModels();
