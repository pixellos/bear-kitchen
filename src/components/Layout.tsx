import { type Component, type ParentProps } from 'solid-js';
import Nav from './Nav';

const Layout: Component<ParentProps> = (props) => {
    return (
        <div class="min-h-screen flex flex-col">
            <Nav />
            <main class="flex-1 container mx-auto px-4 py-8 max-w-4xl">
                {props.children}
            </main>
            <footer class="text-center py-6 text-teddy-light opacity-70">
                Built with 🧸 for tasty meals
            </footer>
        </div>
    );
};

export default Layout;
