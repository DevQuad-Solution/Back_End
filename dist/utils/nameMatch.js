"use strict";
// Add these helper functions to your verificationService.ts or paymentService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.doNamesMatch = void 0;
/**
 * Splits a name into an array of words, handling multiple spaces and special characters
 */
const splitNameIntoWords = (name) => {
    return name
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0);
};
/**
 * Creates a set of all possible name variations (first/last combinations)
 */
const getNameVariations = (words) => {
    const variations = new Set();
    // Add all individual words
    words.forEach((word) => variations.add(word));
    // Add full name as is
    variations.add(words.join(' '));
    // First + Last (first and last word)
    if (words.length >= 2) {
        variations.add(`${words[0]} ${words[words.length - 1]}`);
        variations.add(`${words[words.length - 1]} ${words[0]}`);
    }
    // All possible pairs of adjacent words
    for (let i = 0; i < words.length - 1; i++) {
        variations.add(`${words[i]} ${words[i + 1]}`);
    }
    return variations;
};
/**
 * Calculates similarity score between two names (0-1)
 * Uses multiple strategies: exact match, word overlap, and Jaccard similarity
 */
const calculateNameSimilarity = (name1, name2) => {
    const words1 = splitNameIntoWords(name1);
    const words2 = splitNameIntoWords(name2);
    if (words1.length === 0 || words2.length === 0)
        return 0;
    // Exact match after normalization
    if (name1.toLowerCase() === name2.toLowerCase())
        return 1;
    // Create sets for Jaccard similarity
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    // Calculate intersection size
    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    // Jaccard similarity coefficient
    const jaccardScore = intersection.size / union.size;
    // Check if all significant words from one name are in the other
    // (ignoring very short words that might be initials)
    const significantWords1 = words1.filter((w) => w.length > 2);
    const significantWords2 = words2.filter((w) => w.length > 2);
    let containsScore = 0;
    if (significantWords1.length > 0 && significantWords2.length > 0) {
        const smallerSet = significantWords1.length <= significantWords2.length ? significantWords1 : significantWords2;
        const largerSet = significantWords1.length <= significantWords2.length ? significantWords2 : significantWords1;
        const wordsFound = smallerSet.filter((word) => largerSet.includes(word)).length;
        containsScore = wordsFound / smallerSet.length;
    }
    // Check variations
    const variations1 = getNameVariations(words1);
    const variations2 = getNameVariations(words2);
    let variationScore = 0;
    for (const variant of variations1) {
        if (variations2.has(variant)) {
            variationScore = 1;
            break;
        }
    }
    // Also check if any variation2 contains variation1 or vice versa
    if (variationScore === 0) {
        for (const variant1 of variations1) {
            for (const variant2 of variations2) {
                if (variant1.includes(variant2) || variant2.includes(variant1)) {
                    variationScore = 0.8;
                    break;
                }
            }
            if (variationScore > 0)
                break;
        }
    }
    // Weighted average of different metrics
    // Jaccard: 40%, Contains: 30%, Variation: 30%
    const finalScore = jaccardScore * 0.4 + containsScore * 0.3 + variationScore * 0.3;
    return Math.min(1, finalScore);
};
/**
 * Checks if two names match with flexible criteria
 * @param name1 - First name (e.g., from user registration)
 * @param name2 - Second name (e.g., from NIN API)
 * @param threshold - Minimum similarity score (default: 0.6)
 * @returns boolean indicating if names match
 */
const doNamesMatch = (name1, name2, threshold = 0.6) => {
    const similarity = calculateNameSimilarity(name1, name2);
    console.log(`Name similarity: "${name1}" vs "${name2}" = ${similarity}`);
    return similarity >= threshold;
};
exports.doNamesMatch = doNamesMatch;
/**
 * Alternative: Fuzzy matching using Levenshtein distance for more accuracy
 */
const levenshteinDistance = (a, b) => {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            const cost = a[j - 1] === b[i - 1] ? 0 : 1;
            matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
        }
    }
    return matrix[b.length][a.length];
};
const calculateFuzzySimilarity = (name1, name2) => {
    const normalized1 = name1.toLowerCase().trim();
    const normalized2 = name2.toLowerCase().trim();
    if (normalized1 === normalized2)
        return 1;
    const maxLength = Math.max(normalized1.length, normalized2.length);
    const distance = levenshteinDistance(normalized1, normalized2);
    return 1 - distance / maxLength;
};
// Test cases
const testCases = [
    //   { user: "Kolawole Moses Akintayo", nin: "Akintayo Kolawole Moses", expected: true },
    //   { user: "Kolawole Akintayo", nin: "Akintayo Kolawole Moses", expected: true },
    //   { user: "Akintayo Kolawole", nin: "Kolawole Moses Akintayo", expected: true },
    { user: "Kolawo Akintayo", nin: "Kolawole Akintayo", expected: true }, // Partial match
    //   { user: "John Doe", nin: "Jonathan Doe", expected: false }, // Different first name
];
testCases.forEach(({ user, nin, expected }) => {
    const result = (0, exports.doNamesMatch)(user, nin);
    console.log(`"${user}" vs "${nin}": ${result} (Expected: ${expected})`);
});
