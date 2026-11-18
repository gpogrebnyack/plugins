// Lansy Studio MCP: a thin stdio bridge to the studio's /api/v1. The API checks everything and lays pages out;
// this server adds what only the user's machine can do (read local images) and turns reports into short text.
import { readFile, stat } from "node:fs/promises"
import path from "node:path"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import * as z from "zod/v4"

const BASE = (process.env.LANSY_URL || "https://lansy-studio.vercel.app").replace(/\/+$/, "")
const TOKEN = (process.env.LANSY_TOKEN || "").trim()

type Note = { level: "error" | "warning" | "info"; page?: number; field?: string; message: string }
type PageReport = { page: number; template: string; variant?: string; headline?: { size: string; lines: number }; fits: boolean; notes: Note[] }
type ApiResult = { ok?: boolean; error?: string; errors?: Note[]; notes?: Note[]; report?: PageReport[]; [k: string]: unknown }

class ApiError extends Error {}

async function api(method: string, route: string, body?: unknown, type = "application/json"): Promise<ApiResult> {
  if (!TOKEN) throw new ApiError("No Lansy token. Create one in Lansy Studio → account menu → Agent access, then run /plugin configure lansy-linkedin-studio@gpogrebnyack and paste it.")
  if (!/^lsk_[A-Za-z0-9_-]{43}$/.test(TOKEN)) throw new ApiError(`The saved Lansy token isn't a token: it is ${TOKEN.length} characters${TOKEN.startsWith("lsk_") ? "" : " and doesn't start with lsk_"}, a token is 47 and starts with lsk_. Run /plugin configure lansy-linkedin-studio@gpogrebnyack again, paste the whole token from Agent access, then /reload-plugins.`)
  let res: Response
  try {
    res = await fetch(BASE + "/api/v1" + route, {
      method,
      headers: { Authorization: "Bearer " + TOKEN, ...(body !== undefined ? { "Content-Type": type } : {}) },
      body: body === undefined ? undefined : type === "application/json" ? JSON.stringify(body) : (body as BodyInit),
    })
  } catch (e) {
    throw new ApiError(`Can't reach Lansy Studio at ${BASE}: ${(e as Error).message}`)
  }
  const data = (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as ApiResult
  if (res.status === 401) throw new ApiError(data.error || "The token was refused: create a new one in Agent access.")
  if (res.status === 422 && data.errors) return { ...data, ok: false }
  if (res.status === 409) throw new ApiError(`The carousel changed since you read it (the user may be editing it in the studio). Read it again with lansy_get and reapply your changes. Current updated_at: ${data.updated_at}`)
  if (!res.ok) throw new ApiError(`${data.error || `HTTP ${res.status}`}${data.updated_at ? ` (current updated_at: ${data.updated_at})` : ""}`)
  return data
}

// ── text the model reads ──
const mark = { error: "✗", warning: "!", info: "i" }
const noteLine = (n: Note) => `${mark[n.level]} ${n.page ? `p${n.page} ` : ""}${n.field ? n.field + ": " : ""}${n.message}`
function reportText(r: ApiResult) {
  if (r.ok === false) return ["Not saved: fix these and send again.", ...(r.errors ?? []).map(noteLine)].join("\n")
  const pages = r.report ?? []
  const warn = pages.flatMap((p) => p.notes).concat(r.notes ?? [])
  const lines = [
    `Fits: ${pages.every((p) => p.fits) ? "all pages" : "NO — pages " + pages.filter((p) => !p.fits).map((p) => p.page).join(", ")} · ${warn.filter((n) => n.level === "warning").length} warnings · ${warn.filter((n) => n.level === "info").length} info`,
    ...pages.map((p) => `p${p.page} ${p.template}/${p.variant}${p.headline ? ` · headline ${p.headline.size}, ${p.headline.lines} line${p.headline.lines > 1 ? "s" : ""}` : ""}${p.notes.length ? "\n" + p.notes.map((n) => "   " + noteLine({ ...n, page: undefined })).join("\n") : ""}`),
    ...(r.notes ?? []).map(noteLine),
  ]
  return lines.join("\n")
}
const text = (...parts: string[]) => ({ content: [{ type: "text" as const, text: parts.filter(Boolean).join("\n\n") }] })
const fail = (e: unknown) => ({ content: [{ type: "text" as const, text: e instanceof ApiError ? e.message : `Unexpected error: ${(e as Error).message}` }], isError: true })
const json = (v: unknown) => JSON.stringify(v)
const idOf = (s: string) => s.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0] ?? s

// ── schemas ──
const page = z.record(z.string(), z.unknown()).describe("{ template, variant?, …fields, vis?, …picture fields } — the fields each template takes are in lansy_catalog. On update, { id } keeps a page as it is; { id, …changes } edits it.")
const pages = z.array(page).min(1).max(20)
const theme = z.enum(["lime", "green"])

const server = new McpServer(
  { name: "lansy-linkedin-studio", version: "0.2.1" },
  {
    instructions: [
      "Lansy Studio builds LinkedIn posts from brand templates: a carousel of 4:5 pages, or a single-image post (a carousel of one page). The layout engine sizes and places everything.",
      "Workflow: lansy_catalog once → write the pages → lansy_check until it fits with no warnings you can fix → lansy_create → give the user the studio link.",
      "Pictures from the user's disk go through lansy_upload_image first; pass the returned path as img (photo), cut (person without background) or uiImg (screenshot).",
      "Copy is English. Facts come from the user; never invent numbers or names. One *marked* phrase per text at most, never on digits.",
    ].join(" "),
  },
)

