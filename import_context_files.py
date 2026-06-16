import os
import subprocess

agent_id = '019ec486-ff67-7ce3-9d22-0381ad7cfe3f'
tenant_id = '0193a5b0-7000-7000-8000-000000000001'
files = ['SOUL.md', 'USER.md', 'AGENTS.md', 'HEARTBEAT.md']
base_dir = '/opt/my-website/context-files'

for fname in files:
    fpath = os.path.join(base_dir, fname)
    if os.path.exists(fpath):
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # We can execute the query directly using docker exec psql
        # To avoid escaping issues, we use psql --set or similar, or python to execute it.
        # But wait! We can just use python to execute docker exec psql with stdin!
        sql = """
        INSERT INTO agent_context_files (agent_id, tenant_id, file_name, content)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (agent_id, file_name) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW();
        """
        
        # Since psql doesn't support parameterized queries from shell easily, we can escape content by doubling single quotes
        escaped_content = content.replace("'", "''")
        query = f"INSERT INTO agent_context_files (agent_id, tenant_id, file_name, content) VALUES ('{agent_id}', '{tenant_id}', '{fname}', '{escaped_content}') ON CONFLICT (agent_id, file_name) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW();"
        
        cmd = ["docker", "exec", "-i", "ai-agent-postgres-1", "psql", "-U", "goclaw", "-d", "goclaw"]
        process = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        stdout, stderr = process.communicate(input=query)
        
        if process.returncode != 0:
            print(f"Error importing {fname}: {stderr}")
        else:
            print(f"Successfully imported {fname} into goClaw database.")
