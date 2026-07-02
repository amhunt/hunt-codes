import tailwindcss from "@tailwindcss/postcss";

// Tailwind v4 handles nesting and vendor prefixing itself via Lightning CSS,
// so its PostCSS plugin is the only entry the pipeline needs.
export default {
  plugins: [tailwindcss],
};
