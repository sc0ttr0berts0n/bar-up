import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";

createApp(App).mount("#app");

// Test automation API — exposes window.__TEST for programmatic control
import "./game/TestAPI";
