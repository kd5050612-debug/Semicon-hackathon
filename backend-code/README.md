# Backend

Run the model API from this folder:

```bash
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The backend loads `../Model_backend/SRCNN_Baseline.pth` by default. To use a different file:

```bash
set SRCNN_MODEL_PATH=C:\path\to\model.pth
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
