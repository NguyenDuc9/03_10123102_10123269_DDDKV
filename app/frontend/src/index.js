import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const MODEL_LABELS = {
  knn: 'K-Nearest Neighbors',
  logistic_regression: 'Logistic Regression',
  decision_tree: 'Decision Tree',
  naive_bayes: 'Naive Bayes',
};

function App() {
  const [form, setForm] = React.useState({
    gender: 'male',
    married: 'yes',
    dependents: '0',
    education: 'graduate',
    self_employed: 'no',
    applicantincome: 5000,
    coapplicantincome: 0,
    loanamount: 120,
    loan_amount_term: 360,
    credit_history: 1,
    property_area: 'urban',
  });
  const [model, setModel] = React.useState('logistic_regression');
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState('');
  const [history, setHistory] = React.useState([]);
  const [apiOnline, setApiOnline] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);

  const loadHistory = React.useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/history`);
      if (!response.ok) throw new Error('Không tải được lịch sử');
      const data = await response.json();
      setHistory(data.items || []);
    } catch {
      setHistory([]);
    }
  }, []);

  React.useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((response) => setApiOnline(response.ok))
      .catch(() => setApiOnline(false));
    loadHistory();
  }, [loadHistory]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const numericFields = [
      'applicantincome',
      'coapplicantincome',
      'loanamount',
      'loan_amount_term',
      'credit_history',
    ];
    setForm((prev) => ({
      ...prev,
      [name]:
        numericFields.includes(name) && value !== '' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setSubmitting(true);

    try {
      const features = { ...form };
      ['loanamount', 'loan_amount_term', 'credit_history'].forEach((field) => {
        if (features[field] === '') features[field] = null;
      });
      const response = await fetch(`${API_URL}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features, model }),
      });

      const data = await response.json();
      if (!response.ok) {
        const detail = data.detail;
        throw new Error(
          detail?.message || detail?.error || detail || 'Không thể gửi yêu cầu',
        );
      }
      setResult(data);
      setApiOnline(true);
      loadHistory();
    } catch (err) {
      setError(
        typeof err.message === 'string'
          ? err.message
          : 'Không thể kết nối máy chủ.',
      );
      setApiOnline(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#main" aria-label="LoanLab trang chủ">
          <span className="brand-mark">L</span>
          <span>
            Loan<span className="brand-light">Lab</span>
          </span>
        </a>
        <div className="service-status" aria-live="polite">
          <span
            className={`status-dot ${apiOnline === false ? 'offline' : ''}`}
          />
          {apiOnline === null
            ? 'Đang kết nối'
            : apiOnline
              ? 'API đang hoạt động'
              : 'API chưa kết nối'}
        </div>
      </header>
      <main id="main" className="layout">
        <section className="workspace">
          <div className="page-heading">
            <div>
              <p className="eyebrow">PHÒNG THÍ NGHIỆM HỌC MÁY</p>
              <h1>Đánh giá hồ sơ vay</h1>
              <p className="heading-copy">
                Nhập thông tin hồ sơ để so sánh dự đoán từ các mô hình phân
                loại.
              </p>
            </div>
            <div className="model-count">
              <strong>04</strong>
              <span>
                mô hình
                <br />
                sẵn sàng
              </span>
            </div>
          </div>
          <form className="form-panel" onSubmit={handleSubmit}>
            <div className="section-heading">
              <span className="section-number">01</span>
              <div>
                <h2>Thông tin người vay</h2>
                <p>Thông tin cá nhân và tài chính cơ bản</p>
              </div>
            </div>
            <div className="field-grid">
              <label className="field">
                <span>Giới tính</span>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                >
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                </select>
              </label>
              <label className="field">
                <span>Tình trạng hôn nhân</span>
                <select
                  name="married"
                  value={form.married}
                  onChange={handleChange}
                >
                  <option value="yes">Đã kết hôn</option>
                  <option value="no">Chưa kết hôn</option>
                </select>
              </label>
              <label className="field">
                <span>Người phụ thuộc</span>
                <select
                  name="dependents"
                  value={form.dependents}
                  onChange={handleChange}
                >
                  <option value="0">0 người</option>
                  <option value="1">1 người</option>
                  <option value="2">2 người</option>
                  <option value="3+">3 người trở lên</option>
                </select>
              </label>
              <label className="field">
                <span>Trình độ học vấn</span>
                <select
                  name="education"
                  value={form.education}
                  onChange={handleChange}
                >
                  <option value="graduate">Tốt nghiệp đại học</option>
                  <option value="not graduate">Chưa tốt nghiệp đại học</option>
                </select>
              </label>
              <label className="field">
                <span>Tự kinh doanh</span>
                <select
                  name="self_employed"
                  value={form.self_employed}
                  onChange={handleChange}
                >
                  <option value="no">Không</option>
                  <option value="yes">Có</option>
                </select>
              </label>
              <label className="field">
                <span>Khu vực tài sản</span>
                <select
                  name="property_area"
                  value={form.property_area}
                  onChange={handleChange}
                >
                  <option value="urban">Thành thị</option>
                  <option value="semiurban">Ngoại ô</option>
                  <option value="rural">Nông thôn</option>
                </select>
              </label>
            </div>
            <div className="section-heading finance-heading">
              <span className="section-number">02</span>
              <div>
                <h2>Khả năng tài chính</h2>
                <p>Các giá trị để trống sẽ được mô hình tự xử lý</p>
              </div>
            </div>
            <div className="field-grid finance-grid">
              <label className="field">
                <span>Thu nhập người vay</span>
                <div className="input-unit">
                  <input
                    name="applicantincome"
                    type="number"
                    min="0"
                    step="any"
                    value={form.applicantincome}
                    onChange={handleChange}
                    required
                  />
                  <small>/ năm</small>
                </div>
              </label>
              <label className="field">
                <span>Thu nhập đồng vay</span>
                <div className="input-unit">
                  <input
                    name="coapplicantincome"
                    type="number"
                    min="0"
                    step="any"
                    value={form.coapplicantincome}
                    onChange={handleChange}
                    required
                  />
                  <small>/ năm</small>
                </div>
              </label>
              <label className="field">
                <span>Số tiền vay</span>
                <div className="input-unit">
                  <input
                    name="loanamount"
                    type="number"
                    min="0"
                    step="any"
                    value={form.loanamount}
                    onChange={handleChange}
                  />
                  <small>nghìn</small>
                </div>
              </label>
              <label className="field">
                <span>Thời hạn vay</span>
                <div className="input-unit">
                  <input
                    name="loan_amount_term"
                    type="number"
                    min="0"
                    step="any"
                    value={form.loan_amount_term}
                    onChange={handleChange}
                  />
                  <small>tháng</small>
                </div>
              </label>
              <label className="field">
                <span>Lịch sử tín dụng</span>
                <select
                  name="credit_history"
                  value={form.credit_history}
                  onChange={handleChange}
                >
                  <option value={1}>Đạt yêu cầu</option>
                  <option value={0}>Chưa đạt</option>
                  <option value="">Không cung cấp</option>
                </select>
              </label>
            </div>
            <div className="form-footer">
              <label className="field model-field">
                <span>Mô hình phân loại</span>
                <select
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                >
                  {Object.entries(MODEL_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="submit-button"
                type="submit"
                disabled={submitting}
              >
                <span>
                  {submitting ? 'Đang phân tích...' : 'Phân tích hồ sơ'}
                </span>
                <span aria-hidden="true">{submitting ? '···' : '↗'}</span>
              </button>
            </div>
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
          </form>
          <p className="disclaimer">
            Kết quả chỉ phục vụ mục đích học tập, không thay thế quyết định tín
            dụng thực tế.
          </p>
        </section>
        <aside className="side-column">
          <section
            className={`result-panel ${result ? 'has-result' : ''}`}
            aria-live="polite"
          >
            <p className="eyebrow">KẾT QUẢ PHÂN TÍCH</p>
            {result ? (
              <>
                <div
                  className={`result-icon ${result.prediction === 1 ? 'approved' : 'rejected'}`}
                >
                  {result.prediction === 1 ? '✓' : '×'}
                </div>
                <h2>
                  {result.prediction === 1
                    ? 'Khả năng được duyệt'
                    : 'Khả năng bị từ chối'}
                </h2>
                <p className="result-description">
                  Dự đoán của mô hình trên hồ sơ đã cung cấp
                </p>
                <div className="probability-row">
                  <span>Xác suất duyệt</span>
                  <strong>{(result.probability * 100).toFixed(1)}%</strong>
                </div>
                <div className="probability-track">
                  <span
                    style={{
                      width: `${Math.max(0, Math.min(100, result.probability * 100))}%`,
                    }}
                  />
                </div>
                <div className="result-meta">
                  <span>Mô hình</span>
                  <strong>
                    {MODEL_LABELS[result.model_name] || result.model_name}
                  </strong>
                </div>
                <div className="result-meta">
                  <span>Mã yêu cầu</span>
                  <code>{result.request_id}</code>
                </div>
              </>
            ) : (
              <div className="empty-result">
                <span className="empty-mark">↗</span>
                <h2>Chưa có kết quả</h2>
                <p>
                  Điền thông tin hồ sơ và bắt đầu phân tích để xem dự đoán tại
                  đây.
                </p>
              </div>
            )}
          </section>
          <section className="history-panel">
            <div className="history-heading">
              <div>
                <p className="eyebrow">HOẠT ĐỘNG GẦN ĐÂY</p>
                <h2>Lịch sử dự đoán</h2>
              </div>
              <button
                type="button"
                className="refresh-button"
                onClick={loadHistory}
                aria-label="Tải lại lịch sử"
                title="Tải lại lịch sử"
              >
                ↻
              </button>
            </div>
            {history.length ? (
              <ul className="history-list">
                {history
                  .slice()
                  .reverse()
                  .slice(0, 5)
                  .map((item) => {
                    const prediction = item.output?.prediction;
                    return (
                      <li key={item.request_id}>
                        <span
                          className={`history-indicator ${prediction === 1 ? 'approved' : 'rejected'}`}
                        >
                          {prediction === 1 ? '✓' : '×'}
                        </span>
                        <span className="history-detail">
                          <strong>
                            {prediction === 1
                              ? 'Có khả năng duyệt'
                              : 'Có khả năng từ chối'}
                          </strong>
                          <small>
                            {MODEL_LABELS[item.output?.model_name] ||
                              item.output?.model_name ||
                              'Mô hình'}
                          </small>
                        </span>
                        <time>
                          {item.created_at
                            ? new Date(item.created_at).toLocaleDateString(
                                'vi-VN',
                              )
                            : ''}
                        </time>
                      </li>
                    );
                  })}
              </ul>
            ) : (
              <p className="history-empty">
                Các dự đoán gần đây sẽ xuất hiện ở đây.
              </p>
            )}
          </section>
        </aside>
      </main>
      <footer className="app-footer">
        <span>
          LOANLAB <span>·</span> DEMO HỌC MÁY
        </span>
        <span>Dữ liệu chỉ dùng cho mục đích minh họa</span>
      </footer>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
