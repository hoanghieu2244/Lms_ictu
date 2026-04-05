const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const width = 1200;
const height = 800;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

function drawRoundedRect(x, y, w, h, r, fillColor, strokeColor, strokeWidth = 2) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    
    if (fillColor) {
        ctx.fillStyle = fillColor;
        ctx.fill();
    }
    if (strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
    }
}

function drawArrow(fromX, fromY, toX, toY, color = '#666') {
    const headLen = 12;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
}

function wrapText(text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
}

ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, width, height);

ctx.fillStyle = '#1a237e';
ctx.font = 'bold 28px Arial';
ctx.textAlign = 'center';
ctx.fillText('Hình 2.1: Tổng quan bốn công cụ AI của hệ thống Tutor AI Agent', width / 2, 45);

drawRoundedRect(500, 340, 200, 80, 15, '#e3f2fd', '#1976d2', 3);
ctx.fillStyle = '#0d47a1';
ctx.font = 'bold 16px Arial';
ctx.textAlign = 'center';
ctx.fillText('📚 RAG', 600, 365);
ctx.font = '13px Arial';
ctx.fillText('Knowledge Base', 600, 385);
ctx.fillText('Vector Database', 600, 405);

const tools = [
    {
        x: 80, y: 120, w: 230, h: 180,
        bgColor: '#fff8e1', strokeColor: '#ff9800',
        icon: '🎓', title: 'Tutor Chat Agent',
        features: ['• Giải đáp 1-1', '• Tích hợp RAG', '• Vẽ sơ đồ/ biểu đồ', '• Trích dẫn nguồn']
    },
    {
        x: 350, y: 120, w: 230, h: 180,
        bgColor: '#f3e5f5', strokeColor: '#9c27b0',
        icon: '📝', title: 'Quiz Generator',
        features: ['• Sinh câu hỏi TN', '• Đa dạng dạng bài', '• Phân cấp độ khó', '• Giải thích chi tiết']
    },
    {
        x: 620, y: 120, w: 230, h: 180,
        bgColor: '#e8f5e9', strokeColor: '#4caf50',
        icon: '📖', title: 'Immersive Text',
        features: ['• Chuyển đổi tài liệu', '• Tóm tắt nội dung', '• Ví dụ thực tế', '• Micro-quiz']
    },
    {
        x: 890, y: 120, w: 230, h: 180,
        bgColor: '#fff3e0', strokeColor: '#ff5722',
        icon: '🧠', title: 'Mindmap Generator',
        features: ['• Phân tích bài học', '• Sơ đồ tư duy', '• Cấu trúc nhánh', '• Trực quan hóa']
    }
];

for (const tool of tools) {
    drawRoundedRect(tool.x, tool.y, tool.w, tool.h, 12, tool.bgColor, tool.strokeColor, 3);
    
    ctx.fillStyle = tool.strokeColor;
    ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${tool.icon} ${tool.title}`, tool.x + tool.w / 2, tool.y + 30);
    
    ctx.fillStyle = '#424242';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    tool.features.forEach((f, i) => {
        ctx.fillText(f, tool.x + 15, tool.y + 60 + i * 25);
    });
}

drawRoundedRect(80, 500, 230, 100, 12, '#fafafa', '#757575', 2);
ctx.fillStyle = '#424242';
ctx.font = 'bold 16px Arial';
ctx.textAlign = 'center';
ctx.fillText('📄 Tài liệu học tập', 195, 540);
ctx.font = '12px Arial';
ctx.fillText('(PDF, DOCX)', 195, 565);

drawRoundedRect(890, 500, 230, 100, 12, '#e1f5fe', '#0288d1', 2);
ctx.fillStyle = '#01579b';
ctx.font = 'bold 16px Arial';
ctx.textAlign = 'center';
ctx.fillText('👨‍🎓 Sinh viên', 1005, 540);
ctx.font = '12px Arial';
ctx.fillText('(Người học)', 1005, 565);

drawArrow(310, 550, 500, 420, '#1976d2');
drawArrow(700, 380, 890, 550, '#1976d2');

drawArrow(195, 300, 500, 340, '#ff9800');
drawArrow(465, 300, 550, 340, '#9c27b0');
drawArrow(735, 300, 650, 340, '#4caf50');
drawArrow(1005, 300, 700, 380, '#ff5722');

ctx.setLineDash([5, 5]);
ctx.strokeStyle = '#90a4ae';
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(350, 590);
ctx.lineTo(890, 590);
ctx.stroke();
ctx.setLineDash([]);

ctx.fillStyle = '#607d8b';
ctx.font = '11px Arial';
ctx.textAlign = 'center';
ctx.fillText('Google Gemini API (gemini-2.5-pro, gemini-2.5-flash, text-embedding-004)', width / 2, height - 30);

const outputDir = path.join(__dirname, '..', 'docs', 'images');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, 'hinh-2-1-tutor-ai-agent-tools.png');
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(outputPath, buffer);

console.log(`✅ Đã tạo hình: ${outputPath}`);
