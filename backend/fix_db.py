import sqlite3
conn = sqlite3.connect('medsegai_local.db')
conn.execute('UPDATE mri_studies SET status="UPLOADED" WHERE status="PROCESSING" OR status="QUEUED"')
conn.commit()
