import { jest } from '@jest/globals'

// Mock pdf-parse to bypass its CJS isDebugMode bug under ESM/Jest
jest.unstable_mockModule('pdf-parse', () => {
    return {
        default: () => Promise.resolve({ text: '' })
    }
})

// Dynamically import ragService after mocking pdf-parse
const { cosineSimilarity } = await import('../ragService.js')

describe('RAG Service Cosine Similarity Tests', () => {
    test('identical vectors should return 1', () => {
        const vecA = [1, 2, 3]
        const vecB = [1, 2, 3]
        expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0, 5)
    })

    test('orthogonal vectors should return 0', () => {
        const vecA = [1, 0, 0]
        const vecB = [0, 1, 0]
        expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(0.0, 5)
    })

    test('opposite vectors should return -1', () => {
        const vecA = [1, 2, 3]
        const vecB = [-1, -2, -3]
        expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(-1.0, 5)
    })

    test('vectors of different lengths should return 0', () => {
        const vecA = [1, 2]
        const vecB = [1, 2, 3]
        expect(cosineSimilarity(vecA, vecB)).toBe(0)
    })

    test('null or undefined vectors should return 0', () => {
        expect(cosineSimilarity(null, [1, 2])).toBe(0)
        expect(cosineSimilarity([1, 2], undefined)).toBe(0)
    })

    test('vectors with zero norm should return 0', () => {
        expect(cosineSimilarity([0, 0], [1, 2])).toBe(0)
        expect(cosineSimilarity([1, 2], [0, 0])).toBe(0)
    })
})
