import { type Component } from 'solid-js';
import { Router, Route } from '@solidjs/router';
import Home from './pages/Home';
import Editor from './pages/Editor';
import RecipeView from './pages/RecipeView';
import Layout from './components/Layout';

const App: Component = () => {
  return (
    <Router base="/bear-kitchen">
      <Route path="/" component={Layout}>
        <Route path="/" component={Home} />
        <Route path="/new" component={Editor} />
        <Route path="/edit/:id" component={Editor} />
        <Route path="/recipe/:id" component={RecipeView} />
      </Route>
    </Router>
  );
};


export default App;
