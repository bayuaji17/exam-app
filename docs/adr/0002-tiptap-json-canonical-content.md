# TipTap JSON is the canonical content; HTML is derived

Question prompts and answers are authored in TipTap and stored as editor JSON, which is the source of truth for content. Searchable plain text is derived from the JSON at save time, and HTML is generated at render time and sanitized server-side before it is inserted into the page.

Storing HTML directly (the common editor pattern) was rejected because editor JSON round-trips losslessly through the editor, survives schema evolution, and gives the save-time validator a structured document to check against the content policy. HTML therefore becomes a disposable render artifact rather than persisted data.
