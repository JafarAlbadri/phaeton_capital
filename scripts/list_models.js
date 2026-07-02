const key = process.env.GEMINI_API_KEY;
if (!key) throw new Error("GEMINI_API_KEY required");
fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
    .then(r => r.json())
    .then(data => {
        const supported = data.models
            .filter(m => m.supportedGenerationMethods.includes("generateContent"))
            .map(m => m.name.replace('models/', ''));
        require('fs').writeFileSync('supported_models.txt', supported.join('\n'));
        console.log("Written to supported_models.txt");
    })
    .catch(console.error);
