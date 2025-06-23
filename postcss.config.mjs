import tailwindcss from "tailwindcss";
import postcssPresetEnv from "postcss-preset-env";

export default {
  ident: "postcss",
  plugins: [
    tailwindcss,
    postcssPresetEnv({
      autoprefixer: {
        flexbox: "no-2009",
      },
      stage: 3,
    }),
  ],
};
