import { type Component, createSignal, For, onMount, Show, createMemo } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { db, type Recipe } from '../db/db';
import { Save, X, Plus, Hash, Image as ImageIcon, Loader2, BrainCircuit } from 'lucide-solid';
// import { SolidMarkdown } from 'solid-markdown'; // Removed
import { marked } from 'marked';
// import DOMPurify from 'dompurify';
import Tesseract from 'tesseract.js';
import { cleanRecipeTextFree } from '../utils/ai';
import clsx from 'clsx';
import toast from 'solid-toast';
import TurndownService from 'turndown';

const PREMADE_TAGS = ['meal', 'non-meal', 'breakfast', 'lunch', 'dinner', 'dessert', 'snack', 'veg'];

const Editor: Component = () => {
    const params = useParams();
    const navigate = useNavigate();
    const isEdit = !!params.id;
    const turndownService = new TurndownService();

    const [title, setTitle] = createSignal('');
    const [content, setContent] = createSignal('');
    const [tags, setTags] = createSignal<string[]>([]);
    const [tagInput, setTagInput] = createSignal('');
    const [images, setImages] = createSignal<(string | Blob)[]>([]);
    const [previewUrls, setPreviewUrls] = createSignal<string[]>([]);
    const [view, setView] = createSignal<'write' | 'preview'>('write');
    const [isScanning, setIsScanning] = createSignal(false);
    const [isBatchMode, setIsBatchMode] = createSignal(false);

    // Derived signal for parsed markdown
    const contentHtml = createMemo(() => {
        const raw = content();
        if (!raw) return '';
        try {
            const parsed = marked.parse(raw) as string;
            return parsed; // DOMPurify.sanitize(parsed);
        } catch (e) {
            console.error('Markdown error:', e);
            return '<p class="text-red-500">Error rendering markdown</p>';
        }
    });

    onMount(async () => {
        if (isEdit) {
            const recipe = await db.recipes.get(Number(params.id));
            if (recipe) {
                setTitle(recipe.title);
                setContent(recipe.content);
                setTags(recipe.tags);
                if (recipe.image) {
                    const imgs = Array.isArray(recipe.image) ? recipe.image : [recipe.image];
                    setImages(imgs);
                    setPreviewUrls(imgs.map(img => typeof img === 'string' ? img : URL.createObjectURL(img as Blob)));
                }
            }
        }
    });

    const scanRecipe = async () => {
        const urls = previewUrls();
        if (urls.length === 0) return toast.error('Please add at least one photo! 🧸');

        setIsScanning(true);

        try {
            if (isBatchMode()) {
                // Batch Mode: 1 Photo = 1 Recipe
                let successCount = 0;

                for (let i = 0; i < urls.length; i++) {
                    const url = urls[i];
                    toast(`Processing recipe ${i + 1}/${urls.length}... 🐝`);

                    // OCR
                    const { data: { text } } = await Tesseract.recognize(url, 'eng');
                    if (!text.trim()) continue;

                    // AI Clean
                    const result = await cleanRecipeTextFree(text);

                    // Add to DB
                    await db.recipes.add({
                        title: result.title || `Scanned Recipe ${new Date().toLocaleDateString()}`,
                        content: result.content || text,
                        tags: result.tags || [],
                        image: images()[i], // Associate specific image
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    } as Recipe);

                    successCount++;
                }

                toast.success(`Batch complete! Added ${successCount} recipes! 🥳`);
                navigate('/'); // Go home to see them

            } else {
                // Merge Mode (Original behavior)
                let accumulatedText = '';
                // Step 1: Sequential OCR
                for (let i = 0; i < urls.length; i++) {
                    const url = urls[i];
                    toast(`OCR Scanning photo ${i + 1}/${urls.length}... 📝`);

                    const { data: { text } } = await Tesseract.recognize(url, 'eng');
                    if (text.trim()) {
                        accumulatedText += `\n--- Photo ${i + 1} OCR ---\n${text.trim()}\n`;
                    }
                }

                if (!accumulatedText.trim()) {
                    throw new Error('No text found in any of the photos. 🍯');
                }

                // Step 2: AI Cleanup (Free AI Always)
                toast('AI is organizing and formatting... 🐝✨');
                const result = await cleanRecipeTextFree(accumulatedText);

                if (result.title && !title()) setTitle(result.title);
                if (result.content) {
                    setContent(prev => {
                        const separator = prev ? '\n\n---\n\n' : '';
                        return prev + separator + result.content;
                    });
                }
                if (result.tags) {
                    const newTags = Array.from(new Set([...tags(), ...result.tags]));
                    setTags(newTags);
                }

                toast.success('Recipes processed and formatted! 🧼');
            }

        } catch (e: any) {
            console.error(e);
            toast.error(`Scanning failed: ${e.message || e}`);
        } finally {
            setIsScanning(false);
        }
    };

    const handleImageChange = (e: Event) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
            const newFiles = Array.from(files);
            const newUrls = newFiles.map(file => URL.createObjectURL(file));

            setImages(prev => [...prev, ...newFiles]);
            setPreviewUrls(prev => [...prev, ...newUrls]);
            toast(`Added ${files.length} photo(s)! 📸`);
        }
    };

    const removeImage = (index: number) => {
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
        setImages(prev => prev.filter((_, i) => i !== index));
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
            image: images(), // now an array
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

            <div class="flex flex-col-reverse md:grid md:grid-cols-3 gap-6">
                {/* Main Editor Section */}
                <div class="md:col-span-2 space-y-4">
                    {/* Sticky Bottom Bar */}
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
                                <article
                                    class="prose prose-teddy max-w-none"
                                    innerHTML={contentHtml()}
                                />
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
                    {/* Images & AI Processing */}
                    <div class="bear-card">
                        <h4 class="font-bold flex items-center justify-between mb-4">
                            <div class="flex items-center gap-2">
                                <ImageIcon size={18} class="text-teddy-brown" />
                                Recipe Photos ({previewUrls().length})
                            </div>
                            <button
                                onClick={() => setIsBatchMode(!isBatchMode())}
                                class={clsx(
                                    "text-[10px] font-bold px-2 py-1 rounded-lg border transition-all flex items-center gap-1",
                                    isBatchMode()
                                        ? "bg-honey text-teddy-brown border-honey"
                                        : "bg-transparent text-teddy-light border-honey/20"
                                )}
                                title={isBatchMode() ? "Batch Mode: Each photo becomes a separate recipe" : "Merge Mode: All photos combined into one recipe"}
                            >
                                {isBatchMode() ? '⚡ Batch Mode' : '🔗 Merge Mode'}
                            </button>
                        </h4>

                        <div class="grid grid-cols-2 gap-2 mb-4">
                            <For each={previewUrls()}>
                                {(url, index) => (
                                    <div class="aspect-square rounded-xl bg-honey/10 border-2 border-honey relative overflow-hidden group">
                                        <img src={url} class="w-full h-full object-cover" />
                                        <button
                                            onClick={() => removeImage(index())}
                                            class="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                            </For>
                            <button
                                class="aspect-square rounded-xl bg-honey/5 border-2 border-dashed border-honey/40 flex flex-col items-center justify-center hover:bg-honey/10 transition-colors"
                                onClick={() => document.getElementById('image-upload')?.click()}
                            >
                                <Plus size={24} class="text-teddy-light" />
                                <span class="text-[10px] font-bold text-teddy-light mt-1">Add Photo</span>
                            </button>
                        </div>

                        <input
                            id="image-upload"
                            type="file"
                            accept="image/*"
                            multiple
                            class="hidden"
                            onChange={handleImageChange}
                        />

                        {/* Processing Button */}
                        <button
                            onClick={scanRecipe}
                            disabled={isScanning() || previewUrls().length === 0}
                            class="w-full bg-teddy-brown text-white font-black py-4 rounded-xl hover:bg-teddy-dark transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Show when={isScanning()} fallback={<BrainCircuit size={20} />}>
                                <Loader2 size={20} class="animate-spin" />
                            </Show>
                            {isScanning() ? 'Processesing Photos...' : 'Magic AI Scan ✨'}
                        </button>
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
