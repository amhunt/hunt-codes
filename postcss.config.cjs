module.exports = {
  ident: "postcss",
  plugins: [
    require("tailwindcss"),
    "postcss-flexbugs-fixes",
    [
      "postcss-preset-env",
      {
        autoprefixer: {
          flexbox: "no-2009",
        },
        stage: 3,
      },
    ],
  ],
};
