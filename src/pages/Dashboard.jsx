import { HiAcademicCap, HiClipboardDocumentCheck, HiSparkles, HiChartBar } from 'react-icons/hi2'

export default function Dashboard() {
    return (
        <div>
            <h2 style={{ marginBottom: 20, fontSize: 18, fontWeight: 600 }}>Tổng quan học tập</h2>

            <div className="dashboard-stats">
                <div className="stat-card">
                    <div className="stat-icon blue"><HiAcademicCap /></div>
                    <div>
                        <div className="stat-value">5</div>
                        <div className="stat-label">Lớp học phần</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green"><HiClipboardDocumentCheck /></div>
                    <div>
                        <div className="stat-value">42</div>
                        <div className="stat-label">Bài học đã hoàn thành</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon purple"><HiSparkles /></div>
                    <div>
                        <div className="stat-value">18</div>
                        <div className="stat-label">Quiz AI đã làm</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange"><HiChartBar /></div>
                    <div>
                        <div className="stat-value">85%</div>
                        <div className="stat-label">Điểm trung bình Quiz</div>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginTop: 8 }}>
                <div className="card-header">Kết quả học tập</div>
                <div className="card-body" style={{ padding: 0 }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>STT</th>
                                <th>Môn học</th>
                                <th style={{ textAlign: 'center' }}>Điểm quá trình</th>
                                <th style={{ textAlign: 'center' }}>Điểm thi</th>
                                <th style={{ textAlign: 'center' }}>Tổng kết</th>
                                <th style={{ textAlign: 'center' }}>Quiz AI</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>1</td>
                                <td>Chuyển đổi số</td>
                                <td style={{ textAlign: 'center' }}>8.5</td>
                                <td style={{ textAlign: 'center' }}>—</td>
                                <td style={{ textAlign: 'center' }}>—</td>
                                <td style={{ textAlign: 'center' }}><span className="badge badge-success">90%</span></td>
                            </tr>
                            <tr>
                                <td>2</td>
                                <td>Học máy</td>
                                <td style={{ textAlign: 'center' }}>9.0</td>
                                <td style={{ textAlign: 'center' }}>—</td>
                                <td style={{ textAlign: 'center' }}>—</td>
                                <td style={{ textAlign: 'center' }}><span className="badge badge-success">85%</span></td>
                            </tr>
                            <tr>
                                <td>3</td>
                                <td>Lập trình TBDD</td>
                                <td style={{ textAlign: 'center' }}>7.5</td>
                                <td style={{ textAlign: 'center' }}>—</td>
                                <td style={{ textAlign: 'center' }}>—</td>
                                <td style={{ textAlign: 'center' }}><span className="badge badge-warning">72%</span></td>
                            </tr>
                            <tr>
                                <td>4</td>
                                <td>Xử lý ảnh</td>
                                <td style={{ textAlign: 'center' }}>8.0</td>
                                <td style={{ textAlign: 'center' }}>—</td>
                                <td style={{ textAlign: 'center' }}>—</td>
                                <td style={{ textAlign: 'center' }}><span className="badge badge-success">88%</span></td>
                            </tr>
                            <tr>
                                <td>5</td>
                                <td>Điện toán đám mây</td>
                                <td style={{ textAlign: 'center' }}>6.5</td>
                                <td style={{ textAlign: 'center' }}>—</td>
                                <td style={{ textAlign: 'center' }}>—</td>
                                <td style={{ textAlign: 'center' }}><span className="badge badge-danger">58%</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
