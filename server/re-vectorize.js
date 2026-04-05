import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { processDocument, initVectorDB } from './ragService.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = path.join(__dirname, 'uploads')
const METADATA_FILE = path.join(UPLOADS_DIR, 'metadata.json')

async function main() {
    console.log('\n🔄 === RE-VECTORIZE TẤT CẢ TÀI LIỆU ĐÃ UPLOAD ===\n')

    await initVectorDB()

    if (!fs.existsSync(METADATA_FILE)) {
        console.log('❌ Không tìm thấy metadata.json')
        process.exit(1)
    }

    const metadata = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf-8'))
    console.log(`📁 Tìm thấy ${metadata.length} file trong metadata`)

    const pdfFiles = metadata.filter(f => f.mimetype === 'application/pdf')
    console.log(`📄 Có ${pdfFiles.length} file PDF cần xử lý\n`)

    let success = 0
    let failed = 0

    for (const file of pdfFiles) {
        const filePath = file.path
        
        if (!fs.existsSync(filePath)) {
            const altPath = path.join(UPLOADS_DIR, file.courseId, file.lessonId, file.storedName)
            if (fs.existsSync(filePath)) {
                file.path = altPath
            } else {
                console.log(`⚠️  File không tồn tại: ${file.originalName}`)
                failed++
                continue
            }
        }

        console.log(`\n⏳ Đang xử lý: ${file.originalName}`)
        console.log(`   Course: ${file.courseName} | Lesson: ${file.lessonName}`)

        try {
            const chunks = await processDocument(
                file.path,
                file.originalName,
                file.mimetype,
                file.courseId,
                file.lessonId
            )
            console.log(`   ✅ Thành công: ${chunks} chunks`)
            success++
        } catch (err) {
            console.log(`   ❌ Lỗi: ${err.message}`)
            failed++
        }
    }

    console.log(`\n🎉 === HOÀN THÀNH ===`)
    console.log(`   ✅ Thành công: ${success}`)
    console.log(`   ❌ Thất bại: ${failed}`)
}

main().catch(console.error)
