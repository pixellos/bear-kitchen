import { type Component } from 'solid-js';
import { Router, Route } from '@solidjs/router';
import Home from './pages/Home';
import Editor from './pages/Editor';
import RecipeView from './pages/RecipeView';
import Nav from './components/Nav';

const App: Component = () => {
  return (
    <Router>
      <div class="min-h-screen flex flex-col">
        <Nav />
        <main class="flex-1 container mx-auto px-4 py-8 max-w-4xl">
          <Route path="/" component={Home} />
          <Route path="/new" component={Editor} />
          <Route path="/edit/:id" component={Editor} />
          <Route path="/recipe/:id" component={RecipeView} />
        </main>
        <footer class="text-center py-6 text-teddy-light opacity-70">
          Built with 🧸 for tasty meals
        </footer>
      </div>
    </Router>
  );
};

export default App;
