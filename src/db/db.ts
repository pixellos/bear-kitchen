import Dexie, { type Table } from 'dexie';

export interface Recipe {
    id?: number;
    title: string;
    content: string; // Markdown
    tags: string[];
    image?: Blob | string;
    createdAt: number;
    updatedAt: number;
    syncedAt?: number;
}

export class MyDatabase extends Dexie {
    recipes!: Table<Recipe>;

    constructor() {
        super('TeddyRecipeDB');
        this.version(1).stores({
            recipes: '++id, title, *tags, createdAt, updatedAt'
        });
    }
}

export const db = new MyDatabase();
