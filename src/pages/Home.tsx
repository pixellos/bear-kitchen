import { type Component, createSignal, createResource, For, Show } from 'solid-js';
import { db } from '../db/db';
import { Search, Utensils, Plus, Tag } from 'lucide-solid';
import { A } from '@solidjs/router';
import clsx from 'clsx';

const PREMADE_TAGS = ['meal', 'non-meal', 'breakfast', 'lunch', 'dinner', 'dessert', 'snack', 'veg'];

const Home: Component = () => {
    const [searchQuery, setSearchQuery] = createSignal('');
    const [recipes] = createResource(async () => {
        return await db.recipes.orderBy('updatedAt').reverse().toArray();
    });

    const filteredRecipes = () => {
        const query = searchQuery().toLowerCase().trim();
        const list = recipes();
        if (!list) return [];
        if (!query) return list;

        return list.filter(r =>
            r.title.toLowerCase().includes(query) ||
            r.tags.some(t => t.toLowerCase().includes(query))
        );
    };

    const toggleFilter = (tag: string) => {
        if (searchQuery().toLowerCase() === tag) {
            setSearchQuery('');
        } else {
            setSearchQuery(tag);
        }
    };

    return (
        <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div class="text-center space-y-2">
                <h2 class="text-4xl font-black text-teddy-brown flex items-center justify-center gap-3">
                    <span class="text-5xl animate-bounce">🐻</span>
                    <span>My Cozy Recipes</span>
                </h2>
                <p class="text-teddy-light italic">"A balanced diet is a cookie in each hand!"</p>
            </div>

            <div class="space-y-4">
                <div class="relative group">
                    <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-teddy-light group-focus-within:text-teddy-brown transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name or #tag..."
                        class="bear-input pl-12"
                        value={searchQuery()}
                        onInput={(e) => setSearchQuery(e.currentTarget.value)}
                    />
                </div>

                <div class="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
                    <div class="flex-shrink-0 text-teddy-light text-xs font-bold uppercase tracking-wider pr-2">Filters:</div>
                    <For each={PREMADE_TAGS}>
                        {(tag) => (
                            <button
                                onClick={() => toggleFilter(tag)}
                                class={clsx(
                                    "px-4 py-1.5 rounded-full text-sm font-bold transition-all whitespace-nowrap border-2",
                                    searchQuery().toLowerCase() === tag
                                        ? "bg-honey text-teddy-brown border-honey shadow-sm scale-105"
                                        : "bg-white text-teddy-light border-honey/20 hover:border-honey/60"
                                )}
                            >
                                {tag === 'meal' ? '🍛 ' : tag === 'non-meal' ? '🍎 ' : ''}
                                {tag.charAt(0).toUpperCase() + tag.slice(1)}
                            </button>
                        )}
                    </For>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Show when={!recipes.loading} fallback={
                    <div class="col-span-full py-20 text-center text-teddy-brown animate-pulse">
                        <span class="text-4xl">🍯</span>
                        <p class="mt-4 font-bold">Gathering ingredients...</p>
                    </div>
                }>
                    <For each={filteredRecipes()} fallback={
                        <div class="col-span-full py-20 text-center space-y-4">
                            <div class="bg-honey/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto text-honey">
                                <Utensils size={48} />
                            </div>
                            <p class="text-teddy-light font-bold">No recipes found matching "{searchQuery()}"... 🧸</p>
                            <A href="/new" class="inline-flex items-center gap-2 text-teddy-brown font-black underline">
                                Add your first one! <Plus size={20} />
                            </A>
                        </div>
                    }>
                        {(recipe) => (
                            <A href={`/recipe/${recipe.id}`} class="group">
                                <article class="bear-card h-full flex flex-col gap-4 group-hover:scale-[1.02] transition-transform duration-300">
                                    {recipe.image && (Array.isArray(recipe.image) ? recipe.image.length > 0 : true) && (
                                        <div class="aspect-video rounded-2xl overflow-hidden -mx-2 -mt-2">
                                            <img
                                                src={(() => {
                                                    const img = Array.isArray(recipe.image) ? recipe.image[0] : recipe.image;
                                                    return typeof img === 'string' ? img : URL.createObjectURL(img as Blob);
                                                })()}
                                                alt={recipe.title}
                                                class="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}

                                    <div class="space-y-2 flex-1">
                                        <h3 class="text-xl font-black text-teddy-brown group-hover:text-amber-700 transition-colors uppercase tracking-tight">
                                            {recipe.title}
                                        </h3>
                                        <div class="flex flex-wrap gap-2">
                                            <For each={recipe.tags}>
                                                {(tag) => (
                                                    <span class="inline-flex items-center gap-1 bg-honey/10 text-teddy-brown px-2 py-0.5 rounded-lg text-xs font-bold border border-honey/20">
                                                        <Tag size={10} /> {tag}
                                                    </span>
                                                )}
                                            </For>
                                        </div>
                                    </div>
                                    <div class="text-[10px] text-teddy-light/50 font-bold uppercase pt-2 border-t border-honey/10 flex justify-between">
                                        <span>Last updated</span>
                                        <span>{new Date(recipe.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                </article>
                            </A>
                        )}
                    </For>
                </Show>
            </div>
        </div>
    );
};

export default Home;
