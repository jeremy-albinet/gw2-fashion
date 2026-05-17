# GW2 Travel Template Chat Link Format (`0x10`)

**Status:** Reverse-engineered from 5 in-game sample codes against `api.guildwars2.com/v2`. Verified deterministically — header, body length, slot order, terminator are stable across all samples.

**Introduced:** Guild Wars 2 update of **May 12, 2026** ("Mounts, gliders, skiffs, and conjured doorways have all been moved to a new Travel submenu in the Fashion panel. All of these cosmetics can be dyed in the Travel submenu and have been removed from the Dyes submenu."). See [wiki:Game_updates#Update_-_May_12,_2026](https://wiki.guildwars2.com/wiki/Game_updates).

---

## Wire format

```
+--------+----------------------------------------+
| u8     | type byte = 0x10                       |
+--------+----------------------------------------+
| u16[5] | slot 0  — glider                       |
| u16[5] | slot 1  — conjured doorway             |
| u16[5] | slot 2  — jackal mount                 |
| u16[5] | slot 3  — griffon mount                |
| u16[5] | slot 4  — springer mount               |
| u16[5] | slot 5  — skimmer mount                |
| u16[5] | slot 6  — raptor mount                 |
| u16[5] | slot 7  — roller beetle mount          |
| u16[5] | slot 8  — warclaw mount                |
| u16[5] | slot 9  — skyscale mount               |
| u16[5] | slot 10 — skiff                        |
| u16[5] | slot 11 — siege turtle mount           |
+--------+----------------------------------------+
| u16    | terminator = 0x0FFF (4095)             |
+--------+----------------------------------------+
```

- **Total length:** 1 + 12·10 + 2 = **123 bytes** (raw, before base64).
- **Endianness:** all `u16` are little-endian.
- **Encoding:** body is base64-wrapped in `[&…]` like all other GW2 chat links.

### Each 5-`u16` slot

```
+------+-----------------------------------------------+
| u16  | skin_id (in that slot's namespace)            |
| u16  | dye 1 (color_id, or 1 = "no dye / unchanged") |
| u16  | dye 2                                         |
| u16  | dye 3                                         |
| u16  | dye 4                                         |
+------+-----------------------------------------------+
```

Dye channels beyond what the skin actually exposes are stored as `1`. A user
who has never customized a slot leaves both `skin_id` and the dyes at their
default values; that is why `springer = 152`, `roller_beetle = 293`,
`siege_turtle = 397`, and `doorway = 2` appear unchanged across all 5
samples — these were the user-account defaults at the time the template was
saved, not magic constants of the format itself.

### Skin namespaces

| Slot | Endpoint | Notes |
|---|---|---|
| 0 (glider) | `GET /v2/gliders/:id` | "Deltaplane" / hang-glider — same slot, just a glider skin. |
| 1 (doorway) | *(no public endpoint)* | Conjured Doorway skin id. All 5 samples show `2`; not yet exposed in `/v2`. |
| 2–9, 11 (mounts) | `GET /v2/mounts/skins/:id` | Skin's `mount` field disambiguates which mount type it belongs to and therefore which slot it can appear in. |
| 10 (skiff) | `GET /v2/skiffs` returns the id list. Per-id endpoint not currently exposed. |  |

Dye ids resolve via `GET /v2/colors/:id`. The sentinel value `1` is "no dye"
(equivalent to leaving the channel default).

> The glider and mount namespaces overlap by accident — e.g. id `126` is the
> "Sorcerer's Cape Glider" *and* the "Dreadnought" raptor skin. The slot
> position is the discriminator, not the id.

---

## Worked example

Chat code:

```
[&EH4AHQAdAPMETQECAAEAAQABAAEAYQA/BrsBpwY5BYEASwBDANwBVQaYAHsBZACFALwChwHcAS4GPQY7BhgDPwaUBlgCmwYlARkAaQYuBl0G5gI/BkoFSgVtBhEDPwZjAmAF9wSaAXgBAQABAAEAjQEYAAEAAQABAP8P]
```

Base64-decode → 123 bytes, `header = 0x10`, then 12 slots:

| Slot | Skin id | Skin name | Dyes |
|---|---|---|---|
| Glider          | 126 | Sorcerer's Cape Glider              | Sapphire, Sapphire, Perseverance, Sand |
| Conjured Doorway | 2  | *(default)*                         | — |
| Jackal          | 97  | Shrine Guardian                     | Tar, White, World Ender, Imperial Gold |
| Griffon         | 129 | Nightfang                           | Steel, Gold, Graphite, Nightmare |
| Springer        | 152 | Sun Temple Gecko                    | Butter, Silver Lead, Sprout, Stream |
| Skimmer         | 391 | Synergetics Hoverbike               | Graphite, Grave, Vabbian Bronze, Sand Shark |
| Raptor          | 792 | Aurene's Prismatic Feathered Raptor | Tar, Abyssal Depths, Daffodil, Benevolence |
| Roller Beetle   | 293 | Synergetics Gyrocycle               | Walnut, Godless, Grave, Arcane |
| Warclaw         | 742 | Scalefang Warclaw                   | Tar, Shadow Abyss, Shadow Abyss, Exodus |
| Skyscale        | 785 | Majestic Lancer Noble Skyscale      | Tar, Fog, Zaffre, Enameled Legacy |
| Skiff           | 410 | Fishing Skiff                       | Salmon |
| Siege Turtle    | 397 | Siege Turtle                        | Terracotta |

Followed by terminator `u16 = 0x0FFF`.

---

## Reference decoder (Python)

```python
import base64, struct

SLOT_NAMES = [
    "glider", "doorway",
    "jackal", "griffon", "springer", "skimmer",
    "raptor", "roller_beetle", "warclaw", "skyscale",
    "skiff", "siege_turtle",
]

def decode_travel_template(chat_code: str) -> dict:
    s = chat_code.strip()
    if s.startswith("[&") and s.endswith("]"):
        s = s[2:-1]
    raw = base64.b64decode(s)
    if raw[0] != 0x10:
        raise ValueError(f"not a Travel Template (header=0x{raw[0]:02x})")
    if len(raw) != 123:
        raise ValueError(f"unexpected length {len(raw)} (expected 123)")
    vals = struct.unpack("<61H", raw[1:])
    if vals[60] != 0x0FFF:
        raise ValueError(f"bad terminator 0x{vals[60]:04x}")
    out = {}
    for i, name in enumerate(SLOT_NAMES):
        base = i * 5
        out[name] = {
            "skin_id": vals[base],
            "dyes":    list(vals[base + 1 : base + 5]),
        }
    return out
```

## Reference encoder (Python)

```python
def encode_travel_template(slots: dict) -> str:
    body = [0x10]
    buf  = bytearray([0x10])
    vals = []
    for name in SLOT_NAMES:
        slot = slots[name]
        vals.append(slot["skin_id"])
        dyes = list(slot["dyes"]) + [1, 1, 1, 1]
        vals.extend(dyes[:4])
    vals.append(0x0FFF)
    buf.extend(struct.pack(f"<{len(vals)}H", *vals))
    return "[&" + base64.b64encode(bytes(buf)).decode("ascii") + "]"
```

Round-trip on all 5 samples reproduces the input byte-for-byte.

---

## Open questions

1. **Conjured Doorway API.** No `/v2/doorways` (or similar) endpoint is
   currently published. All five samples show `skin_id = 2` and no dyes,
   so this is consistent with "user has never customized the doorway".
   Need a sample from someone who has bought / equipped a non-default
   doorway skin to confirm the namespace and exercise the dye channels.

2. **Per-skiff endpoint.** `GET /v2/skiffs` returns the id list but
   `GET /v2/skiffs/{id}` 404s. Names in the worked example above are taken
   from the wiki (skin `410` = "Fishing Skiff", `413` = "Shing Jea Dragon
   Boat"). Worth raising with the API team.

3. **Future-proofing for new mount types.** If ArenaNet adds a 10th mount,
   the most likely change is "insert a new fixed slot before the terminator
   and bump the body length". The terminator `0x0FFF` and per-slot stride
   of 5 are the invariants a parser should rely on, not the absolute byte
   length of `123`.

---

## Samples used for reverse engineering

```
[&EH4AHQAdAPMETQECAAEAAQABAAEAYQA/BrsBpwY5BYEASwBDANwBVQaYAHsBZACFALwChwHcAS4GPQY7BhgDPwaUBlgCmwYlARkAaQYuBl0G5gI/BkoFSgVtBhEDPwZjAmAF9wSaAXgBAQABAAEAjQEYAAEAAQABAP8P]
[&EAsAiAYZBQEAAQACAAEAAQABAAEA0wFKBSsAkQBMAPYAWAaAAoACiAaYAA0GuwF0ABoFhwEGABEGOgWIBioBiAYPBk0CXQYlAYgGBgA6BYgG+wARBoEBXAYCBkQCLgZhBdUEbQadAdUESgUaBQYAjQECBgEAAQABAP8P]
[&EH8ASAI1AJECwgECAAEAAQABAAEAYQANBgYApwJrAoEASgWSBkUFkgaYAEoFRgVVBUUFiwJ0BsoCmAJoBRgDHAVLAoICWAIlARkAaQYuBl0G5gLNBT8GAgB3AC4CIAW6AlcBEQaaAYEEAQABAAEAjQEVAAEAAQABAP8P]
[&EJAAtgGSBk8AVgECAAEAAQABAAEA0wEBBVoCkgYCAIEA0QUBBUoFAQWYAEoFSgUBBbMBhwFKBQEFSgWSBkkBSgUCAAIAWgIlAUoF0QVKBQEF5gJKBdEF0QVwBkQCSgVWAVUF1QSdAXEBAQUBBdEFjQHWAQEAAQABAP8P]
[&EAsAEQbXBQEAAQACAAEAAQABAAEAYQA/BmUGmwbVBPYAEQYYBRgFewaYAA0GAgZ7BhgFIANKBW0GSgU5BSMCSgVHAtUEbQYlAVUFSgVtBkcC5gIwBkoF0QVNAL8ASgX/BJsGVQWaAXgBAQABAAEAjQGvBQEAAQABAP8P]
```
