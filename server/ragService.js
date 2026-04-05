import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

// Polyfill browser globals needed by pdfjs-dist (used by pdf-parse)
// These are normally provided by @napi-rs/canvas, but its native binding may fail to load
if (typeof globalThis.DOMMatrix === 'undefined') {
    globalThis.DOMMatrix = class DOMMatrix {
        constructor() { this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0; }
    }
}
if (typeof globalThis.Path2D === 'undefined') {
    globalThis.Path2D = class Path2D { constructor() {} }
}
if (typeof globalThis.ImageData === 'undefined') {
    globalThis.ImageData = class ImageData {
        constructor(w, h) { this.width = w; this.height = h; this.data = new Uint8ClampedArray(w * h * 4); }
    }
}

const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')
const mammoth = require('mammoth')
import { GoogleGenAI } from '@google/genai'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const VectorChunkSchema = new mongoose.Schema({
    id_string: { type: String, unique: true, sparse: true },
    text: String,
    embedding: { type: [Number] },
    metadata: {
        filename: String,
        page: Number,
        index: Number,
        courseId: String,
        lessonId: String,
        fileSize: Number,
        uploadedAt: { type: Date, default: Date.now },
        fileHash: String
    }
})
VectorChunkSchema.index({ 'metadata.courseId': 1, 'metadata.lessonId': 1 })
const VectorModel = mongoose.model('VectorChunk', VectorChunkSchema)

let isMongoConnected = false

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

const DB_PATH = path.join(__dirname, 'vector_db.json')

let vectorStore = []

const MAX_RETRIES = 3
const RETRY_DELAY = 2000

export const initVectorDB = async () => {
    if (process.env.MONGODB_URI) {
        try {
            await mongoose.connect(process.env.MONGODB_URI)
            isMongoConnected = true
            console.log(`🍃 Connected to MongoDB Atlas Vector Store!`)
            return
        } catch (err) {
            console.error('❌ MongoDB Connection Error. Falling back to Local JSON:', err.message)
            isMongoConnected = false
        }
    }

    try {
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, 'utf-8')
            vectorStore = JSON.parse(data)
            console.log(`📦 Loaded Local Vector DB: ${vectorStore.length} chunks`)
        } else {
            console.log(`📦 Local Vector DB empty. Creating new...`)
            vectorStore = []
        }
    } catch (err) {
        console.error('Lỗi khi load Local Vector DB', err)
        vectorStore = []
    }
}

const saveVectorDB = () => {
    if (!isMongoConnected) {
        fs.writeFileSync(DB_PATH, JSON.stringify(vectorStore, null, 2))
    }
}

function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0
    let dotProduct = 0
    let normA = 0
    let normB = 0
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i]
        normA += vecA[i] * vecA[i]
        normB += vecB[i] * vecB[i]
    }
    if (normA === 0 || normB === 0) return 0
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function getEmbeddingWithRetry(text, retries = MAX_RETRIES) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('Chưa cấu hình GEMINI_API_KEY')
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await ai.models.embedContent({
                model: 'gemini-embedding-001',
                contents: text,
            })

            const embedding = response?.embeddings?.[0]?.values
            if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
                throw new Error('Invalid embedding response: empty or invalid format')
            }

            return embedding
        } catch (err) {
            console.error(`⚠️ Embedding attempt ${attempt}/${retries} failed:`, err.message)
            if (attempt < retries) {
                const delay = RETRY_DELAY * Math.pow(2, attempt - 1)
                console.log(`   Retrying in ${delay}ms...`)
                await sleep(delay)
            } else {
                throw new Error(`Embedding failed after ${retries} attempts: ${err.message}`)
            }
        }
    }
}

async function chunkTextWithPages(pagesData, chunkSize = 1000, chunkOverlap = 200) {
    const chunks = []

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: chunkSize,
        chunkOverlap: chunkOverlap,
        separators: ["\n\n", "\n", ". ", "? ", "! ", " ", ""],
    })

    for (const page of pagesData) {
        const splitTexts = await splitter.splitText(page.text)

        for (const split of splitTexts) {
            chunks.push({
                text: split,
                page: page.pageNum
            })
        }
    }
    return chunks
}

export const deleteVectorsByLesson = async (courseId, lessonId) => {
    if (isMongoConnected) {
        try {
            const result = await VectorModel.deleteMany({
                'metadata.courseId': courseId,
                'metadata.lessonId': lessonId
            })
            console.log(`🗑️ Deleted ${result.deletedCount} old vectors from MongoDB for ${courseId}/${lessonId}`)
            return result.deletedCount
        } catch (err) {
            console.error('Error deleting vectors from MongoDB:', err.message)
            return 0
        }
    } else {
        const beforeCount = vectorStore.length
        vectorStore = vectorStore.filter(chunk =>
            !(chunk.metadata?.courseId === courseId && chunk.metadata?.lessonId === lessonId)
        )
        const deletedCount = beforeCount - vectorStore.length
        if (deletedCount > 0) {
            saveVectorDB()
            console.log(`🗑️ Deleted ${deletedCount} old vectors from Local DB for ${courseId}/${lessonId}`)
        }
        return deletedCount
    }
}

