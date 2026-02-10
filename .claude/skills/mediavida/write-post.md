---
name: write-post
description: Use when writing or formatting posts for Mediavida forum. Covers Markdown syntax, BBCode tags, spoilers, polls, media embeds, and all formatting options.
---

# Mediavida Post Writing Guide

You are helping write a post for **Mediavida**, a Spanish forum. Use this formatting reference.

## Text Formatting

| Format | Syntax |
| ------ | ------ |
| **Bold** | `**texto**` or `__texto__` |
| *Italic* | `*texto*` or `_texto_` |
| ~~Strikethrough~~ | `~~texto~~` |

## Headers

Headers must be on their own line:

```
# Encabezado 1
## Encabezado 2
### Encabezado 3
```

## Lists

### Unordered
```
* Item
* Item
* Item
```

Or use `-` or `+`. Nest with 4-space indent:
```
* Item
    * Nested item
```

### Ordered
```
1. First
2. Second
3. Third
```

## Links and Images

```
[texto del enlace](https://url.com)
![](https://url.com/image.jpg)
![alt text](https://url.com/image.jpg)
```

## Quotes

Simple:
```
> esto es una cita
```

With author:
```
[quote=Nombre]
Texto citado aquí.
[/quote]
```

## Media Embeds

For YouTube, Twitter, Spotify, etc:
```
[media]https://www.youtube.com/watch?v=VIDEO_ID[/media]
```

Supported: YouTube, Twitter, Twitch, Spotify, SoundCloud, Vimeo, TikTok, Instagram, Reddit, Steam, Bandcamp, and many more.

## Spoilers

Simple:
```
[spoiler]
Contenido oculto.
[/spoiler]
```

With title:
```
[spoiler=Título]
Contenido oculto.
[/spoiler]
```

### NSFW (hidden from non-registered users)
```
[spoiler=NSFW]
Contenido sensible.
[/spoiler]
```

## Code

Inline: `` `código` ``

Block:
````
```
código aquí
```
````

## Other Formatting

### Centered text
```
[center]
Texto centrado.
[/center]
```

### Horizontal rule
```
---
```

### Flags
```
[flag]es[/flag]  → 🇪🇸
[flag]us[/flag]  → 🇺🇸
```

### Task lists
```
- [ ] Pendiente
- [x] Completado
```

## Polls (Thread Creator Only)

Basic:
```
[poll]
- Opción 1
- Opción 2
- Opción 3
[/poll]
```

With options:
```
[poll=nombre public=false age=1y close=31/12/2026 results=vote]
- Opción 1
- Opción 2
[/poll]
```

Poll parameters:
- `public=false` - Hide voters
- `age=10d` / `age=5m` / `age=1y` - Minimum user age
- `close=31/12/2026 18:00` - Close date
- `results=vote` - Must vote to see results
- `results=close` - Hide results until closed

## Best Practices

1. Use headers to structure long posts
2. Use spoilers for long content or plot details
3. Embed media instead of linking when possible
4. Use quotes when replying to specific points
5. Keep polls simple with clear options
