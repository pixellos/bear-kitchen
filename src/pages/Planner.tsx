import { type Component, createSignal, onMount, For, Show } from 'solid-js';
import { db, type Recipe, type WeekPlan } from '../db/db';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar, Utensils, X, ShoppingCart, Loader2 } from 'lucide-solid';
import { A } from '@solidjs/router';
import clsx from 'clsx';
import toast from 'solid-toast';
import { getFirstImageUrl } from '../utils/imageUtils';
import { generateShoppingList } from '../utils/ai';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const Planner: Component = () => {
    const [weekStart, setWeekStart] = createSignal(getMonday(new Date()));
    const [plan, setPlan] = createSignal<WeekPlan | null>(null);
    const [allRecipes, setAllRecipes] = createSignal<Recipe[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = createSignal(false);
    const [selectedDay, setSelectedDay] = createSignal<typeof DAYS[number] | null>(null);
    const [shoppingListContent, setShoppingListContent] = createSignal<string | null>(null);
    const [templateName, setTemplateName] = createSignal('');
    const [isGeneratingList, setIsGeneratingList] = createSignal(false);
    const [showSidebar, setShowSidebar] = createSignal(false);

    // Helpers
    function getMonday(d: Date) {
        d = new Date(d);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const monday = new Date(d.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday;
    }

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getDayDate = (offset: number) => {
        const d = new Date(weekStart());
        d.setDate(d.getDate() + offset);
        return d;
    };

    // Load Data
    const loadPlan = async () => {
        const startStr = weekStart().toISOString();
        let p = await db.plans.where('weekStart').equals(startStr).first();

        if (!p) {
            // Create empty plan if not exists
            p = {
                weekStart: startStr,
                days: {
                    monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: []
                }
            };
            // We don't save it yet until they add something, or just use ephemeral state?
            // Let's just keep it in memory until save
        }
        setPlan(p);
        setTemplateName(p.name || '');
        setShoppingListContent(p.shoppingList || null);
    };

    onMount(async () => {
        const r = await db.recipes.toArray();
        setAllRecipes(r);
        loadPlan();
    });

    const changeWeek = (offset: number) => {
        const newDate = new Date(weekStart());
        newDate.setDate(newDate.getDate() + (offset * 7));
        setWeekStart(newDate);
        loadPlan();
    };

    const openAddModal = (day: typeof DAYS[number]) => {
        setSelectedDay(day);
        setIsAddModalOpen(true);
    };

    const addToPlan = async (recipe: Recipe) => {
        const day = selectedDay();
        const currentPlan = plan();
        if (!day || !currentPlan) return;

        // update local
        const newDays = { ...currentPlan.days, [day]: [...currentPlan.days[day], recipe.id!] };
        const newPlan = { ...currentPlan, days: newDays };
        setPlan(newPlan);

        // save to db
        if (newPlan.id) {
            await db.plans.update(newPlan.id, { days: newDays });
        } else {
            const id = await db.plans.add(newPlan);
            setPlan({ ...newPlan, id: id as number });
        }

        setIsAddModalOpen(false);
        toast.success(`Added ${recipe.title} to ${day}! 📅`);
    };

    const removeFromPlan = async (day: typeof DAYS[number], recipeId: number) => {
        if (!confirm('Remove this meal?')) return;

        const currentPlan = plan();
        if (!currentPlan) return;

        const newDays = {
            ...currentPlan.days,
            [day]: currentPlan.days[day].filter(id => id !== recipeId)
        };

        if (currentPlan.id) {
            await db.plans.update(currentPlan.id, { days: newDays });
            setPlan({ ...currentPlan, days: newDays });
        }
    };

    const handleGenerateList = async () => {
        const currentPlan = plan();
        if (!currentPlan) return;

        const recipeIds = Object.values(currentPlan.days).flat();
        if (recipeIds.length === 0) {
            toast.error('Add some recipes to your week first! 🍯');
            return;
        }

        setIsGeneratingList(true);
        try {
            const recipes = recipeIds.map(id => getRecipe(id)).filter((r): r is Recipe => !!r);
            const list = await generateShoppingList(recipes);
            setShoppingListContent(list);

            // Auto-save the list
            const currentPlan = plan();
            if (currentPlan?.id) {
                await db.plans.update(currentPlan.id, { shoppingList: list });
            }
        } catch (e) {
            toast.error('Failed to generate list. 🐻');
        } finally {
            setIsGeneratingList(false);
        }
    };

    const saveTemplateName = async (name: string) => {
        setTemplateName(name);
        const currentPlan = plan();
        if (currentPlan) {
            const updatedPlan = { ...currentPlan, name };
            setPlan(updatedPlan);
            if (currentPlan.id) {
                await db.plans.update(currentPlan.id, { name });
            } else {
                const id = await db.plans.add(updatedPlan);
                setPlan({ ...updatedPlan, id: id as number });
            }
        }
    };

    const updateShoppingListLocal = async (content: string) => {
        setShoppingListContent(content);
        const currentPlan = plan();
        if (currentPlan?.id) {
            await db.plans.update(currentPlan.id, { shoppingList: content });
        }
    };

    const getRecipe = (id: number) => allRecipes().find(r => r.id === id);

    return (
        <div class="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div class="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-honey/20">
                <div class="flex items-center gap-4">
                    <div class="bg-honey/20 p-3 rounded-full text-teddy-brown">
                        <Calendar size={24} />
                    </div>
                    <div class="flex-1">
                        <input
                            type="text"
                            placeholder="Template Name (e.g. Italian Week)..."
                            class="bg-transparent border-b-2 border-honey/20 focus:border-honey outline-none text-2xl font-black text-teddy-brown w-full placeholder:text-teddy-light/40"
                            value={templateName()}
                            onInput={(e) => saveTemplateName(e.currentTarget.value)}
                        />
                        <p class="text-teddy-light font-bold text-sm">
                            {formatDate(weekStart())} - {formatDate(getDayDate(6))}
                        </p>
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-4">
                    <button
                        onClick={() => setShowSidebar(true)}
                        class="bg-honey text-teddy-brown px-6 py-2 rounded-full font-black flex items-center gap-2 hover:bg-amber-400 transition-all shadow-md"
                    >
                        <ShoppingCart size={18} />
                        Shopping List
                    </button>

                    <div class="flex items-center gap-2 bg-honey/10 p-1 rounded-full">
                        <button onClick={() => changeWeek(-1)} class="p-2 hover:bg-white rounded-full transition-colors text-teddy-brown">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={() => setWeekStart(getMonday(new Date()))} class="px-4 py-1 text-xs font-bold text-teddy-brown hover:bg-white rounded-full transition-colors">
                            Today
                        </button>
                        <button onClick={() => changeWeek(1)} class="p-2 hover:bg-white rounded-full transition-colors text-teddy-brown">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Kanban Board */}
            <div class="grid grid-cols-1 md:grid-cols-7 gap-4">
                <For each={DAYS}>
                    {(day, index) => (
                        <div class="space-y-3">
                            {/* Column Header */}
                            <div class={clsx(
                                "p-3 rounded-2xl text-center border-b-4",
                                getDayDate(index()).toDateString() === new Date().toDateString()
                                    ? "bg-honey text-teddy-brown border-teddy-brown shadow-md scale-105 transform origin-top"
                                    : "bg-white text-teddy-light border-honey/20"
                            )}>
                                <div class="text-[10px] font-black uppercase tracking-wider opacity-70">
                                    {day.substring(0, 3)}
                                </div>
                                <div class="text-xl font-black">
                                    {getDayDate(index()).getDate()}
                                </div>
                            </div>

                            {/* Drop Zone / List */}
                            <div class="min-h-[150px] space-y-2">
                                <For each={plan()?.days[day] || []}>
                                    {(recipeId) => {
                                        const r = getRecipe(recipeId);
                                        return (
                                            <div class="bg-white rounded-2xl shadow-sm border border-honey/10 group relative hover:shadow-md transition-all flex flex-col overflow-hidden">
                                                <Show when={r}>
                                                    {getFirstImageUrl(r?.image) && (
                                                        <div class="aspect-[4/3] w-full overflow-hidden">
                                                            <img src={getFirstImageUrl(r?.image)} class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                        </div>
                                                    )}
                                                    <div class="p-2">
                                                        <div class="text-[11px] font-bold text-teddy-brown line-clamp-2 leading-tight">
                                                            {r?.title}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => removeFromPlan(day, recipeId)}
                                                        class="absolute top-1 right-1 bg-white/80 backdrop-blur-sm text-red-500 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10 hover:bg-red-50"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </Show>
                                            </div>
                                        );
                                    }}
                                </For>

                                <button
                                    onClick={() => openAddModal(day)}
                                    class="w-full py-3 border-2 border-dashed border-honey/20 rounded-xl text-honey hover:bg-honey/5 hover:border-honey transition-colors flex items-center justify-center gap-1 font-bold text-xs"
                                >
                                    <Plus size={14} /> Add
                                </button>
                            </div>
                        </div>
                    )}
                </For>
            </div>

            {/* Add Modal */}
            <Show when={isAddModalOpen()}>
                <div class="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
                    <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200">
                        <div class="p-6 border-b border-honey/10 flex justify-between items-center bg-old-lace/30">
                            <h3 class="text-xl font-black text-teddy-brown">Pick a Recipe</h3>
                            <button onClick={() => setIsAddModalOpen(false)} class="text-teddy-light hover:text-teddy-brown">
                                <X size={24} />
                            </button>
                        </div>
                        <div class="p-4 overflow-y-auto space-y-2 bg-old-lace/10 flex-1">
                            <For each={allRecipes()}>
                                {(recipe) => (
                                    <button
                                        onClick={() => addToPlan(recipe)}
                                        class="w-full text-left bg-white p-4 rounded-xl border border-honey/10 shadow-sm hover:border-honey hover:shadow-md transition-all flex gap-3 items-center group"
                                    >
                                        <div class="bg-honey/10 p-2 rounded-full text-honey group-hover:bg-honey group-hover:text-white transition-colors">
                                            <Utensils size={16} />
                                        </div>
                                        <span class="font-bold text-teddy-brown">{recipe.title}</span>
                                    </button>
                                )}
                            </For>
                            <Show when={allRecipes().length === 0}>
                                <div class="text-center py-8 text-teddy-light">
                                    No recipes yet! <A href="/new" class="underline font-bold text-honey">Create one</A> first.
                                </div>
                            </Show>
                        </div>
                    </div>
                </div>
            </Show>

            {/* Sidebar Shopping List */}
            <div class={clsx(
                "fixed inset-y-0 left-0 z-[70] w-full sm:w-[400px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out p-6 flex flex-col",
                showSidebar() ? "translate-x-0" : "-translate-x-full"
            )}>
                <div class="flex justify-between items-center mb-6">
                    <div class="flex items-center gap-3">
                        <div class="bg-honey/20 p-2 rounded-full text-teddy-brown">
                            <ShoppingCart size={24} />
                        </div>
                        <h3 class="text-xl font-black text-teddy-brown">Shopping List</h3>
                    </div>
                    <button onClick={() => setShowSidebar(false)} class="text-teddy-light hover:text-teddy-brown">
                        <X size={28} />
                    </button>
                </div>

                <div class="flex-1 overflow-y-auto mb-4 bg-old-lace/30 rounded-3xl p-4 border-2 border-honey/10">
                    <Show when={shoppingListContent()} fallback={
                        <div class="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                            <div class="text-4xl opacity-50">🛒</div>
                            <p class="text-teddy-light font-bold">No shopping list yet. Generate one to start!</p>
                        </div>
                    }>
                        <div class="prose prose-sm prose-teddy max-w-none">
                            <textarea
                                class="w-full h-full min-h-[400px] bg-transparent outline-none font-medium text-teddy-brown font-mono text-xs leading-relaxed"
                                value={shoppingListContent()!}
                                onInput={(e) => updateShoppingListLocal(e.currentTarget.value)}
                            />
                        </div>
                    </Show>
                </div>

                <div class="space-y-3">
                    <button
                        onClick={handleGenerateList}
                        disabled={isGeneratingList()}
                        class="w-full bg-teddy-brown text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-teddy-dark transition-all disabled:opacity-50 shadow-md"
                    >
                        <Show when={isGeneratingList()} fallback={<Plus size={20} />}>
                            <Loader2 size={20} class="animate-spin" />
                        </Show>
                        {isGeneratingList() ? 'Magic Generating...' : 'Magic Re-Scan ✨'}
                    </button>
                    <p class="text-[10px] text-center text-teddy-light font-bold">Units: Polish (kg/litry) 🇵🇱</p>
                </div>
            </div>

            {/* Backdrop for sidebar */}
            <Show when={showSidebar()}>
                <div
                    class="fixed inset-0 bg-black/20 backdrop-blur-sm z-[65] animate-in fade-in duration-300"
                    onClick={() => setShowSidebar(false)}
                />
            </Show>
        </div>
    );
};

export default Planner;