export const processDocument = async (filePath, originalName, mimeType, courseId = 'unknown', lessonId = 'general') => {
    let pagesData = []
    let totalTextLength = 0

    console.log(`⏳ Bắt đầu phân tích tài liệu: ${originalName}`)

    await deleteVectorsByLesson(courseId, lessonId)

    try {
        if (mimeType === 'application/pdf') {
            const dataBuffer = fs.readFileSync(filePath)
            const data = await pdfParse(dataBuffer)

            const rawPages = data.text.split('\n\n')

            let currentPageNum = 1
            for (let pText of rawPages) {
                const cleanText = pText.replace(/\s+/g, ' ').trim()
                if (cleanText.length > 20) {
                    pagesData.push({
                        pageNum: currentPageNum,
                        text: cleanText
                    })
                    totalTextLength += cleanText.length
                }
                currentPageNum++
            }
        }
        else if (
            mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            originalName.endsWith('.docx')
        ) {
            const result = await mammoth.extractRawText({ path: filePath })
            const cleanText = result.value.replace(/\s+/g, ' ').trim()
            if (cleanText.length > 0) {
                pagesData.push({
                    pageNum: 1,
                    text: cleanText
                })
                totalTextLength += cleanText.length
            }
        } else {
            throw new Error(`Định dạng không được hỗ trợ: ${mimeType}`)
        }
    } catch (err) {
        console.error('Lỗi khi đọc file', err)
        throw new Error('Lỗi khi đọc dữ liệu file')
    }

    console.log(`✅ Nén text thành công: Dài ${totalTextLength} ký tự từ ${pagesData.length} trang có chữ.`)

    if (totalTextLength < 10 || pagesData.length === 0) {
        throw new Error('Tài liệu quá ngắn hoặc không đọc được nội dung.')
    }

    const chunks = await chunkTextWithPages(pagesData)
    console.log(`🔪 Đã chia bằng Semantic Splitter thành ${chunks.length} đoạn (chunks)`)

    const fileStats = fs.statSync(filePath)

    let addedCount = 0
    for (let i = 0; i < chunks.length; i++) {
        try {
            const chunkObj = chunks[i]
            const embedding = await getEmbeddingWithRetry(chunkObj.text)

            const chunkData = {
                id_string: Date.now().toString() + '_' + addedCount,
                text: chunkObj.text,
                embedding: embedding,
                metadata: {
                    filename: originalName,
                    page: chunkObj.page,
                    index: i,
                    courseId: courseId,
                    lessonId: lessonId,
                    fileSize: fileStats.size,
                    uploadedAt: new Date()
                }
            }

            if (isMongoConnected) {
                await VectorModel.create(chunkData)
            } else {
                vectorStore.push(chunkData)
            }

            addedCount++
        } catch (err) {
            console.error(`⚠️ Lỗi khi embed chunk ${i}:`, err.message)
        }
    }

    if (!isMongoConnected) saveVectorDB()
    console.log(`🎉 Đã lưu ${addedCount} đoạn vector vào ${isMongoConnected ? 'MongoDB Atlas' : 'Local DB'}!`)

    return addedCount
}

export const searchKnowledgeBase = async (query, topK = 3, courseId = null, lessonId = null) => {
    const queryEmbedding = await getEmbeddingWithRetry(query)
    let searchDomain = vectorStore

    if (isMongoConnected) {
        try {
            const matchQuery = {}
            if (courseId) matchQuery['metadata.courseId'] = courseId
            if (lessonId) matchQuery['metadata.lessonId'] = lessonId

            if (Object.keys(matchQuery).length > 0) {
                searchDomain = await VectorModel.find(matchQuery).lean()
            } else {
                const atlasResults = await VectorModel.aggregate([
                    {
                        "$vectorSearch": {
                            "queryVector": queryEmbedding,
                            "path": "embedding",
                            "numCandidates": 50,
                            "limit": topK,
                            "index": "vector_index"
                        }
                    }
                ])

                if (atlasResults && atlasResults.length > 0) {
                    return atlasResults.map(chunk => ({
                        text: chunk.text,
                        score: chunk.score || 1,
                        filename: chunk.metadata?.filename,
                        page: chunk.metadata?.page || 1
                    }))
                }
            }
        } catch (aggErr) {
            searchDomain = await VectorModel.find({}).lean()
        }
    }

    if (!searchDomain || searchDomain.length === 0) return []

    const results = searchDomain.map(chunk => {
        const score = cosineSimilarity(queryEmbedding, chunk.embedding)
        return {
            text: chunk.text,
            score: score,
            filename: chunk.metadata?.filename,
            page: chunk.metadata?.page || 1
        }
    })

    results.sort((a, b) => b.score - a.score)
    return results.slice(0, topK)
}

export const getDocumentTextByLesson = async (courseId, lessonId) => {
    let matchingChunks = []

    if (isMongoConnected) {
        matchingChunks = await VectorModel.find({
            'metadata.courseId': courseId,
            'metadata.lessonId': lessonId
        }).lean()
    } else {
        matchingChunks = vectorStore.filter(chunk =>
            chunk.metadata?.courseId === courseId && chunk.metadata?.lessonId === lessonId
        )
    }

    if (!matchingChunks || matchingChunks.length === 0) return null

    matchingChunks.sort((a, b) => (a.metadata?.index || 0) - (b.metadata?.index || 0))
    return matchingChunks.map(c => c.text).join('\n\n')
}

export const getDBStatus = () => ({
    type: isMongoConnected ? 'MongoDB Atlas' : 'Local JSON',
    connected: isMongoConnected,
    chunksCount: isMongoConnected ? 'N/A (query DB)' : vectorStore.length
})
