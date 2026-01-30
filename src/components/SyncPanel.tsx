import { type Component, createSignal } from 'solid-js';
import { db } from '../db/db';
import { Download, Upload, Cloud, RefreshCw, X } from 'lucide-solid';

const SyncPanel: Component<{ onClose: () => void }> = (props) => {
    const [isSyncing, setIsSyncing] = createSignal(false);

    const exportData = async () => {
        const recipes = await db.recipes.toArray();
        const data = JSON.stringify(recipes, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bear_kitchen_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const importData = async (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        if (!confirm('This will merge recipes into your library. Continue? 🧸')) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const data = JSON.parse(ev.target?.result as string);
                for (const recipe of data) {
                    // Simplistic merge: add if title doesn't exist? 
                    // Better: clear and replace if user wants, but merge is safer.
                    const { id, ...rest } = recipe;
                    await db.recipes.add(rest);
                }
                alert('Recipes imported! 🐾');
                window.location.reload();
            } catch (err) {
                alert('Failed to import. Is the file valid? 🍯');
            }
        };
        reader.readAsText(file);
    };

    const simulateGoogleSync = () => {
        setIsSyncing(true);
        setTimeout(() => {
            setIsSyncing(false);
            alert('Google Sync simulation: Data would be sent to your Drive folder "Bear Kitchen". (Setup Client ID to enable real sync!) 🐻');
        }, 2000);
    };

    return (
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-teddy-brown/20 backdrop-blur-sm" onClick={props.onClose}></div>
            <div class="bear-card w-full max-w-md relative animate-in zoom-in-95 duration-200">
                <button onClick={props.onClose} class="absolute right-4 top-4 text-teddy-light hover:text-teddy-brown">
                    <X size={24} />
                </button>

                <div class="text-center space-y-4">
                    <div class="bg-honey/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-teddy-brown">
                        <Cloud size={40} />
                    </div>
                    <h3 class="text-2xl font-black text-teddy-brown">Cloud & Sync</h3>
                    <p class="text-teddy-light text-sm">Keep your recipes safe across all your devices!</p>
                </div>

                <div class="mt-8 space-y-3">
                    <button
                        onClick={simulateGoogleSync}
                        class="w-full flex items-center justify-between p-4 bg-white border-2 border-honey rounded-2xl hover:bg-honey/5 transition-colors group"
                    >
                        <div class="flex items-center gap-3">
                            <RefreshCw size={20} class={`text-teddy-brown ${isSyncing() ? 'animate-spin' : ''}`} />
                            <div class="text-left">
                                <p class="font-bold text-teddy-dark">Sync with Google</p>
                                <p class="text-xs text-teddy-light">Auto-polling every 5 mins</p>
                            </div>
                        </div>
                        <div class="bg-honey/20 px-3 py-1 rounded-full text-[10px] font-black text-teddy-brown">CLOUD</div>
                    </button>

                    <div class="grid grid-cols-2 gap-3">
                        <button
                            onClick={exportData}
                            class="flex flex-col items-center gap-2 p-4 bg-cream/50 border-2 border-honey/20 rounded-2xl hover:bg-cream transition-colors"
                        >
                            <Download size={24} class="text-teddy-brown" />
                            <span class="text-xs font-bold text-teddy-brown">Backup</span>
                        </button>
                        <label class="flex flex-col items-center gap-2 p-4 bg-cream/50 border-2 border-honey/20 rounded-2xl hover:bg-cream transition-colors cursor-pointer">
                            <Upload size={24} class="text-teddy-brown" />
                            <span class="text-xs font-bold text-teddy-brown">Restore</span>
                            <input type="file" accept=".json" class="hidden" onChange={importData} />
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SyncPanel;
