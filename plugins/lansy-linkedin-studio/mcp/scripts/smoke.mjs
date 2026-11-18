// Smoke test: starts ../server.mjs over stdio and calls each tool. Env: LANSY_URL, LANSY_TOKEN, IMAGE (a local image path).
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"

const client = new Client({ name: "smoke", version: "0" })
await client.connect(new StdioClientTransport({ command: "node", args: [new URL("../../server.mjs", import.meta.url).pathname], env: { ...process.env } }))
const call = async (name, args = {}) => {
  const r = await client.callTool({ name, arguments: args })
  const t = r.content[0].text
  console.log(`\n── ${name}${r.isError ? " (error)" : ""}\n${t.length > 900 ? t.slice(0, 900) + " …" : t}`)
  return t
}
console.log("tools:", (await client.listTools()).tools.map((t) => t.name).join(", "))
await call("lansy_catalog")
const img = process.env.IMAGE ? await call("lansy_upload_image", { path: process.env.IMAGE }) : ""
const cut = img.match(/path: (\S+)/)?.[1]
const pages = [
  { template: "cover", variant: "Below", h: "Clinics hear the same *three* questions all day", body: "What 6,000 front-desk calls told a chain of clinics.", tag: "Healthcare", icon: "clinics" },
  { template: "number", num: "38%", h: "of calls ask about the price before the doctor", src: "Lansy pilot · 6 clinics" },
  { template: "person", name: "Dana Kim,|*front desk lead*", job: "Seoul", ...(cut ? { cut } : {}) },
]
await call("lansy_check", { title: "Smoke", pages: [{ template: "cover", h: "x *1*", bad: 1 }] })
await call("lansy_check", { title: "Smoke", pages })
const created = await call("lansy_create", { title: "Smoke: clinics", pages })
const id = created.match(/id: (\S+)/)[1], at = created.match(/updated_at: (\S+)/)[1]
const ids = JSON.parse(created.slice(created.indexOf("pages: ") + 7)).map((p) => p.id)
await call("lansy_get")
await call("lansy_update", { id, base_updated_at: at, pages: [{ id: ids[0], h: "Three *questions*, all day" }, { id: ids[1] }, { id: ids[2] }] })
await call("lansy_update", { id, base_updated_at: at, title: "stale" })
await call("lansy_upload_image", { path: "/nope.png" })
await client.close()
