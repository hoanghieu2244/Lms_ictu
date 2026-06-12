import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ============================================
// AI CACHE SETUP
// ============================================
const AI_CACHE_DIR = join(__dirname, '..', 'ai-cache')

// Ensure cache directory exists on import
fs.mkdirSync(AI_CACHE_DIR, { recursive: true })

function getCachePath(type, courseId, lessonId) {
    return join(AI_CACHE_DIR, `${type}_${courseId}_${lessonId}.json`)
}

function readCache(type, courseId, lessonId) {
    const p = getCachePath(type, courseId, lessonId)
    if (fs.existsSync(p)) {
        try { return JSON.parse(fs.readFileSync(p, 'utf-8')) } catch { return null }
    }
    return null
}

function writeCache(type, courseId, lessonId, data) {
    fs.writeFileSync(getCachePath(type, courseId, lessonId), JSON.stringify(data, null, 2))
}

function clearCache(courseId, lessonId) {
    try { fs.unlinkSync(getCachePath('immersive', courseId, lessonId)) } catch (e) { }
    try { fs.unlinkSync(getCachePath('mindmap', courseId, lessonId)) } catch (e) { }
}

export { AI_CACHE_DIR, getCachePath, readCache, writeCache, clearCache }
