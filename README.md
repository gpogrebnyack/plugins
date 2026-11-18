# plugins

Плагины для [Claude Code](https://code.claude.com/docs/en/plugins) от [@gpogrebnyack](https://github.com/gpogrebnyack). Репозиторий — маркетплейс: каждый плагин — самодостаточный каталог в `plugins/`, список — в `.claude-plugin/marketplace.json`.

## Установка

Один раз добавь маркетплейс:

```
/plugin marketplace add gpogrebnyack/plugins
```

Затем ставь нужный плагин: `/plugin install <plugin-name>@gpogrebnyack`.

## Плагины

### `lansy-studio`

Карусели Lansy для LinkedIn. Надиктуй идею и факты кейса — агент нарежет историю на страницы, подберёт шаблоны, картинки и ритм фонов, проверит вёрстку шрифтами бренда и сохранит карусель в Lansy Studio. В ответ — ссылка: дальше доводишь в студии. Внутри — навык `lansy-carousel` и MCP-сервер с шестью инструментами поверх API студии.

Нужно до установки: аккаунт в Lansy Studio и токен из меню аккаунта → Agent access. Node.js 20+.

```
/plugin install lansy-studio@gpogrebnyack
/plugin configure lansy-studio@gpogrebnyack
```

Подробности — в [`plugins/lansy-studio/README.md`](plugins/lansy-studio/README.md) и [`skills/lansy-carousel/SKILL.md`](plugins/lansy-studio/skills/lansy-carousel/SKILL.md).
