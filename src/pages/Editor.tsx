import { type Component, createSignal, For, onMount, Show } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { db, type Recipe } from '../db/db';
import { Camera, Save, X, Plus, Hash, Image as ImageIcon, Sparkles, Loader2, BrainCircuit } from 'lucide-solid';
import { SolidMarkdown } from 'solid-markdown';
import Tesseract from 'tesseract.js';
import { scanRecipeWithAI, cleanRecipeText } from '../utils/ai';
import clsx from 'clsx';
import toast from 'solid-toast';
import TurndownService from 'turndown';

const PREMADE_TAGS = ['meal', 'non-meal', 'breakfast', 'lunch', 'dinner', 'dessert', 'snack', 'veg'];
const DEFAULT_GEMINI_KEY = 'AIzaSyCy_w3atWUEd9ZBrZBVm-Qg64INXVUcMrA';

const Editor: Component = () => {
    const params = useParams();
    const navigate = useNavigate();
    const isEdit = !!params.id;
    const turndownService = new TurndownService();

    const [title, setTitle] = createSignal('');
    const [content, setContent] = createSignal('');
    const [tags, setTags] = createSignal<string[]>([]);
    const [tagInput, setTagInput] = createSignal('');
    const [image, setImage] = createSignal<string | Blob | null>(null);
    const [previewUrl, setPreviewUrl] = createSignal<string | null>(null);
    const [view, setView] = createSignal<'write' | 'preview'>('write');
    const [isScanning, setIsScanning] = createSignal(false);
    const [isAIScanning, setIsAIScanning] = createSignal(false);

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

    const aiScan = async () => {
        const url = previewUrl();
        if (!url) return toast.error('Please add a photo first! 🧸');

        setIsAIScanning(true);
        try {
            const apiKey = localStorage.getItem('bear_kitchen_gemini_key') || DEFAULT_GEMINI_KEY;

            // Get base64
            const response = await fetch(url);
            const blob = await response.blob();
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });
            const base64 = await base64Promise;

            // Simple "Magic" Scan (Image -> Recipe)
            const result = await scanRecipeWithAI(apiKey, base64);

            if (result.title) setTitle(result.title);
            if (result.content) setContent(result.content);
            if (result.tags) {
                const newTags = Array.from(new Set([...tags(), ...result.tags]));
                setTags(newTags);
            }

            toast.success('AI Magic complete! ✨');
        } catch (e: any) {
            console.error(e);
            toast.error(`AI Scan failed: ${e.message || e}`);
        } finally {
            setIsAIScanning(false);
        }
    };

    const scanRecipe = async () => {
        const url = previewUrl();
        if (!url) return toast.error('Please add a photo first! 🧸');

        setIsScanning(true);
        try {
            const { data: { text } } = await Tesseract.recognize(url, 'eng', {
                logger: m => console.log(m)
            });

            if (text.trim()) {
                const apiKey = localStorage.getItem('bear_kitchen_gemini_key') || DEFAULT_GEMINI_KEY;

                // Advanced Flow: Tesseract -> Clean with Gemini Text Mode
                if (confirm('OCR Complete! Do you want AI to format and clean this text? 🧠✨')) {
                    const result = await cleanRecipeText(apiKey, text);
                    if (result.title) setTitle(result.title);
                    if (result.content) setContent(result.content);
                    if (result.tags) {
                        const newTags = Array.from(new Set([...tags(), ...result.tags]));
                        setTags(newTags);
                    }
                    toast.success('Text cleaned and formatted! 🧼');
                } else {
                    setContent(prev => prev + (prev ? '\n\n---\n\n' : '') + text.trim());
                    toast.success('Raw text added! 📝');
                }
            } else {
                toast.error('Could not find any clear text in the photo. 🍯');
            }
        } catch (e: any) {
            console.error(e);
            toast.error(`Scanning failed: ${e.message || e}`);
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

    const addTag = (val?: string) => {
        const t = (val || tagInput()).trim().toLowerCase();
        if (t && !tags().includes(t)) {
            setTags([...tags(), t]);
            if (!val) setTagInput('');
        }
    };

    const removeTag = (t: string) => {
        setTags(tags().filter(item => item !== t));
    };

    const saveRecipe = async () => {
        if (!title().trim()) return toast.error('Please enter a title');

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
        toast.success('Recipe saved! 🍲');
        navigate('/');
    };

    // Paste handler for rich text
    const handlePaste = (e: ClipboardEvent) => {
        const html = e.clipboardData?.getData('text/html');
        if (html) {
            e.preventDefault();
            const markdown = turndownService.turndown(html);
            // Simple append logic
            const textarea = e.target as HTMLTextAreaElement;
            if (textarea.tagName === 'TEXTAREA') {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const old = content();
                const newVal = old.substring(0, start) + markdown + old.substring(end);
                setContent(newVal);
            } else {
                setContent(prev => prev + markdown);
            }
            toast.success('Converted rich text to Markdown! 📋');
        }
    };

    return (
        <div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 relative">

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Editor Section */}
                <div class="md:col-span-2 space-y-4">
                    {/* Sticky Bottom Bar (Replaces Top Header and Floating Input) */}
                    <div class="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-honey/50 z-50 flex items-center justify-between shadow-lg animate-in slide-in-from-bottom-full duration-500">
                        <div class="flex-1 max-w-2xl mx-auto flex gap-4 items-center">
                            <button onClick={() => navigate('/')} class="p-2 text-teddy-light hover:bg-honey/10 rounded-full transition-colors flex-shrink-0">
                                <X size={24} />
                            </button>
                            <input
                                type="text"
                                placeholder="Recipe Title..."
                                class="bear-input flex-1 text-xl font-black !py-2 !px-4 shadow-sm"
                                value={title()}
                                onInput={(e) => setTitle(e.currentTarget.value)}
                            />
                            <button onClick={saveRecipe} class="bear-button flex items-center gap-2 flex-shrink-0 shadow-lg hover:scale-105 transition-transform">
                                <Save size={20} />
                                <span class="hidden sm:inline">Save</span>
                            </button>
                        </div>
                    </div>

                    <div class="bear-card !p-0 overflow-hidden flex flex-col h-[70vh]">
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
                                    onPaste={handlePaste}
                                ></textarea>
                            </Show>
                        </div>
                    </div>
                </div>

                {/* Sidebar Controls */}
                <div class="space-y-6">
                    {/* Image Upload & AI Magic */}
                    <div class="bear-card">
                        <h4 class="font-bold flex items-center justify-between mb-4">
                            <div class="flex items-center gap-2">
                                <ImageIcon size={18} class="text-teddy-brown" />
                                Recipe Photo
                            </div>
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

                        {/* Scan Buttons */}
                        <div class="mt-4 grid grid-cols-1 gap-2">
                            <button
                                onClick={aiScan}
                                disabled={isAIScanning() || !previewUrl()}
                                class="w-full bg-teddy-brown text-white font-black py-3 rounded-xl hover:bg-teddy-dark transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                            >
                                <Show when={isAIScanning()} fallback={<BrainCircuit size={18} />}>
                                    <Loader2 size={18} class="animate-spin" />
                                </Show>
                                {isAIScanning() ? 'Gemini is Thinking...' : 'AI Magic Scan ✨'}
                            </button>

                            <button
                                onClick={scanRecipe}
                                disabled={isScanning() || !previewUrl()}
                                class="w-full text-teddy-light hover:text-teddy-brown text-xs font-bold py-1 flex items-center justify-center gap-1 opacity-60 hover:opacity-100"
                            >
                                <Sparkles size={12} /> Simple OCR Scan (with Tesseract)
                            </button>
                        </div>
                    </div>

                    {/* Tags */}
                    <div class="bear-card">
                        <h4 class="font-bold flex items-center gap-2 mb-4">
                            <Hash size={18} class="text-teddy-brown" />
                            Tags
                        </h4>

                        <div class="space-y-2 mb-4">
                            <p class="text-[10px] font-black text-teddy-light/50 uppercase">Suggested Tags:</p>
                            <div class="flex flex-wrap gap-1">
                                <For each={PREMADE_TAGS}>
                                    {(tag) => (
                                        <button
                                            onClick={() => addTag(tag)}
                                            class={clsx(
                                                "px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all border",
                                                tags().includes(tag)
                                                    ? "bg-honey text-teddy-brown border-honey"
                                                    : "bg-white text-teddy-light border-honey/20 hover:border-honey/60"
                                            )}
                                        >
                                            {tag}
                                        </button>
                                    )}
                                </For>
                            </div>
                        </div>

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
                                placeholder="Custom tag..."
                                class="bear-input text-xs flex-1 !py-1.5"
                                value={tagInput()}
                                onInput={(e) => setTagInput(e.currentTarget.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                            />
                            <button
                                onClick={() => addTag()}
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
