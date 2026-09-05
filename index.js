import { registerRootComponent } from "expo";
import App from "./App";

// Vegla ndihmëse për matjet, aktive vetëm gjatë zhvillimit.
if (__DEV__) require("./src/devtools/debugHooks");

registerRootComponent(App);
