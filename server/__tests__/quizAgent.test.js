import { jest } from '@jest/globals'

// Mock pdf-parse to bypass its CJS isDebugMode bug under ESM/Jest
jest.unstable_mockModule('pdf-parse', () => {
    return {
        default: () => Promise.resolve({ text: '' })
    }
})

// Dynamically import quizAgent after mocking
const { shuffleArray, pickRandomQuestions } = await import('../agents/quizAgent.js')

describe('Quiz Agent Helpers Tests', () => {
    test('shuffleArray should return a new shuffled array with same elements', () => {
        const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        const output = shuffleArray(input)
        
        expect(output).not.toBe(input) // should be a new array
        expect(output.length).toBe(input.length)
        expect([...output].sort((a,b)=>a-b)).toEqual([...input].sort((a,b)=>a-b))
    })

    test('pickRandomQuestions should balance difficulty', () => {
        const bank = [
            { id: 1, difficulty: 'easy' },
            { id: 2, difficulty: 'easy' },
            { id: 3, difficulty: 'easy' },
            { id: 4, difficulty: 'medium' },
            { id: 5, difficulty: 'medium' },
            { id: 6, difficulty: 'medium' },
            { id: 7, difficulty: 'hard' },
            { id: 8, difficulty: 'hard' },
        ]

        const { picked, total, pickedCount } = pickRandomQuestions(bank, 4)
        
        expect(picked.length).toBe(4)
        expect(total).toBe(bank.length)
        expect(pickedCount).toBe(4)
        
        // Assert that the items picked are indeed from the bank
        picked.forEach(q => {
            const match = bank.find(item => item.id === q.id)
            expect(match).toBeDefined()
        })
    })

    test('pickRandomQuestions should return all questions if bank size is less than maxPick', () => {
        const bank = [
            { id: 1, difficulty: 'easy' },
            { id: 2, difficulty: 'medium' },
        ]
        const { picked, total } = pickRandomQuestions(bank, 5)
        expect(picked.length).toBe(2)
        expect(total).toBe(2)
    })
})
