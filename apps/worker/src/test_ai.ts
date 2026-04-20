import { generateNarrative, labelSentimentAndDetectManipulation } from './ai';

async function main() {
    console.log("Testing generation...");
    const res = await generateNarrative({
        ticker: "AAPL",
        signal: "BULLISH",
        composite_score: 80,
        confidence: 0.9,
        sentiment_score: 85,
        technical_score: 75,
        fundamental_score: 82,
        quant_score: 70,
        macro_score: 65,
        insider_score: 50
    });
    console.log("Narrative output:", res);
    
    console.log("\nTesting labeling...");
    const labels = await labelSentimentAndDetectManipulation([{
        id: "1",
        text: "AAPL is going to the moon! Just bought 1000 shares!"
    }]);
    
    console.log("Label output:", JSON.stringify(labels, null, 2));
}

main().catch(console.error);
