import sqlite3
import json
from datetime import datetime

class DatabaseManager:
    def __init__(self, db_path="database.db"):
        self.db_path = db_path
        self.init_db()

    def get_connection(self):
        return sqlite3.connect(self.db_path)

    def init_db(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            # Tabella Richieste e Task
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS requests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    channel TEXT,
                    user_category TEXT,
                    user_urgency TEXT,
                    created_at TEXT,
                    notes TEXT,
                    pred_category TEXT,
                    pred_priority TEXT,
                    pred_role TEXT,
                    confidence REAL,
                    needs_review INTEGER,
                    reasoning TEXT,
                    status TEXT DEFAULT 'Nuovo',
                    final_category TEXT,
                    final_priority TEXT,
                    final_role TEXT,
                    correction_reason TEXT
                )
            ''')
            # Tabella Sessioni di Test
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS test_runs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_date TEXT,
                    variant TEXT,
                    total_samples INTEGER,
                    accuracy_cat REAL,
                    accuracy_prio REAL,
                    accuracy_role REAL,
                    review_rate REAL,
                    avg_time_ms REAL,
                    raw_results_json TEXT
                )
            ''')
            # Tabella Feedback Utente
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_feedback (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT,
                    session_id TEXT,
                    worked_well TEXT,
                    unclear_aspects TEXT,
                    errors_found TEXT,
                    suggested_improvements TEXT,
                    priority TEXT
                )
            ''')
            conn.commit()

    def insert_request(self, req_data):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO requests (title, description, channel, user_category, user_urgency, created_at, notes,
                                      pred_category, pred_priority, pred_role, confidence, needs_review, reasoning, status,
                                      final_category, final_priority, final_role)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                req_data['title'], req_data['description'], req_data.get('channel', 'Email'),
                req_data.get('user_category', ''), req_data.get('user_urgency', ''),
                req_data.get('created_at', datetime.now().isoformat()), req_data.get('notes', ''),
                req_data.get('pred_category', ''), req_data.get('pred_priority', ''), req_data.get('pred_role', ''),
                req_data.get('confidence', 0.0), 1 if req_data.get('needs_review') else 0, req_data.get('reasoning', ''),
                req_data.get('status', 'Nuovo'), req_data.get('pred_category', ''), req_data.get('pred_priority', ''),
                req_data.get('pred_role', '')
            ))
            conn.commit()
            return cursor.lastrowid

    def get_all_requests(self):
        with self.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM requests ORDER BY id DESC")
            return [dict(row) for row in cursor.fetchall()]

    def update_request_review(self, req_id, final_cat, final_prio, final_role, reason):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE requests 
                SET final_category = ?, final_priority = ?, final_role = ?, 
                    correction_reason = ?, needs_review = 0, status = 'In Lavorazione'
                WHERE id = ?
            ''', (final_cat, final_prio, final_role, reason, req_id))
            conn.commit()

    def save_test_run(self, variant, total, acc_cat, acc_prio, acc_role, review_rate, avg_time, raw_json):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO test_runs (run_date, variant, total_samples, accuracy_cat, accuracy_prio, accuracy_role, review_rate, avg_time_ms, raw_results_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (datetime.now().isoformat(), variant, total, acc_cat, acc_prio, acc_role, review_rate, avg_time, json.dumps(raw_json)))
            conn.commit()

    def get_test_runs(self):
        with self.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM test_runs ORDER BY id DESC")
            return [dict(row) for row in cursor.fetchall()]

    def insert_feedback(self, fb_data):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO user_feedback (created_at, session_id, worked_well, unclear_aspects, errors_found, suggested_improvements, priority)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (datetime.now().isoformat(), fb_data['session_id'], fb_data['worked_well'], fb_data['unclear_aspects'],
                  fb_data['errors_found'], fb_data['suggested_improvements'], fb_data['priority']))
            conn.commit()

    def get_all_feedback(self):
        with self.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM user_feedback ORDER BY id DESC")
            return [dict(row) for row in cursor.fetchall()]