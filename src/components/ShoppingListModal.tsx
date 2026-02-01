import { type Component, Show } from 'solid-js';
import { X, Copy, ShoppingCart } from 'lucide-solid';
import toast from 'solid-toast';
import { marked } from 'marked';

interface Props {
    content: string | null;
    onClose: () => void;
}

const ShoppingListModal: Component<Props> = (props) => {
    const copyToClipboard = () => {
        if (!props.content) return;
        navigator.clipboard.writeText(props.content);
        toast.success('Copied to clipboard! 📋');
    };

    return (
        <Show when={props.content}>
            <div class="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div class="bear-card w-full max-w-2xl relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                    <div class="p-6 border-b border-honey/10 flex justify-between items-center bg-old-lace/30 rounded-t-[2rem]">
                        <div class="flex items-center gap-3">
                            <div class="bg-honey/20 p-2 rounded-full text-teddy-brown">
                                <ShoppingCart size={24} />
                            </div>
                            <h3 class="text-2xl font-black text-teddy-brown">Your Magic Shopping List</h3>
                        </div>
                        <div class="flex items-center gap-2">
                            <button
                                onClick={copyToClipboard}
                                class="p-2 text-teddy-light hover:text-teddy-brown hover:bg-honey/10 rounded-full transition-all"
                                title="Copy to clipboard"
                            >
                                <Copy size={20} />
                            </button>
                            <button onClick={props.onClose} class="text-teddy-light hover:text-teddy-brown">
                                <X size={28} />
                            </button>
                        </div>
                    </div>

                    <div class="p-8 overflow-y-auto flex-1 bg-old-lace/10">
                        <article
                            class="prose prose-teddy max-w-none prose-ul:list-none prose-li:pl-0"
                            innerHTML={marked.parse(props.content!) as string}
                        />
                    </div>

                    <div class="p-6 border-t border-honey/10 bg-white rounded-b-[2rem] flex justify-end">
                        <button
                            onClick={props.onClose}
                            class="bear-button"
                        >
                            Done! 🐻
                        </button>
                    </div>
                </div>
            </div>
        </Show>
    );
};

export default ShoppingListModal;
