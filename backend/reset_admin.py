import bcrypt
import sqlite3
import os

db_path = 'medsegai_local.db'
if os.path.exists(db_path):
    print(f"Resetting admin password in: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    password = "Admin123!"
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    cursor.execute("UPDATE users SET hashed_password=? WHERE email='admin@medsegai.com'", (hashed,))
    conn.commit()
    
    if cursor.rowcount > 0:
        print("Admin password reset successfully to 'Admin123!'")
    else:
        print("User admin@medsegai.com not found. Creating one...")
        import uuid
        user_id = str(uuid.uuid4()).replace("-", "")
        cursor.execute("""
            INSERT INTO users (id, email, hashed_password, full_name, role, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        """, (user_id, 'admin@medsegai.com', hashed, 'System Administrator', 'ADMIN', 1))
        conn.commit()
        print("Admin user created successfully.")
    
    conn.close()
else:
    print(f"Database {db_path} not found.")
