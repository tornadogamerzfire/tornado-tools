# TornadoTools File Converter Backend

This backend powers the File Converter tool only. Future tools are scaffolded as folders and stub files.

## Quick start

1. Open this folder in VS Code terminal.
2. Create a virtual environment:
   ```bash
   python -m venv .venv
   ```
3. Activate it:
   - Windows:
     ```bash
     .venv\Scripts\activate
     ```
   - macOS/Linux:
     ```bash
     source .venv/bin/activate
     ```
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Run the server:
   ```bash
   uvicorn server:app --reload --host 0.0.0.0 --port 8000
   ```

## Important

- The backend creates and manages `temp/`, `uploads/`, and `outputs/` automatically.
- The `/api/converter/warmup` endpoint is used by the frontend to wake up the server.
- The download endpoint deletes output files after download, and the cleanup worker removes stale files older than 5 minutes.
