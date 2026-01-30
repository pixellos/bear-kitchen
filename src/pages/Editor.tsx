import { type Component, createSignal, For, onMount, Show } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { db, type Recipe } from '../db/db';
import { Camera, Save, X, Plus, Hash, Image as ImageIcon, Sparkles, Loader2 } from 'lucide-solid';
import { SolidMarkdown } from 'solid-markdown';
import Tesseract from 'tesseract.js';


const Editor: Component = () => {
    const params = useParams();
    const navigate = useNavigate();
    const isEdit = !!params.id;

    const [title, setTitle] = createSignal('');
    const [content, setContent] = createSignal('');
    const [tags, setTags] = createSignal<string[]>([]);
    const [tagInput, setTagInput] = createSignal('');
    const [image, setImage] = createSignal<string | Blob | null>(null);
    const [previewUrl, setPreviewUrl] = createSignal<string | null>(null);
    const [view, setView] = createSignal<'write' | 'preview'>('write');
    const [isScanning, setIsScanning] = createSignal(false);

    onMount(async () => {
        if (isEdit) {
            const recipe = await db.recipes.get(Number(params.id));
            if (recipe) {
                setTitle(recipe.title);
                setContent(recipe.content);
                setTags(recipe.tags);
                if (recipe.image) {
                    setImage(recipe.image);
                    setPreviewUrl(typeof recipe.image === 'string' ? recipe.image : URL.createObjectURL(recipe.image as Blob));
                }
            }
        }
    });

    const scanRecipe = async () => {
        const url = previewUrl();
        if (!url) return alert('Please add a photo first! 🧸');

        setIsScanning(true);
        try {
            const { data: { text } } = await Tesseract.recognize(url, 'eng', {
                logger: m => console.log(m)
            });

            if (text.trim()) {
                setContent(prev => prev + (prev ? '\n\n---\n\n' : '') + text.trim());
                alert('Recipe scanned! Check the editor. 🐾');
            } else {
                alert('Could not find any clear text in the photo. 🍯');
            }
        } catch (e) {
            console.error(e);
            alert('Scanning failed. 🐻');
        } finally {
            setIsScanning(false);
        }
    };

    const handleImageChange = (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
            setImage(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const addTag = () => {
        const val = tagInput().trim().toLowerCase();
        if (val && !tags().includes(val)) {
            setTags([...tags(), val]);
            setTagInput('');
        }
    };

    const removeTag = (t: string) => {
        setTags(tags().filter(item => item !== t));
    };

    const saveRecipe = async () => {
        if (!title().trim()) return alert('Please enter a title');

        const recipeData: Partial<Recipe> = {
            title: title(),
            content: content(),
            tags: tags(),
            image: image() || undefined,
            updatedAt: Date.now(),
        };

        if (isEdit) {
            await db.recipes.update(Number(params.id), recipeData);
        } else {
            await db.recipes.add({
                ...recipeData,
                createdAt: Date.now(),
            } as Recipe);
        }
        navigate('/');
    };

    return (
        <div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header class="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-honey/30">
                <h2 class="text-2xl font-black text-teddy-brown">{isEdit ? 'Edit Recipe' : 'New Recipe'}</h2>
                <div class="flex gap-2">
                    <button onClick={() => navigate('/')} class="p-2 text-teddy-light hover:bg-honey/10 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                    <button onClick={saveRecipe} class="bear-button flex items-center gap-2">
                        <Save size={20} />
                        <span>Save</span>
                    </button>
                </div>
            </header>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Editor Section */}
                <div class="md:col-span-2 space-y-4">
                    <input
                        type="text"
                        placeholder="Cool Recipe Title..."
                        class="bear-input w-full text-3xl font-black py-4"
                        value={title()}
                        onInput={(e) => setTitle(e.currentTarget.value)}
                    />

                    <div class="bear-card !p-0 overflow-hidden flex flex-col h-[500px]">
                        <div class="bg-honey/10 flex border-b-2 border-honey/20">
                            <button
                                class={`px-6 py-3 font-bold transition-colors ${view() === 'write' ? 'bg-white text-teddy-brown' : 'text-honey hover:text-teddy-light'}`}
                                onClick={() => setView('write')}
                            >
                                Write
                            </button>
                            <button
                                class={`px-6 py-3 font-bold transition-colors ${view() === 'preview' ? 'bg-white text-teddy-brown' : 'text-honey hover:text-teddy-light'}`}
                                onClick={() => setView('preview')}
                            >
                                Preview
                            </button>
                        </div>

                        <div class="flex-1 overflow-auto p-4">
                            <Show when={view() === 'write'} fallback={
                                <article class="prose prose-teddy max-w-none">
                                    <SolidMarkdown children={content()} />
                                </article>
                            }>
                                <textarea
                                    class="w-full h-full resize-none focus:outline-none text-teddy-dark font-mono text-lg"
                                    placeholder="Tell us everything! (Markdown supported)"
                                    value={content()}
                                    onInput={(e) => setContent(e.currentTarget.value)}
                                ></textarea>
                            </Show>
                        </div>
                    </div>
                </div>

                {/* Sidebar Controls */}
                <div class="space-y-6">
                    {/* Image Upload */}
                    <div class="bear-card">
                        <h4 class="font-bold flex items-center justify-between mb-4">
                            <div class="flex items-center gap-2">
                                <ImageIcon size={18} class="text-teddy-brown" />
                                Thumbnail
                            </div>
                            <Show when={previewUrl()}>
                                <button
                                    onClick={scanRecipe}
                                    disabled={isScanning()}
                                    class="text-xs flex items-center gap-1 bg-honey/20 text-teddy-brown px-3 py-1 rounded-full hover:bg-honey/40 transition-colors disabled:opacity-50"
                                >
                                    <Show when={isScanning()} fallback={<Sparkles size={14} />}>
                                        <Loader2 size={14} class="animate-spin" />
                                    </Show>
                                    {isScanning() ? 'Reading...' : 'Scan Pic'}
                                </button>
                            </Show>
                        </h4>
                        <div
                            class="aspect-square rounded-2xl bg-honey/10 border-4 border-dashed border-honey flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer"
                            onClick={() => document.getElementById('image-upload')?.click()}
                        >
                            <Show when={previewUrl()} fallback={
                                <div class="text-center p-4">
                                    <div class="bg-honey/30 p-4 rounded-full inline-block mb-3">
                                        <Camera size={32} class="text-teddy-brown" />
                                    </div>
                                    <p class="text-sm font-bold text-teddy-light">Add a tasty photo</p>
                                </div>
                            }>
                                <img src={previewUrl()!} class="w-full h-full object-cover" />
                                <div class="absolute inset-0 bg-teddy-brown/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <span class="text-white font-bold bg-teddy-brown/80 px-4 py-2 rounded-full">Change</span>
                                </div>
                            </Show>
                            <input
                                id="image-upload"
                                type="file"
                                accept="image/*"
                                class="hidden"
                                onChange={handleImageChange}
                            />
                        </div>
                    </div>

                    {/* Tags */}
                    <div class="bear-card">
                        <h4 class="font-bold flex items-center gap-2 mb-4">
                            <Hash size={18} class="text-teddy-brown" />
                            Tags
                        </h4>
                        <div class="flex flex-wrap gap-2 mb-3">
                            <For each={tags()}>
                                {(tag) => (
                                    <span class="px-3 py-1 bg-soft-pink/30 text-teddy-brown text-sm font-bold rounded-full flex items-center gap-1 group">
                                        {tag}
                                        <button onClick={() => removeTag(tag)} class="text-teddy-light hover:text-red-500">
                                            <X size={14} />
                                        </button>
                                    </span>
                                )}
                            </For>
                        </div>
                        <div class="flex gap-2">
                            <input
                                type="text"
                                placeholder="Ex: meat, dessert..."
                                class="bear-input text-sm flex-1 !py-1.5"
                                value={tagInput()}
                                onInput={(e) => setTagInput(e.currentTarget.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                            />
                            <button
                                onClick={addTag}
                                class="bg-honey text-white p-2 rounded-xl hover:bg-teddy-light transition-colors"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Editor;
