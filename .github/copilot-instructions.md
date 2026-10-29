## graphify

For any question about this repo's architecture, structure, components, or how to add/modify/find
code, your first action should be `graphify query "<question>"` when `graphify-out/graph.json`
exists. Use `graphify path "<A>" "<B>"` for relationship questions and `graphify explain "<concept>"`
for focused-concept questions. These return a scoped subgraph, usually much smaller than the full
report or raw grep output.

Triggers: "how do I…", "where is…", "what does … do", "add/modify a <component>",
"explain the architecture", or anything that depends on how files or classes relate.

If `graphify-out/wiki/index.md` exists, use it for broad navigation. Read `graphify-out/GRAPH_REPORT.md`
only for broad architecture review or when query/path/explain do not surface enough context. Only read
source files when (a) modifying/debugging specific code, (b) the graph lacks the needed detail, or
(c) the graph is missing or stale.

Type `/graphify` in Copilot Chat to build or update the graph.

## AQURIVO MCP

Use the `aqurivo` MCP server in `.vscode/mcp.json` for supported product,
category, editorial, and public-site-settings administration. Read
`docs/AQURIVO_MCP.md` for the real data model, access gates, and verification
requirements. For new site features, inspect and modify the project source,
then run the relevant tests; MCP does not replace Copilot's normal workspace
editing and build tools. Never enable production writes, delete records, or
deploy without the user's explicit approval.
