import { type Component } from 'solid-js';
import { Router, Route } from '@solidjs/router';
import Home from './pages/Home';
import Editor from './pages/Editor';
import RecipeView from './pages/RecipeView';
import Planner from './pages/Planner';
import Layout from './components/Layout';
import { Toaster } from 'solid-toast';

const App: Component = () => {
  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#fff',
            color: '#78350f', // teddy-brown
            border: '2px solid #fcd34d66', // honey/40
            'border-radius': '16px',
            'font-weight': 'bold',
            'font-family': 'Quicksand, sans-serif'
          }
        }}
      />
      <Router base="/bear-kitchen">
        <Route path="/" component={Layout}>
          <Route path="/" component={Home} />
          <Route path="/new" component={Editor} />
          <Route path="/edit/:id" component={Editor} />
          <Route path="/recipe/:id" component={RecipeView} />
          <Route path="/planner" component={Planner} />
        </Route>
      </Router>
    </>
  );
};


export default App;
