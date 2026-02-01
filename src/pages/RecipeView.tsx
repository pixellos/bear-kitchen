import { type Component, createResource, For, Show, createSignal } from 'solid-js';
import { useParams, useNavigate, A } from '@solidjs/router';
import { db } from '../db/db';
import { Edit2, Trash2, ArrowLeft, Clock, Tag } from 'lucide-solid';
import ImageOverlay from '../components/ImageOverlay';
// import { SolidMarkdown } from 'solid-markdown'; // Removed
import { marked } from 'marked';

const RecipeView: Component = () => {
    const params = useParams();
    const navigate = useNavigate();
    const [fullscreenImg, setFullscreenImg] = createSignal<string | null>(null);

    const [recipe] = createResource(async () => {
        return await db.recipes.get(Number(params.id));
    });

    const deleteRecipe = async () => {
        if (confirm('Are you sure you want to delete this recipe? 🧸')) {
            await db.recipes.delete(Number(params.id));
            navigate('/');
        }
    };

    return (
        <Show when={recipe()} fallback={<div class="py-20 text-center text-honey">Hunting for honey...</div>}>
            <div class="space-y-8 animate-in fade-in duration-500">
                <div class="flex justify-between items-center">
                    <button onClick={() => navigate('/')} class="flex items-center gap-2 text-teddy-light hover:text-teddy-brown font-bold transition-colors">
                        <ArrowLeft size={20} />
                        <span>Back to home</span>
                    </button>
                    <div class="flex gap-2">
                        <A href={`/edit/${params.id}`} class="p-3 bg-white text-teddy-brown border border-honey rounded-full hover:bg-honey/10 transition-colors shadow-sm">
                            <Edit2 size={20} />
                        </A>
                        <button onClick={deleteRecipe} class="p-3 bg-white text-red-500 border border-red-100 rounded-full hover:bg-red-50 transition-colors shadow-sm">
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>

                <div class="relative rounded-[3rem] overflow-hidden bg-white shadow-2xl border-b-8 border-honey/20">
                    <Show when={recipe()?.image && (Array.isArray(recipe()?.image) ? (recipe()?.image as any[]).length > 0 : true)}>
                        <div class="flex overflow-x-auto snap-x no-scrollbar bg-honey/5 h-[400px]">
                            <For each={Array.isArray(recipe()?.image) ? (recipe()?.image as (string | Blob)[]) : [recipe()?.image as (string | Blob)]}>
                                {(img) => (
                                    <div class="flex-shrink-0 w-full h-full snap-center">
                                        <img
                                            src={typeof img === 'string' ? img : URL.createObjectURL(img as Blob)}
                                            class="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform duration-500"
                                            onClick={() => setFullscreenImg(typeof img === 'string' ? img : URL.createObjectURL(img as Blob))}
                                        />
                                    </div>
                                )}
                            </For>
                        </div>
                    </Show>

                    <div class="p-8 md:p-12 space-y-6">
                        <h1 class="text-4xl md:text-6xl font-black text-teddy-dark">{recipe()?.title}</h1>

                        <div class="flex flex-wrap items-center gap-6 text-teddy-light font-bold">
                            <div class="flex items-center gap-2">
                                <Clock size={20} class="text-honey" />
                                <span>Added {new Date(recipe()?.createdAt || 0).toLocaleDateString()}</span>
                            </div>
                            <div class="flex flex-wrap gap-2">
                                <For each={recipe()?.tags}>
                                    {(tag) => (
                                        <span class="px-4 py-1.5 bg-honey/10 text-teddy-brown rounded-full border border-honey/20 flex items-center gap-2">
                                            <Tag size={14} />
                                            {tag}
                                        </span>
                                    )}
                                </For>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bear-card !p-12 !rounded-[3rem]">
                    <article
                        class="prose prose-lg prose-teddy max-w-none prose-img:rounded-3xl prose-headings:text-teddy-brown prose-headings:font-black"
                        innerHTML={marked.parse(recipe()?.content || '') as string}
                    />
                </div>
                <ImageOverlay src={fullscreenImg()} onClose={() => setFullscreenImg(null)} />
            </div>
        </Show>
    );
};

export default RecipeView;
