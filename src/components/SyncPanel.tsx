import { type Component, createSignal, onMount, Show } from 'solid-js';
import { db, type Recipe } from '../db/db';
import { Download, Upload, Cloud, RefreshCw, X, Edit2 } from 'lucide-solid';
import { loadGoogleScripts, requestAccessToken, findOrCreateFolder, findFile, uploadFile, downloadFile } from '../utils/googleDrive';

const SyncPanel: Component<{ onClose: () => void }> = (props) => {
    const [isSyncing, setIsSyncing] = createSignal(false);
    const [status, setStatus] = createSignal('');
    const DEFAULT_CLIENT_ID = '924117517575-jm3a3911vbrusf356d11p6nag7paps0k.apps.googleusercontent.com';
    const [clientId, setClientId] = createSignal(localStorage.getItem('bear_kitchen_g_client_id') || DEFAULT_CLIENT_ID);
    const [showSettings, setShowSettings] = createSignal(!localStorage.getItem('bear_kitchen_g_client_id'));
    const DEFAULT_GEMINI_KEY = 'AIzaSyCy_w3atWUEd9ZBrZBVm-Qg64INXVUcMrA';
    const [apiKey, setApiKey] = createSignal(localStorage.getItem('bear_kitchen_gemini_key') || DEFAULT_GEMINI_KEY);
    const [isReady, setIsReady] = createSignal(false);

    onMount(() => {
        if (clientId()) {
            initializeGoogle(clientId());
        }
    });

    const initializeGoogle = (id: string) => {
        setStatus('Loading Google scripts... 🐾');
        loadGoogleScripts(id, (err) => {
            if (err) {
                setStatus('Error loading Google API 🍯');
                console.error(err);
            } else {
                setIsReady(true);
                setStatus('Ready to connect! 🐻');
            }
        });
    };

    const saveSettings = () => {
        if (clientId()) {
            localStorage.setItem('bear_kitchen_g_client_id', clientId());
            localStorage.setItem('bear_kitchen_gemini_key', apiKey());
            initializeGoogle(clientId());
            setShowSettings(false);
        }
    };

    const handleSync = async () => {
        if (!isReady()) return;
        setIsSyncing(true);
        setStatus('Connecting to Google... 🚀');

        try {
            await requestAccessToken();

            setStatus('Finding BearKitchen folder... 📂');
            const folderId = await findOrCreateFolder();

            setStatus('Checking for recipes... 📄');
            const file = await findFile(folderId, 'recipes.json');

            if (file) {
                setStatus('Downloading remote recipes... ⬇️');
                const content = await downloadFile(file.id!);
                try {
                    const remoteRecipes: Recipe[] = JSON.parse(content);
                    // Merge logic: Add all remote recipes to local DB
                    // Dexie will allow duplicates if IDs don't match, or update if they do.
                    // For simplicity in this version, we act as a "restore/merge"
                    await db.recipes.bulkPut(remoteRecipes);
                    setStatus(`Merged ${remoteRecipes.length} remote recipes! 🥣`);
                } catch (e) {
                    console.error("Merge error", e);
                    setStatus('Remote file was invalid json? 🤨');
                }
            }

            setStatus('Uploading local library... ⬆️');
            const localRecipes = await db.recipes.toArray();
            await uploadFile(folderId, 'recipes.json', JSON.stringify(localRecipes, null, 2), file?.id);

            setStatus('Sync Complete! 🎉');
            setTimeout(() => setStatus(''), 5000);

        } catch (e: any) {
            console.error(e);
            if (e?.error === 'popup_closed_by_user') {
                setStatus('Login cancelled 😔');
            } else {
                setStatus('Sync failed 💥 Check console.');
            }
        } finally {
            setIsSyncing(false);
        }
    };

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

    return (
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-teddy-brown/20 backdrop-blur-sm" onClick={props.onClose}></div>
            <div class="bear-card w-full max-w-md relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] my-auto overflow-hidden">
                <button onClick={props.onClose} class="absolute right-4 top-4 text-teddy-light hover:text-teddy-brown z-10">
                    <X size={24} />
                </button>

                <div class="text-center space-y-4 mb-6">
                    <div class="bg-honey/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-teddy-brown">
                        <Cloud size={40} />
                    </div>
                    <h3 class="text-2xl font-black text-teddy-brown">Cloud & Sync</h3>
                    <p class="text-teddy-light text-sm">Keep your recipes safe!</p>
                </div>

                <div class="space-y-4 overflow-y-auto pr-2">
                    {/* Google Sync Section */}
                    <div class="bg-white border-2 border-honey rounded-2xl p-4 space-y-3">
                        <div class="flex justify-between items-center">
                            <h4 class="font-bold text-teddy-dark flex items-center gap-2">
                                <RefreshCw size={18} /> Google Drive
                            </h4>
                            <button
                                onClick={() => setShowSettings(!showSettings())}
                                class="text-teddy-light hover:text-teddy-brown"
                            >
                                <Edit2 size={18} />
                            </button>
                        </div>

                        <Show when={showSettings()}>
                            <div class="bg-honey/10 p-3 rounded-xl space-y-4 text-sm mt-4">
                                <div class="space-y-2">
                                    <p class="font-bold text-teddy-brown underline">Google Drive Sync</p>
                                    <ol class="list-decimal pl-4 space-y-1 text-xs text-teddy-dark/80">
                                        <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" class="text-teddy-brown font-bold underline hover:text-teddy-dark">Google Cloud Console</a></li>
                                        <li>Enable <b>"Google Drive API"</b> AND <b>"Generative Language API"</b> (Search for "Generative Language"!)</li>
                                        <li>Credentials &gt; Create OAuth Client ID (Web App)</li>
                                        <li>Add <code>{window.location.origin}</code> to Authorized Origins</li>
                                        <li><b>Crucial:</b> Go to "OAuth consent screen" and add your email to "Test users"!</li>
                                    </ol>
                                    <input
                                        type="text"
                                        placeholder="Google Client ID"
                                        class="bear-input w-full text-xs"
                                        value={clientId()}
                                        onInput={(e) => setClientId(e.currentTarget.value)}
                                    />
                                </div>

                                <div class="border-t border-honey/20 pt-3 space-y-2">
                                    <p class="font-bold text-teddy-brown underline">Gemini AI (Unified Login)</p>
                                    <p class="text-[10px] text-teddy-light">AI Scan now uses your main Google login! No separate key needed if you enabled the API above. (Or paste a standalone key below as fallback)</p>
                                    <input
                                        type="password"
                                        placeholder="Optional Standalone Gemini Key"
                                        class="bear-input w-full text-xs"
                                        value={apiKey()}
                                        onInput={(e) => setApiKey(e.currentTarget.value)}
                                    />
                                </div>

                                <button onClick={saveSettings} class="w-full bg-teddy-brown text-white rounded-lg py-2 text-xs font-bold hover:bg-teddy-dark transition-colors">
                                    Save Settings & Connect
                                </button>
                            </div>
                        </Show>

                        <div class="flex flex-col gap-2">
                            <button
                                onClick={handleSync}
                                disabled={!isReady() || isSyncing()}
                                class="w-full bg-teddy-brown text-white font-bold py-3 rounded-xl hover:bg-teddy-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Show when={isSyncing()} fallback={<Cloud size={20} />}>
                                    <RefreshCw size={20} class="animate-spin" />
                                </Show>
                                {isSyncing() ? 'Syncing...' : 'Sync Now'}
                            </button>
                            <div class="text-center h-4">
                                <span class="text-xs font-bold text-teddy-light">{status()}</span>
                            </div>
                        </div>
                    </div>

                    <div class="relative py-2">
                        <div class="absolute inset-0 flex items-center" aria-hidden="true">
                            <div class="w-full border-t border-honey/30"></div>
                        </div>
                        <div class="relative flex justify-center">
                            <span class="bg-white px-2 text-xs text-teddy-light">or backup manually</span>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <button
                            onClick={exportData}
                            class="flex flex-col items-center gap-2 p-4 bg-cream/50 border-2 border-honey/20 rounded-2xl hover:bg-cream transition-colors"
                        >
                            <Download size={24} class="text-teddy-brown" />
                            <span class="text-xs font-bold text-teddy-brown">Download JSON</span>
                        </button>
                        <label class="flex flex-col items-center gap-2 p-4 bg-cream/50 border-2 border-honey/20 rounded-2xl hover:bg-cream transition-colors cursor-pointer">
                            <Upload size={24} class="text-teddy-brown" />
                            <span class="text-xs font-bold text-teddy-brown">Restore JSON</span>
                            <input type="file" accept=".json" class="hidden" onChange={importData} />
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SyncPanel;
