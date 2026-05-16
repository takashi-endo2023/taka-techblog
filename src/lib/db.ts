import { openDB, type DBSchema } from 'idb';

export interface Project {
  id?: number;
  title: string;
  tech: string[];
  description: string;
  createdAt: Date;
}

interface PortfolioDB extends DBSchema {
  projects: {
    key: number;
    value: Project;
    indexes: { 'by-date': Date };
  };
}

const DB_NAME = 'portfolio-db';
const DB_VERSION = 1;

export const getDB = () =>
  openDB<PortfolioDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore('projects', {
        keyPath: 'id',
        autoIncrement: true,
      });
      store.createIndex('by-date', 'createdAt');
    },
  });

export const projectsRepository = {
  async getAll(): Promise<Project[]> {
    const db = await getDB();
    return db.getAllFromIndex('projects', 'by-date');
  },
  async create(project: Omit<Project, 'id'>): Promise<number> {
    const db = await getDB();
    return db.add('projects', project);
  },
  async update(id: number, project: Partial<Omit<Project, 'id'>>): Promise<number> {
    const db = await getDB();
    const existing = await db.get('projects', id);
    if (!existing) throw new Error(`Project ${id} not found`);
    return db.put('projects', { ...existing, ...project });
  },
  async delete(id: number): Promise<void> {
    const db = await getDB();
    return db.delete('projects', id);
  },
  async seed(initialData: Omit<Project, 'id'>[]): Promise<void> {
    const db = await getDB();
    const count = await db.count('projects');
    if (count > 0) return;
    const tx = db.transaction('projects', 'readwrite');
    await Promise.all(initialData.map((p) => tx.store.add(p)));
    await tx.done;
  },
};
