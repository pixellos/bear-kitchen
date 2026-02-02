import Dexie, { type Table } from 'dexie';

export interface Recipe {
    id?: number;
    title: string;
    content: string; // Markdown
    tags: string[];
    image?: Blob | string | (Blob | string)[];
    createdAt: number;
    updatedAt: number;
    syncedAt?: number;
}

export interface WeekPlan {
    id?: number;
    weekStart: string; // ISO date string of Monday
    name?: string; // Optional template name
    days: {
        monday: number[];
        tuesday: number[];
        wednesday: number[];
        thursday: number[];
        friday: number[];
        saturday: number[];
        sunday: number[];
    };
    shoppingList?: string; // Persistent shopping list in markdown
}

export class MyDatabase extends Dexie {
    recipes!: Table<Recipe>;
    plans!: Table<WeekPlan>;

    constructor() {
        super('TeddyRecipeDB');
        this.version(1).stores({
            recipes: '++id, title, *tags, createdAt, updatedAt'
        });

        // Add version 2 for planner
        this.version(2).stores({
            recipes: '++id, title, *tags, createdAt, updatedAt', // Keep existing
            plans: '++id, weekStart'
        });

        // Version 3: Added name and shoppingList (name as index)
        this.version(3).stores({
            recipes: '++id, title, *tags, createdAt, updatedAt',
            plans: '++id, weekStart, name'
        });
    }
}

export const db = new MyDatabase();
