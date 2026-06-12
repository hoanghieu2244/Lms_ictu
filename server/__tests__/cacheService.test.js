import fs from 'fs'
import { readCache, writeCache, clearCache, getCachePath } from '../services/cacheService.js'

describe('Cache Service Tests', () => {
    const testCourseId = 'test_course'
    const testLessonId = 'test_lesson'
    const testType = 'test_type'
    const testData = { hello: 'world' }

    afterEach(() => {
        // Clean up test cache file
        try {
            const p = getCachePath(testType, testCourseId, testLessonId)
            if (fs.existsSync(p)) {
                fs.unlinkSync(p)
            }
        } catch (e) {}
    })

    test('should write and read cache correctly', () => {
        writeCache(testType, testCourseId, testLessonId, testData)
        const cached = readCache(testType, testCourseId, testLessonId)
        expect(cached).toEqual(testData)
    })

    test('should return null for non-existent cache', () => {
        const cached = readCache('non_existent', testCourseId, testLessonId)
        expect(cached).toBeNull()
    })

    test('should clear cache correctly', () => {
        writeCache('immersive', testCourseId, testLessonId, testData)
        writeCache('mindmap', testCourseId, testLessonId, testData)

        clearCache(testCourseId, testLessonId)

        expect(readCache('immersive', testCourseId, testLessonId)).toBeNull()
        expect(readCache('mindmap', testCourseId, testLessonId)).toBeNull()
    })
})
