# Lansy Studio

Плагин Claude Code: надиктуй идею и факты — агент соберёт карусель Lansy для LinkedIn в Lansy Studio и даст ссылку на доводку.

## Установка

```
/plugin marketplace add gpogrebnyack/plugins
/plugin install lansy-studio@gpogrebnyack
```

Затем впиши токен: `/plugin configure lansy-studio@gpogrebnyack`. Токен берётся в Lansy Studio → меню аккаунта → Agent access → Create и хранится в системной связке ключей.

Обновление: `/plugin marketplace update gpogrebnyack`, затем `/plugin update lansy-studio@gpogrebnyack`. Новый релиз — новый `version` в `.claude-plugin/plugin.json`.

## Внутри

- `skills/lansy-carousel/SKILL.md` — как собирать карусель: шаблоны под мысли, ритм фонов, тексты, картинки, проверка, правки.
- `server.mjs` — MCP-сервер, собранный в один файл (плагины ставятся без `npm install`). Исходник — `mcp/src/server.ts`, сборка: `cd mcp && npm install && npm run build`.
- Инструменты: `lansy_catalog`, `lansy_check`, `lansy_create`, `lansy_get`, `lansy_update`, `lansy_upload_image`. Они ходят в `/api/v1` студии: каталог и проверка вёрстки строятся из её движка.
- `mcp/scripts/smoke.mjs` — вызывает каждый инструмент: `LANSY_URL=http://localhost:3101 LANSY_TOKEN=lsk_… IMAGE=/path/cut.png node mcp/scripts/smoke.mjs`.