server.registerTool(
  "lansy_catalog",
  {
    title: "Lansy catalog",
    description: "Templates, their variants and which picture each variant takes, fields (required, marker allowed), photo/icon/screen libraries, industries, text rules. Read it before writing pages.",
    annotations: { readOnlyHint: true },
  },
  async () => {
    try { return text(json(await api("GET", "/catalog"))) } catch (e) { return fail(e) }
  },
)

server.registerTool(
  "lansy_check",
  {
    title: "Check a carousel",
    description: "Dry run: validates pages and lays them out with the brand fonts, nothing saved. Reports errors, pages that don't fit (with how many characters would fit), headline size L/M, empty pictures. With id, checks an update of that carousel.",
    inputSchema: { title: z.string().optional(), theme: theme.optional(), pages, id: z.string().optional().describe("carousel id or studio link, to check an update") },
    annotations: { readOnlyHint: true },
  },
  async ({ title, theme, pages, id }) => {
    try {
      const r = await api("POST", "/check", { title: title ?? "Check", theme, pages, ...(id ? { id: idOf(id) } : {}) })
      return text(r.ok ? "Valid." : "", reportText(r))
    } catch (e) { return fail(e) }
  },
)

server.registerTool(
  "lansy_create",
  {
    title: "Create a carousel",
    description: "Saves a new carousel (or a one-page single-image post) in the user's Lansy Studio and returns its link for fine-tuning. Run lansy_check first.",
    inputSchema: { title: z.string().min(1).max(120).describe("carousel name in the studio list"), theme: theme.optional().describe("accent colour, default lime"), pages },
  },
  async ({ title, theme, pages }) => {
    try {
      const r = await api("POST", "/carousels", { title, theme, pages })
      if (r.ok === false) return text(reportText(r))
      return text(`Created: ${r.url}\nid: ${r.id} · updated_at: ${r.updated_at}`, reportText(r), "pages: " + json(r.pages))
    } catch (e) { return fail(e) }
  },
)

server.registerTool(
  "lansy_get",
  {
    title: "Read carousels",
    description: "Without id: the user's carousels, newest first. With id (or a studio link): its pages (with page ids), updated_at and the current report — read it right before lansy_update, the user may have edited it in the studio.",
    inputSchema: { id: z.string().optional() },
    annotations: { readOnlyHint: true },
  },
  async ({ id }) => {
    try {
      if (!id) {
        const r = (await api("GET", "/carousels")) as { carousels?: { id: string; title: string; page_count: number; updated_at: string; url: string }[] }
        return text((r.carousels ?? []).map((d) => `${d.title} · ${d.page_count} pages · ${d.updated_at.slice(0, 16).replace("T", " ")} · ${d.url}`).join("\n") || "No carousels yet.")
      }
      const r = await api("GET", "/carousels/" + idOf(id))
      return text(`${r.title} · theme ${r.theme} · ${r.url}\nid: ${r.id} · updated_at: ${r.updated_at}`, reportText({ ...r, ok: true }), "pages: " + json(r.pages))
    } catch (e) { return fail(e) }
  },
)

server.registerTool(
  "lansy_update",
  {
    title: "Update a carousel",
    description: "Changes a carousel over the version you read (base_updated_at from lansy_get or lansy_create); if the user changed it since, it fails and you read it again. pages is the WHOLE new list in order: { id } keeps a page untouched, { id, …changes } edits it, a page without id is added, a page left out is deleted. Omit pages to change only title or theme.",
    inputSchema: { id: z.string(), base_updated_at: z.string(), title: z.string().min(1).max(120).optional(), theme: theme.optional(), pages: pages.optional() },
  },
  async ({ id, base_updated_at, title, theme, pages }) => {
    try {
      const r = await api("PUT", "/carousels/" + idOf(id), { base_updated_at, title, theme, pages })
      if (r.ok === false) return text(reportText(r))
      return text(`Updated: ${r.url}\nupdated_at: ${r.updated_at}`, reportText(r), "pages: " + json(r.pages))
    } catch (e) { return fail(e) }
  },
)

const TYPES: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif" }
server.registerTool(
  "lansy_upload_image",
  {
    title: "Upload an image",
    description: "Uploads a local image (PNG, JPEG, WebP, AVIF, up to 4 MB) into the user's studio library. Returns the path for img (photo), cut (a person without background: PNG/WebP with transparency) or uiImg (a screenshot). Says whether the image has transparency.",
    inputSchema: { path: z.string().describe("absolute path to the file") },
  },
  async ({ path: file }) => {
    try {
      const ext = path.extname(file).toLowerCase(), type = TYPES[ext]
      if (!type) return fail(new ApiError(`Unsupported file type ${ext || "(none)"}: convert to PNG or JPEG first (HEIC: sips -s format jpeg in.heic --out out.jpg).`))
      const size = (await stat(file)).size
      if (size > 4 * 1024 * 1024) return fail(new ApiError(`The file is ${(size / 1048576).toFixed(1)} MB; the limit is 4 MB. Downscale it first, e.g. sips -Z 2400 "${file}" --out /tmp/smaller${ext}.`))
      const r = await api("POST", "/images", new Uint8Array(await readFile(file)), type)
      return text(`path: ${r.path}\n${r.width}×${r.height}, ${r.transparent ? "transparent (fits cut)" : "opaque (a photo: img, or uiImg)"}`)
    } catch (e) { return fail(e instanceof Error && "code" in e && e.code === "ENOENT" ? new ApiError(`No such file: ${file}`) : e) }
  },
)

await server.connect(new StdioServerTransport())
