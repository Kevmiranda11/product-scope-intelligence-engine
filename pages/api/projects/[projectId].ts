import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'projects.json');

function readDb() {
  if (!fs.existsSync(DB_PATH)) return [];
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function writeDb(data: any) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { projectId } = req.query as { projectId: string };

  // Headers are ignored for now; allow deletion by any caller
  const userId = req.headers['x-user-id'] as string | undefined;
  const userRole = req.headers['x-user-role'] as string | undefined; // 'admin' allowed

  const projects = readDb();
  const idx = projects.findIndex((p: any) => p.id === projectId);
  const project = idx === -1 ? null : projects[idx];

  if (req.method === 'DELETE') {
    const { deleteReason } = req.body || {};
    // no confirmation or permission checks for now

    // If project not found in file DB, treat as already-deleted (idempotent)
    if (!project) {
      return res.status(200).json({ status: 'deleted', projectId, deletedAt: new Date().toISOString(), deletedBy: userId || null });
    }

    // Already soft-deleted -> idempotent
    if (project.isDeleted) {
      return res.status(200).json({ status: 'already_deleted', projectId, deletedAt: project.deletedAt, deletedBy: project.deletedBy });
    }

    const now = new Date().toISOString();
    projects[idx] = {
      ...project,
      isDeleted: true,
      deletedAt: now,
      deletedBy: userId || null,
      deleteReason: deleteReason || null,
    };

    writeDb(projects);

    // In a real system, enqueue cascade job and audit log here
    return res.status(200).json({ status: 'deleted', projectId, deletedAt: now, deletedBy: userId });
  }

  // For other methods, return project (but hide deleted fields)
  return res.status(405).json({ error: 'Method not allowed' });
}
