# Content policy as single source for editor, validator, and sanitizer

The editor schema, the save-time validator, and the render-time sanitizer all derive from the same content policy definitions — one for prompts (full rich text: paragraphs, headings, inline formatting, lists, blockquotes, code blocks, links, images, tables, mathematics) and one for answers (paragraphs, inline formatting, and images only). The toolbar exposes exactly the allowed set, and the mathematics node is validated including its LaTeX attribute, not merely by node name.

Content that violates the policy is rejected at save time with a validation error; it is never silently stripped, because silently altered content would differ from what the author intended. Sanitization also runs at render time (defense in depth) using the same policy definitions so the three layers cannot silently diverge.
