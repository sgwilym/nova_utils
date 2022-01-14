import { build } from "https://deno.land/x/dnt@0.15.0/mod.ts";

await Deno.remove("npm", { recursive: true }).catch((_) => {});

await build({
  entryPoints: ["./mod.ts"],
  outDir: "./npm",
  shims: {
    deno: {
      test: "dev",
    },
    weakRef: true,
  },
  compilerOptions: {
    // This is for Node v14 support
    target: "ES2020",
  },
  mappings: {
    "https://cdn.skypack.dev/vscode-languageserver-types@3.16.0?dts": {
      name: "vscode-languageserver-types",
      version: "3.16.0",
    },
  },
  package: {
    // package.json properties
    name: "nova-extension",
    version: Deno.args[0],
    description: "Utilities and types for building Nova extensions",
    license: "MIT",
    repository: {
      type: "git",
      url: "git+https://github.com/nova-extension",
    },
    bugs: {
      url: "https://github.com/nova-extension",
    },
  },
});

// post build steps
Deno.copyFileSync("LICENSE", "npm/LICENSE");
Deno.copyFileSync("README.md", "npm/README.md");
