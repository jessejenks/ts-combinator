import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import tsconfig from "./tsconfig.json";

const extensions = [".js", ".jsx", ".ts", ".tsx"];

const options = {
    input: "src/",
    output: [
        {
            file: "dist/index.js",
            format: "es",
        },
        {
            file: "dist/index.cjs.js",
            format: "cjs",
        },
    ],
    plugins: [
        nodeResolve({ extensions }),
        commonjs(),
        babel({
            extensions,
            babelHelpers: "bundled",
            include: "src/**",
            exclude: tsconfig.exclude,
            presets: ["@babel/preset-env", "@babel/typescript"],
        }),
    ],
};

export default options;
