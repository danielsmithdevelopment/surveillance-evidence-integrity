/**
 * Register Challenge the Footage tools via the WebMCP browser API
 * (navigator.modelContext.registerTool) when the runtime supports it.
 * @see https://webmachinelearning.github.io/webmcp/
 */

const TOOLS = [
  {
    name: "ctf_list_vendors",
    description:
      "List footage categories and sources for challenge document generation (fixed/ALPR, body-worn, cellphone).",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    async execute() {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                footageCategories: ["fixed_surveillance", "body_worn", "cellphone"],
                vendors: ["flock", "axon", "motorola", "genetec", "verkada", "cellphone", "custom"],
                docs: "https://challengethefootage.com/llms.txt",
                guide: "FOOTAGE-CHALLENGE.md",
              },
              null,
              2
            ),
          },
        ],
      };
    },
  },
  {
    name: "ctf_get_openapi",
    description: "Return the URL and summary of the Challenge the Footage OpenAPI description.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    async execute() {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                openapi: "https://challengethefootage.com/openapi.json",
                auth: "https://challengethefootage.com/auth.md",
                health: "https://challengethefootage.com/api/health",
              },
              null,
              2
            ),
          },
        ],
      };
    },
  },
  {
    name: "ctf_navigate",
    description:
      "Navigate the browser to a Challenge the Footage page (home, terms, or public defenders).",
    inputSchema: {
      type: "object",
      properties: {
        page: {
          type: "string",
          enum: ["home", "terms", "public-defenders"],
          description: "Which page to open",
        },
      },
      required: ["page"],
      additionalProperties: false,
    },
    async execute({ page }) {
      const map = {
        home: "/",
        terms: "/terms.html",
        "public-defenders": "/public-defenders.html",
      };
      const path = map[page] || "/";
      if (typeof window !== "undefined") {
        window.location.assign(path);
      }
      return {
        content: [{ type: "text", text: `Navigating to ${path}` }],
      };
    },
  },
];

export function registerWebMcpTools() {
  if (typeof navigator === "undefined") return () => {};
  const ctx = navigator.modelContext;
  if (!ctx || typeof ctx.registerTool !== "function") return () => {};

  const controller = new AbortController();
  for (const tool of TOOLS) {
    try {
      ctx.registerTool(
        {
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
          execute: tool.execute,
        },
        { signal: controller.signal }
      );
    } catch {
      try {
        ctx.registerTool(tool);
      } catch {
        /* WebMCP unavailable or signature mismatch */
      }
    }
  }
  return () => controller.abort();
}
