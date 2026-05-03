import sqlite3
import os

db_path = 'medsegai_local.db'
if os.path.exists(db_path):
    print(f"Fixing database: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Fix user roles to uppercase as expected by UserRole enum
    cursor.execute("UPDATE users SET role='ADMIN' WHERE role='admin'")
    cursor.execute("UPDATE users SET role='DOCTOR' WHERE role='doctor'")
    cursor.execute("UPDATE users SET role='RADIOLOGIST' WHERE role='radiologist'")
    cursor.execute("UPDATE users SET role='OPERATOR' WHERE role='operator'")
    
    # Fix study status if any are in lowercase (just in case)
    cursor.execute("UPDATE mri_studies SET status='UPLOADED' WHERE status='uploaded'")
    cursor.execute("UPDATE mri_studies SET status='PROCESSING' WHERE status='processing'")
    cursor.execute("UPDATE mri_studies SET status='COMPLETED' WHERE status='completed'")
    cursor.execute("UPDATE mri_studies SET status='FAILED' WHERE status='failed'")
    
    print(f"Changes applied: {conn.total_changes}")
    conn.commit()
    conn.close()
    print("Database fixed successfully.")
else:
    print(f"Database {db_path} not found.")
