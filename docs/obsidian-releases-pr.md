# obsidian-releases PR draft

## Summary

Add `download-image` to the Obsidian community plugin catalog.

## Plugin info

- **ID:** `download-image`
- **Name:** `Download Image`
- **Author:** `yinsh`
- **Repository:** `https://github.com/yinshaohua/obsidian-download-image`

## What it does

Download Image is an Obsidian plugin that downloads remote images referenced in the current note into the local vault and rewrites the note to use local attachment paths. It also provides a vault-wide cleanup command for unused attachments.

## Release

A GitHub release for `1.0.0` should exist with these assets attached individually:

- `main.js`
- `manifest.json`
- `styles.css`

## Checklist

- [x] Plugin ID does not contain `obsidian`
- [x] Release tag matches the manifest version exactly
- [x] Required release assets are defined for the release workflow
- [x] Repository metadata and README describe the real plugin

## community-plugins.json entry

```json
{
  "id": "download-image",
  "name": "Download Image",
  "author": "yinsh",
  "description": "Download remote images in the current note to local vault storage.",
  "repo": "yinshaohua/obsidian-download-image"
}
```
