import { createDateFormatterService } from "../dateFormatter.js";

// Simple test to verify the date formatter works
function testDateFormatter() {
    console.log("🧪 Testing DateFormatterService...");

    // Test with Amharic
    const amharicFormatter = createDateFormatterService({
        language: "amharic",
        useGeezNumerals: false,
    });

    // Test with English
    const englishFormatter = createDateFormatterService({
        language: "english",
        useGeezNumerals: false,
    });

    // Test with Amharic + Geez numerals
    const amharicGeezFormatter = createDateFormatterService({
        language: "amharic",
        useGeezNumerals: true,
    });

    // Test format strings
    const testFormats = [
        "dday, mnam dd, year",
        "dday dnum mnam year hh:mm",
        "mnam dd, year (tp)",
        "dday hh:mm tp",
        "year-mnum-dd hh:mm",
    ];

    console.log("\n📅 Amharic Results:");
    testFormats.forEach((format) => {
        const result = amharicFormatter.format(format);
        console.log(`"${format}" → "${result}"`);
    });

    console.log("\n📅 English Results:");
    testFormats.forEach((format) => {
        const result = englishFormatter.format(format);
        console.log(`"${format}" → "${result}"`);
    });

    console.log("\n📅 Amharic + Geez Numerals Results:");
    testFormats.forEach((format) => {
        const result = amharicGeezFormatter.format(format);
        console.log(`"${format}" → "${result}"`);
    });

    // Test validation
    console.log("\n✅ Validation Tests:");
    const validationTests = [
        "dday, mnam dd, year", // Valid
        "invalid_token, mnam dd, year", // Invalid token
        "dday dnum mnam year hh:mm", // Valid
        "unknown_token here", // Invalid
    ];

    validationTests.forEach((format) => {
        const validation = amharicFormatter.validateFormat(format);
        console.log(
            `"${format}" → Valid: ${validation.isValid}, Errors: ${validation.errors.join(", ") || "None"}`,
        );
    });

    // Test the new testFormat method
    console.log("\n🧪 Test Format Method (Preview):");
    const testFormatStrings = [
        "dday, mnam dd, year",
        "dday dnum mnam year hh:mm",
        "mnam dd, year (tp)",
        "invalid_token test",
        "year-mnum-dd hh:mm",
    ];

    testFormatStrings.forEach((format) => {
        const testResult = amharicFormatter.testFormat(format);
        console.log(`\nFormat: "${format}"`);
        console.log(`  Valid: ${testResult.isValid}`);
        console.log(`  Preview: "${testResult.preview}"`);
        console.log(`  Tokens: [${testResult.tokens.join(", ")}]`);
        if (testResult.errors.length > 0) {
            console.log(`  Errors: ${testResult.errors.join(", ")}`);
        }
    });

    // Test Geez numerals with testFormat method
    console.log("\n🧪 Test Format Method with Geez Numerals:");
    const geezTestFormats = [
        "dday, mnam dd, year",
        "dday dnum mnam year hh:mm",
        "year-mnum-dd hh:mm",
    ];

    geezTestFormats.forEach((format) => {
        const testResult = amharicGeezFormatter.testFormat(format);
        console.log(`\nFormat: "${format}"`);
        console.log(`  Valid: ${testResult.isValid}`);
        console.log(`  Preview: "${testResult.preview}"`);
        console.log(`  Tokens: [${testResult.tokens.join(", ")}]`);
        if (testResult.errors.length > 0) {
            console.log(`  Errors: ${testResult.errors.join(", ")}`);
        }
    });

    console.log(
        "\n🎯 Available tokens:",
        amharicFormatter.getAvailableTokens(),
    );
    console.log("✅ DateFormatterService test completed!");
}

// Export for potential use
export { testDateFormatter };

// Run the test if this file is executed directly
if (import.meta.main) {
    testDateFormatter();
}
