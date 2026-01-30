import { type Component, createSignal, For, Show, onMount } from 'solid-js';
import { db, type Recipe } from '../db/db';
import { liveQuery } from 'dexie';
import { A } from '@solidjs/router';
import { Search, Tag, Image as ImageIcon, Utensils } from 'lucide-solid';

const Home: Component = () => {
    const [search, setSearch] = createSignal('');


    const [filteredRecipes, setFilteredRecipes] = createSignal<Recipe[]>([]);

    onMount(() => {
        const sub = liveQuery(() => db.recipes.orderBy('updatedAt').reverse().toArray()).subscribe({
            next: (val) => setFilteredRecipes(val),
        });
        return () => sub.unsubscribe();
    });

    const getFiltered = () => {
        const q = search().toLowerCase();
        return filteredRecipes().filter(r =>
            r.title.toLowerCase().includes(q) ||
            r.tags.some(t => t.toLowerCase().includes(q))
        );
    };

    return (
        <div class="space-y-8">
            <header class="text-center space-y-4">
                <h1 class="text-5xl font-black text-teddy-brown">My Cozy Recipes</h1>
                <p class="text-teddy-light">What are we cooking today, little bear?</p>
            </header>

            <div class="relative max-w-md mx-auto">
                <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-honey" size={20} />
                <input
                    type="text"
                    placeholder="Search Title or Tags..."
                    class="bear-input w-full pl-12 h-14 text-lg"
                    onInput={(e) => setSearch(e.currentTarget.value)}
                />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <For each={getFiltered()} fallback={
                    <div class="col-span-full py-20 text-center space-y-4">
                        <div class="bg-honey/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto text-honey">
                            <Utensils size={48} />
                        </div>
                        <p class="text-honey text-xl font-bold">No recipes found yet...</p>
                    </div>
                }>
                    {(recipe) => (
                        <A href={`/recipe/${recipe.id}`} class="bear-card group flex flex-col h-full">
                            <div class="h-48 -mx-6 -mt-6 mb-4 bg-honey/30 rounded-t-[1.6rem] overflow-hidden relative">
                                <Show when={recipe.image} fallback={
                                    <div class="w-full h-full flex items-center justify-center text-honey/50">
                                        <ImageIcon size={64} />
                                    </div>
                                }>
                                    <img
                                        src={typeof recipe.image === 'string' ? recipe.image : URL.createObjectURL(recipe.image as Blob)}
                                        class="w-full h-full object-cover transition-transform group-hover:scale-110"
                                    />
                                </Show>
                            </div>

                            <div class="flex-1 space-y-2">
                                <h3 class="text-2xl font-bold text-teddy-dark line-clamp-1">{recipe.title}</h3>
                                <div class="flex flex-wrap gap-2">
                                    <For each={recipe.tags}>
                                        {(tag) => (
                                            <span class="px-3 py-1 bg-soft-pink/30 text-teddy-brown text-xs font-bold rounded-full flex items-center gap-1">
                                                <Tag size={12} />
                                                {tag}
                                            </span>
                                        )}
                                    </For>
                                </div>
                            </div>

                            <div class="mt-4 pt-4 border-t border-honey/20 text-xs text-honey flex justify-between items-center">
                                <span>{new Date(recipe.updatedAt).toLocaleDateString()}</span>
                                <span class="font-bold text-teddy-light underline">Read More</span>
                            </div>
                        </A>
                    )}
                </For>
            </div>
        </div>
    );
};

export default Home;
