# Lansy LinkedIn Studio

Плагин Claude Code: надиктуй идею и факты — агент соберёт пост Lansy для LinkedIn в Lansy Studio, карусель или одну картинку, и даст ссылку на доводку.

## Установка

```
/plugin marketplace add gpogrebnyack/plugins
/plugin install lansy-linkedin-studio@gpogrebnyack
```

Первый запрос откроет браузер: войди в Lansy Studio и нажми Allow. Всё. Если браузер не открылся — `/mcp` → lansy → Authenticate. Отключить агента — в студии: меню аккаунта → Agent access.

Обновление: `/plugin marketplace update gpogrebnyack`, затем `/plugin update lansy-linkedin-studio@gpogrebnyack`. Новый релиз — новый `version` в `.claude-plugin/plugin.json`.

## Внутри

- `skills/lansy-linkedin-studio/SKILL.md` — как собирать пост: шаблоны под мысли, ритм фонов, тексты, картинки, проверка, правки.
- MCP-сервер живёт в самой студии: `https://lansy-studio.vercel.app/mcp`, вход через OAuth (Supabase Auth). Плагину не нужны ни Node, ни токен; инструменты обновляются вместе со студией.
- Инструменты: `lansy_catalog`, `lansy_check`, `lansy_create`, `lansy_get`, `lansy_update`, `lansy_upload_link`. Каталог и проверка вёрстки строятся из движка студии.
- Тот же сервер подключается к Codex (`codex mcp add lansy --url https://lansy-studio.vercel.app/mcp`, затем `codex mcp login lansy`) и к claude.ai как свой коннектор.
