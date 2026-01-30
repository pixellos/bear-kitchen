import { type Component, createSignal, Show } from 'solid-js';
import { A } from '@solidjs/router';
import { Utensils, Plus, Cloud } from 'lucide-solid';
import SyncPanel from './SyncPanel';

const Nav: Component = () => {
    const [showSync, setShowSync] = createSignal(false);

    return (
        <nav class="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b-4 border-honey">
            <div class="container mx-auto px-4 h-20 flex items-center justify-between">
                <A href="/" class="flex items-center gap-3 group">
                    <div class="bg-teddy-brown p-2 rounded-full group-hover:rotate-12 transition-transform shadow-lg">
                        <Utensils class="text-white" size={24} />
                    </div>
                    <span class="text-2xl font-black tracking-tight text-teddy-brown hidden sm:inline">
                        BearKitchen
                    </span>
                </A>

                <div class="flex items-center gap-4">
                    <button
                        class="p-2 text-teddy-light hover:text-teddy-brown transition-colors"
                        title="Sync with Google"
                        onClick={() => setShowSync(true)}
                    >
                        <Cloud size={24} />
                    </button>
                    <A href="/new" class="bear-button flex items-center gap-2">
                        <Plus size={20} />
                        <span class="hidden xs:inline">Add Recipe</span>
                    </A>
                </div>
            </div>
            <Show when={showSync()}>
                <SyncPanel onClose={() => setShowSync(false)} />
            </Show>
        </nav>
    );
};

export default Nav;
