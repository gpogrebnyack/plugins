# plugins

Плагины для [Claude Code](https://code.claude.com/docs/en/plugins) от [@gpogrebnyack](https://github.com/gpogrebnyack). Репозиторий — маркетплейс: каждый плагин — самодостаточный каталог в `plugins/`, список — в `.claude-plugin/marketplace.json`.

## Установка

Один раз добавь маркетплейс:

```
/plugin marketplace add gpogrebnyack/plugins
```

Затем ставь нужный плагин: `/plugin install <plugin-name>@gpogrebnyack`.

## Плагины

### `lansy-linkedin-studio`

Посты Lansy для LinkedIn: карусели и одиночные картинки. Надиктуй идею и факты кейса — агент нарежет историю на страницы, подберёт шаблоны, картинки и ритм фонов, проверит вёрстку шрифтами бренда и сохранит пост в Lansy Studio. В ответ — ссылка: дальше доводишь в студии. Внутри — навык `lansy-linkedin-studio` и адрес MCP-сервера студии с шестью инструментами.

Нужно до установки: аккаунт в Lansy Studio. При первом запросе откроется браузер: войти и нажать Allow.

```
/plugin install lansy-linkedin-studio@gpogrebnyack
```

Подробности — в [`plugins/lansy-linkedin-studio/README.md`](plugins/lansy-linkedin-studio/README.md) и [`skills/lansy-linkedin-studio/SKILL.md`](plugins/lansy-linkedin-studio/skills/lansy-linkedin-studio/SKILL.md).
