import { type Component, createSignal, onMount, For, Show } from 'solid-js';
import { db, type Recipe, type WeekPlan } from '../db/db';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar, Utensils, X, ShoppingCart, Loader2 } from 'lucide-solid';
import { A } from '@solidjs/router';
import clsx from 'clsx';
import toast from 'solid-toast';
import { getFirstImageUrl } from '../utils/imageUtils';
import { generateShoppingList } from '../utils/ai';
import ShoppingListModal from '../components/ShoppingListModal';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const Planner: Component = () => {
    const [weekStart, setWeekStart] = createSignal(getMonday(new Date()));
    const [plan, setPlan] = createSignal<WeekPlan | null>(null);
    const [allRecipes, setAllRecipes] = createSignal<Recipe[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = createSignal(false);
    const [selectedDay, setSelectedDay] = createSignal<typeof DAYS[number] | null>(null);
    const [shoppingListContent, setShoppingListContent] = createSignal<string | null>(null);
    const [isGeneratingList, setIsGeneratingList] = createSignal(false);

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
        } catch (e) {
            toast.error('Failed to generate list. 🐻');
        } finally {
            setIsGeneratingList(false);
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
                    <div>
                        <h2 class="text-2xl font-black text-teddy-brown">Week Template Manager</h2>
                        <p class="text-teddy-light font-bold">
                            {formatDate(weekStart())} - {formatDate(getDayDate(6))}
                        </p>
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-4">
                    <button
                        onClick={handleGenerateList}
                        disabled={isGeneratingList()}
                        class="bg-teddy-brown text-white px-6 py-2 rounded-full font-black flex items-center gap-2 hover:bg-teddy-dark transition-all disabled:opacity-50 shadow-md"
                    >
                        <Show when={isGeneratingList()} fallback={<ShoppingCart size={18} />}>
                            <Loader2 size={18} class="animate-spin" />
                        </Show>
                        {isGeneratingList() ? 'Generating...' : 'Magic Shopping List ✨'}
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
                                            <div class="bg-white p-2 rounded-xl shadow-sm border border-honey/10 group relative hover:shadow-md transition-shadow flex gap-2">
                                                <Show when={r}>
                                                    {getFirstImageUrl(r?.image) && (
                                                        <div class="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                                            <img src={getFirstImageUrl(r?.image)} class="w-full h-full object-cover" />
                                                        </div>
                                                    )}
                                                    <div class="flex-1 min-w-0">
                                                        <div class="text-[11px] font-bold text-teddy-brown line-clamp-2 leading-tight mb-1">
                                                            {r?.title}
                                                        </div>
                                                        <div class="flex gap-1 flex-wrap">
                                                            <For each={r?.tags.slice(0, 1)}>
                                                                {t => <span class="text-[8px] bg-honey/10 px-1 py-0.5 rounded text-teddy-light font-bold">{t}</span>}
                                                            </For>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => removeFromPlan(day, recipeId)}
                                                        class="absolute -top-1 -right-1 bg-red-100 text-red-500 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                                                    >
                                                        <Trash2 size={10} />
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

            <ShoppingListModal
                content={shoppingListContent()}
                onClose={() => setShoppingListContent(null)}
            />
        </div>
    );
};

export default Planner;
