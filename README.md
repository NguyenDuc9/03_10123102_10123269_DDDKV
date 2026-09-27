# Bài tập lớn Học máy: Dự đoán duyệt khoản vay

Ứng dụng demo phân loại hồ sơ vay thành **được duyệt** hoặc **bị từ chối**. Dự án huấn luyện và so sánh KNN, Logistic Regression, Decision Tree và Naive Bayes trên `ai-models/data/dataset.csv`.

## Dữ liệu và quy trình

CSV gồm thông tin người vay, thu nhập, khoản vay, lịch sử tín dụng, khu vực tài sản và nhãn `loan_status` (`y`/`n`). `loan_id` không được dùng làm đặc trưng. Các pipeline tự điền giá trị thiếu, chuẩn hóa cột số và mã hóa cột phân loại. Script giữ lại 20% dữ liệu để đánh giá accuracy, precision, recall và F1.

Các file model `.joblib`, `schema.json` và `metadata.json` được lưu trong `ai-models/models/`. Khi AI service khởi động, nếu chưa có đủ model thì service tự huấn luyện từ CSV và lưu artifact; sau đó nạp cả bốn model vào RAM. Mỗi lần dự đoán chỉ chọn model đã nạp, không huấn luyện lại.

## Chạy demo bằng Docker

Yêu cầu Docker Desktop đang chạy. Tại thư mục gốc dự án:

```powershell
docker compose up --build
```

Lần đầu, AI service huấn luyện model nếu artifacts chưa tồn tại; thời gian khởi động sẽ lâu hơn. Các model được lưu lại trong `ai-models/models/` để lần chạy sau nạp thẳng vào RAM.

- Giao diện: http://localhost:3000
- Backend API và tài liệu Swagger: http://localhost:8000/docs
- AI service và tài liệu Swagger: http://localhost:8001/docs
- Trạng thái/model đã nạp: http://localhost:8001/health
- Metric và schema: http://localhost:8001/model-info
- Lịch sử dự đoán: http://localhost:8000/api/history

Dừng các dịch vụ bằng `Ctrl+C`; dùng `docker compose down` để dừng container. Model đã sinh trên máy vẫn nằm trong thư mục `ai-models/models/`.

## Chạy local không Docker (Windows PowerShell)

Tại thư mục gốc dự án, tạo/cập nhật virtual environment và cài dependencies:

```powershell
python -m venv --upgrade .venv
.\.venv\Scripts\Activate.ps1
pip install -r .\ai-models\requirements.txt
pip install -r .\app\backend\requirements.txt
```

Mở ba terminal PowerShell riêng và chạy mỗi service:

**Terminal 1 — AI service**
'''Tẻminal
cd ai-models
call ..\.venv\Scripts\activate.bat
set MODEL_DIR=%CD%\models
python -m service.main

```powershell
cd ai-models
..\.venv\Scripts\Activate.ps1
$env:MODEL_DIR = "$PWD\models"
python -m service.main
```

**Terminal 2 — Backend API** (từ thư mục gốc dự án)
''' Terminal
call .venv\Scripts\activate.bat
set AI_SERVICE_URL=http://127.0.0.1:8001
set MONGODB_URI=mongodb://127.0.0.1:27017
python .\app\backend\main.py

```powershell
.\.venv\Scripts\Activate.ps1
$env:AI_SERVICE_URL = "http://127.0.0.1:8001"
$env:MONGODB_URI = "mongodb://127.0.0.1:27017"
python .\app\backend\main.py
```

**Terminal 3 — Frontend**
'''Terminal
cd app\frontend
npm install
set REACT_APP_API_URL=http://127.0.0.1:8000
npm start

```powershell
cd app\frontend
npm install
$env:REACT_APP_API_URL = "http://127.0.0.1:8000"
npm start
```

Mở http://localhost:3000. AI service sẽ tự huấn luyện nếu chưa có model trong `ai-models/models/`. MongoDB chỉ cần nếu muốn lưu lịch sử; khi MongoDB không chạy, dự đoán vẫn hoạt động nhưng lịch sử không được lưu. Dừng từng service bằng `Ctrl+C` trong terminal tương ứng.

## Huấn luyện thủ công

Chạy tại thư mục gốc trong PowerShell:

```powershell
cd ai-models
..\.venv\Scripts\Activate.ps1
python src/train_model.py
```

Nếu chưa có virtual environment, tạo và cài thư viện:

```powershell
cd ai-models
python -m venv ..\.venv
..\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python src/train_model.py
```

Trên macOS/Linux, thay lệnh kích hoạt bằng `source ../.venv/bin/activate`. Có thể chạy lại `python src/train_model.py` sau khi cập nhật CSV để tạo lại toàn bộ artifact; khởi động lại AI service để nạp phiên bản mới.

## Gọi API

Backend nhận hồ sơ tại `POST /api/predict`. Chọn một trong `knn`, `logistic_regression`, `decision_tree`, `naive_bayes` trong trường `model`:

```json
{
  "model": "logistic_regression",
  "features": {
    "gender": "male",
    "married": "yes",
    "dependents": "0",
    "education": "graduate",
    "self_employed": "no",
    "applicantincome": 5000,
    "coapplicantincome": 0,
    "loanamount": 120,
    "loan_amount_term": 360,
    "credit_history": 1,
    "property_area": "urban"
  }
}
```

`loanamount` dùng cùng đơn vị với CSV. Các trường `loanamount`, `loan_amount_term` và `credit_history` có thể bỏ trống; pipeline sẽ điền giá trị thiếu. Phản hồi gồm nhãn dự đoán (`1` duyệt, `0` từ chối), xác suất duyệt, model và mã yêu cầu.

## Kiến trúc

```text
React frontend -> FastAPI backend -> AI service (4 model trong RAM)
																-> MongoDB (lịch sử dự đoán)
```

Kết quả chỉ phục vụ demo học tập, không dùng làm quyết định tín dụng thực tế. Hiệu năng phụ thuộc vào chất lượng và tính đại diện của dữ liệu huấn luyện.
