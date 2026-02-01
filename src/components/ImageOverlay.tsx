import { type Component, Show } from 'solid-js';
import { X } from 'lucide-solid';

interface Props {
    src: string | null;
    onClose: () => void;
}

const ImageOverlay: Component<Props> = (props) => {
    return (
        <Show when={props.src}>
            <div
                class="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-300"
                onClick={props.onClose}
            >
                <button
                    class="absolute top-6 right-6 text-white bg-white/20 p-3 rounded-full hover:bg-white/40 transition-colors"
                    onClick={(e) => { e.stopPropagation(); props.onClose(); }}
                >
                    <X size={32} />
                </button>
                <img
                    src={props.src!}
                    class="max-w-full max-h-full rounded-2xl shadow-2xl animate-in zoom-in duration-300"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        </Show>
    );
};

export default ImageOverlay;
