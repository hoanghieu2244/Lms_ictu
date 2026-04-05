import { useState } from 'react'

export default function MicroActivity({ activity, onClose }) {
    const [answer, setAnswer] = useState('')
    const [selectedOption, setSelectedOption] = useState(null)
    const [submitted, setSubmitted] = useState(false)
    const [isCorrect, setIsCorrect] = useState(false)

    const handleSubmit = () => {
        let correct = false

        if (activity.type === 'fill_blank') {
            correct = answer.trim().toLowerCase() === activity.answer.toLowerCase()
        } else if (activity.type === 'true_false') {
            correct = selectedOption === activity.answer
        } else if (activity.type === 'multiple_choice') {
            correct = selectedOption === activity.correctIdx
        }

        setIsCorrect(correct)
        setSubmitted(true)
    }

    const getTypeLabel = () => {
        switch (activity.type) {
            case 'fill_blank': return '✏️ Điền khuyết'
            case 'true_false': return '✅ Đúng / Sai'
            case 'multiple_choice': return '🔘 Trắc nghiệm'
            default: return '🎯 Luyện tập'
        }
    }

    return (
        <div className="micro-activity-overlay" onClick={onClose}>
            <div className="micro-activity-card" onClick={e => e.stopPropagation()}>
                <div className="activity-header">
                    <h3>{getTypeLabel()}</h3>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>
                <div className="activity-body">
                    <div className="activity-question">{activity.question}</div>

                    {/* Fill in the blank */}
                    {activity.type === 'fill_blank' && (
                        <>
                            <input
                                className="activity-input"
                                type="text"
                                placeholder="Nhập câu trả lời..."
                                value={answer}
                                onChange={e => setAnswer(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !submitted && handleSubmit()}
                                disabled={submitted}
                                autoFocus
                            />
                            {activity.hint && !submitted && (
                                <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>💡 Gợi ý: {activity.hint}</div>
                            )}
                        </>
                    )}

                    {/* True / False */}
                    {activity.type === 'true_false' && (
                        <div className="activity-options">
                            {[true, false].map(val => (
                                <button
                                    key={String(val)}
                                    className={`option-btn ${selectedOption === val ? 'selected' : ''} ${submitted ? (val === activity.answer ? 'correct' : selectedOption === val ? 'incorrect' : '') : ''}`}
                                    onClick={() => !submitted && setSelectedOption(val)}
                                    disabled={submitted}
                                >
                                    <span className="option-key">{val ? 'Đ' : 'S'}</span>
                                    {val ? 'Đúng' : 'Sai'}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Multiple Choice */}
                    {activity.type === 'multiple_choice' && (
                        <div className="activity-options">
                            {activity.options.map((opt, idx) => (
                                <button
                                    key={idx}
                                    className={`option-btn ${selectedOption === idx ? 'selected' : ''} ${submitted ? (idx === activity.correctIdx ? 'correct' : selectedOption === idx ? 'incorrect' : '') : ''}`}
                                    onClick={() => !submitted && setSelectedOption(idx)}
                                    disabled={submitted}
                                >
                                    <span className="option-key">{String.fromCharCode(65 + idx)}</span>
                                    {opt}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Submit */}
                    {!submitted && (
                        <button className="submit-btn" onClick={handleSubmit}
                            disabled={activity.type === 'fill_blank' ? !answer.trim() : selectedOption === null}
                        >
                            Kiểm tra
                        </button>
                    )}

                    {/* Feedback */}
                    {submitted && (
                        <div className={`feedback ${isCorrect ? 'correct' : 'incorrect'}`}>
                            {isCorrect ? activity.feedbackCorrect : activity.feedbackIncorrect}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
